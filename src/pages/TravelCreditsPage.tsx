import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { apiFetch } from "@/lib/api";
import { formatMwk } from "@/lib/utils";
import { PageShell } from "@/pages/StatisticsPage";

type BalanceRow = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  balanceMwk: number;
  updatedAt: string | null;
};

type TransactionRow = {
  id: string;
  userId: string;
  entryType: "credit" | "debit" | "adjustment";
  amountMwk: number;
  balanceAfter: number;
  description: string;
  reference: string | null;
  createdAt: string;
  userEmail?: string;
  userName?: string;
};

type TravelCreditsPayload = {
  totals: { accountsWithBalance: number; totalOutstandingMwk: number };
  balances: BalanceRow[];
  transactions: TransactionRow[];
};

type UserOption = { id: string; email: string; firstName: string; lastName: string; creditBalance: number };

export function TravelCreditsPage() {
  const [data, setData] = useState<TravelCreditsPayload | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ userId: "", amountMwk: "", description: "", reference: "" });
  const [bulkForm, setBulkForm] = useState({ amountMwk: "", description: "", reference: "" });
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const load = useCallback(async () => {
    const [credits, userList] = await Promise.all([
      apiFetch<TravelCreditsPayload>("/admin/travel-credits"),
      apiFetch<{ users: UserOption[] }>("/admin/users"),
    ]);
    setData(credits);
    setUsers(userList.users.filter((u) => u.id));
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const addBulkCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(`Issue ${formatMwk(Number(bulkForm.amountMwk))} to every active customer?`)) return;
    setBulkSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const result = await apiFetch<{ message: string; usersCredited: number; totalIssuedMwk: number }>(
        "/admin/travel-credits/bulk",
        {
          method: "POST",
          body: JSON.stringify({
            amountMwk: Number(bulkForm.amountMwk),
            description: bulkForm.description,
            reference: bulkForm.reference || undefined,
          }),
        },
      );
      setMessage(`${result.message}. Total issued: ${formatMwk(result.totalIssuedMwk)}`);
      setBulkForm({ amountMwk: "", description: "", reference: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not issue bulk travel credit");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const addCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const result = await apiFetch<{ message: string; balanceMwk: number }>("/admin/travel-credits", {
        method: "POST",
        body: JSON.stringify({
          userId: form.userId,
          amountMwk: Number(form.amountMwk),
          description: form.description,
          reference: form.reference || undefined,
        }),
      });
      setMessage(`${result.message}. New balance: ${formatMwk(result.balanceMwk)}`);
      setForm({ userId: "", amountMwk: "", description: "", reference: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add travel credit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageShell title="Travel credits" subtitle="Loading…">
        <LoadingScreen label="Loading travel credits" />
      </PageShell>
    );
  }

  const totals = data?.totals;

  return (
    <PageShell
      title="Travel credits"
      subtitle="Track customer credit balances, issue new credits, and review redemption history."
    >
      {totals && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-signal/30 bg-signal-soft/20 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-signal">Total outstanding</p>
            <p className="mt-2 text-3xl font-semibold">{formatMwk(totals.totalOutstandingMwk)}</p>
          </div>
          <div className="rounded-2xl border border-hairline bg-surface-elevated p-5">
            <p className="text-xs uppercase text-muted-foreground">Accounts with balance</p>
            <p className="mt-2 text-3xl font-semibold">{totals.accountsWithBalance}</p>
          </div>
        </div>
      )}

      {(message || error) && (
        <p
          className={`mt-6 rounded-xl px-4 py-3 text-sm ${
            error ? "border border-destructive/30 bg-destructive/5 text-destructive" : "border border-signal/30 bg-signal-soft text-ink"
          }`}
        >
          {error ?? message}
        </p>
      )}

      <form onSubmit={addCredit} className="mt-8 space-y-4 rounded-2xl border border-hairline bg-surface-elevated p-6">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-signal" />
          <h2 className="text-sm font-semibold">Add travel credit</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="text-muted-foreground">Customer</span>
            <select
              required
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
              className="mt-1 w-full rounded-lg border border-hairline px-3 py-2"
            >
              <option value="">Select a customer…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} · {u.email}
                  {u.creditBalance > 0 ? ` · ${formatMwk(u.creditBalance)}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Amount (MWK)</span>
            <input
              required
              type="number"
              min="1"
              value={form.amountMwk}
              onChange={(e) => setForm({ ...form, amountMwk: e.target.value })}
              placeholder="50000"
              className="mt-1 w-full rounded-lg border border-hairline px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Reference (optional)</span>
            <input
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              placeholder="Promo code, refund ref…"
              className="mt-1 w-full rounded-lg border border-hairline px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-muted-foreground">Description</span>
            <input
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Goodwill credit for delayed flight"
              className="mt-1 w-full rounded-lg border border-hairline px-3 py-2"
            />
          </label>
        </div>
        <button type="submit" disabled={submitting} className="btn-signal rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
          {submitting ? "Adding…" : "Add credit"}
        </button>
      </form>

      <form onSubmit={addBulkCredit} className="mt-6 space-y-4 rounded-2xl border border-hairline bg-surface-elevated p-6">
        <h2 className="text-sm font-semibold">Issue credit to all customers</h2>
        <p className="text-xs text-muted-foreground">Adds the same travel credit amount to every active customer account.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-muted-foreground">Amount (MWK)</span>
            <input
              required
              type="number"
              min="1"
              value={bulkForm.amountMwk}
              onChange={(e) => setBulkForm({ ...bulkForm, amountMwk: e.target.value })}
              className="mt-1 w-full rounded-lg border border-hairline px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Reference (optional)</span>
            <input
              value={bulkForm.reference}
              onChange={(e) => setBulkForm({ ...bulkForm, reference: e.target.value })}
              className="mt-1 w-full rounded-lg border border-hairline px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-muted-foreground">Description</span>
            <input
              required
              value={bulkForm.description}
              onChange={(e) => setBulkForm({ ...bulkForm, description: e.target.value })}
              placeholder="Platform-wide goodwill credit"
              className="mt-1 w-full rounded-lg border border-hairline px-3 py-2"
            />
          </label>
        </div>
        <button type="submit" disabled={bulkSubmitting} className="rounded-lg border border-hairline px-4 py-2 text-sm font-medium hover:bg-surface disabled:opacity-50">
          {bulkSubmitting ? "Issuing…" : "Issue to all users"}
        </button>
      </form>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold">Customer balances</h2>
        <div className="overflow-hidden rounded-2xl border border-hairline bg-surface-elevated">
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-surface text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-left">Updated</th>
              </tr>
            </thead>
            <tbody>
              {!data?.balances.filter((b) => b.balanceMwk > 0).length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No customers with a travel credit balance yet.
                  </td>
                </tr>
              ) : (
                data.balances
                  .filter((b) => b.balanceMwk > 0)
                  .map((row) => (
                    <tr key={row.userId} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {row.firstName} {row.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{row.email}</p>
                      </td>
                      <td className="px-4 py-3 capitalize">{row.status}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatMwk(row.balanceMwk)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.updatedAt ? format(new Date(row.updatedAt), "dd MMM yyyy HH:mm") : "-"}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold">Recent activity</h2>
        <div className="overflow-hidden rounded-2xl border border-hairline bg-surface-elevated">
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-surface text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Balance after</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {!data?.transactions.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No travel credit transactions yet.
                  </td>
                </tr>
              ) : (
                data.transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{tx.userName ?? "-"}</p>
                      <p className="text-xs text-muted-foreground">{tx.userEmail}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">{tx.entryType}</td>
                    <td className="px-4 py-3">{tx.description}</td>
                    <td className={`px-4 py-3 text-right font-medium ${tx.entryType === "debit" ? "text-destructive" : "text-signal"}`}>
                      {tx.entryType === "debit" ? "−" : "+"}
                      {formatMwk(tx.amountMwk)}
                    </td>
                    <td className="px-4 py-3 text-right">{formatMwk(tx.balanceAfter)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(tx.createdAt), "dd MMM yyyy HH:mm")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  );
}
