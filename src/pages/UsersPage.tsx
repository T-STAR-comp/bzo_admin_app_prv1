import { format } from "date-fns";
import { AlertTriangle, ChevronRight, Shield } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useModal } from "@/context/modal-context";
import { apiFetch } from "@/lib/api";
import { cn, formatMwk } from "@/lib/utils";
import { PageShell } from "@/pages/StatisticsPage";

type UserRow = {
  id: string;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  bookingCount: number;
  openIssues: number;
  creditBalance: number;
};

type UserDetail = {
  user: UserRow & { dateOfBirth?: string | null; nationality?: string | null; adminNotes?: string | null; role?: string };
  bookings: Array<{ id: string; pnr: string; status: string; originCode: string; destinationCode: string; priceMwk: number; departAt: string }>;
  tickets?: Array<{ id: string; pnr?: string; originCode: string; destinationCode: string; departAt: string; seat: string | null; status: string; passengerNames: string | null; displayStatus?: string }>;
  issues: Array<{ id: string; severity: string; title: string; description: string | null; resolvedAt: string | null }>;
  finance: Array<{ id: string; entryType: string; amountMwk: number; description: string; createdAt: string }>;
  creditBalance: number;
  audit: Array<{ action: string; level: string; createdAt: string }>;
};

export function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const { pushModal } = useModal();

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const data = await apiFetch<{ users: UserRow[] }>(`/admin/users?${params}`);
    setUsers(data.users);
    setLoading(false);
  }, [q]);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const openUser = async (userId: string) => {
    const detail = await apiFetch<UserDetail>(`/admin/users/${userId}`);
    pushModal({
      title: `${detail.user.firstName} ${detail.user.lastName}`,
      subtitle: detail.user.email,
      width: "xl",
      content: <UserDetailModal detail={detail} onUpdated={load} />,
    });
  };

  return (
    <PageShell
      title="Users"
      subtitle="Browse customer and admin accounts. Click a row for full profile, finances, issues, and controls."
    >
      <div className="flex gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email, name, username…"
          className="flex-1 rounded-xl border border-hairline bg-surface-elevated px-4 py-2.5 text-sm outline-none focus:border-signal"
        />
        <button type="button" onClick={load} className="rounded-xl border border-hairline px-4 py-2.5 text-sm font-medium hover:bg-surface">
          Search
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-hairline bg-surface-elevated">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline bg-surface text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Bookings</th>
              <th className="px-4 py-3 font-semibold">Credit</th>
              <th className="px-4 py-3 font-semibold">Issues</th>
              <th className="px-4 py-3 font-semibold">Last login</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading users…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No users found.</td></tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => openUser(u.id)}
                  className="cursor-pointer border-b border-hairline transition-colors last:border-0 hover:bg-surface"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge value={u.role} /></td>
                  <td className="px-4 py-3"><StatusBadge value={u.status} /></td>
                  <td className="px-4 py-3">{u.bookingCount}</td>
                  <td className="px-4 py-3">{formatMwk(u.creditBalance)}</td>
                  <td className="px-4 py-3">
                    {u.openIssues > 0 ? (
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5" />{u.openIssues}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.lastLoginAt ? format(new Date(u.lastLoginAt), "dd MMM yyyy") : "Never"}
                  </td>
                  <td className="px-4 py-3"><ChevronRight className="h-4 w-4 text-muted-foreground" /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}

function UserDetailModal({ detail, onUpdated }: { detail: UserDetail; onUpdated: () => void }) {
  const { pushModal } = useModal();
  const [status, setStatus] = useState(detail.user.status);
  const [role, setRole] = useState(detail.user.role);
  const [notes, setNotes] = useState(detail.user.adminNotes ?? "");
  const [saving, setSaving] = useState(false);

  const save = async (patch?: { status?: string; role?: string }) => {
    setSaving(true);
    await apiFetch(`/admin/users/${detail.user.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: patch?.status ?? status,
        role: patch?.role ?? role,
        adminNotes: notes,
      }),
    });
    setSaving(false);
    if (patch?.status) setStatus(patch.status);
    if (patch?.role) setRole(patch.role);
    onUpdated();
  };

  const suspend = () => save({ status: "suspended" });
  const reactivate = () => save({ status: "active" });

  const openFinanceDetail = (entry: UserDetail["finance"][0]) => {
    pushModal({
      title: "Finance entry",
      subtitle: entry.description,
      content: (
        <div className="space-y-3 text-sm">
          <Row label="Type" value={entry.entryType} />
          <Row label="Amount" value={formatMwk(entry.amountMwk)} />
          <Row label="Date" value={format(new Date(entry.createdAt), "PPpp")} />
        </div>
      ),
    });
  };

  const addIssue = async () => {
    pushModal({
      title: "Flag account issue",
      content: <AddIssueForm userId={detail.user.id} onDone={onUpdated} />,
    });
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Bookings" value={String(detail.bookings.length)} />
        <Stat label="Credit balance" value={formatMwk(detail.creditBalance)} />
        <Stat label="Open issues" value={String(detail.issues.filter((i) => !i.resolvedAt).length)} />
      </section>

      <section className="rounded-xl border border-hairline p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Shield className="h-4 w-4" /> Admin controls</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-muted-foreground">Account status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2">
              {["active", "suspended", "pending", "flagged"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2">
              {["user", "admin"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-muted-foreground">Admin notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2" />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => save()} disabled={saving} className="btn-signal rounded-lg px-4 py-2 text-sm font-medium">
            {saving ? "Saving…" : "Save changes"}
          </button>
          {status !== "suspended" ? (
            <button type="button" onClick={suspend} disabled={saving} className="rounded-lg border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/5">
              Suspend account
            </button>
          ) : (
            <button type="button" onClick={reactivate} disabled={saving} className="rounded-lg border border-hairline px-4 py-2 text-sm hover:bg-surface">
              Reactivate account
            </button>
          )}
          <button type="button" onClick={addIssue} className="rounded-lg border border-hairline px-4 py-2 text-sm hover:bg-surface">
            Add account issue
          </button>
          <a href={`mailto:${detail.user.email}`} className="rounded-lg border border-hairline px-4 py-2 text-sm hover:bg-surface">
            Email customer
          </a>
        </div>
      </section>

      {(detail.tickets?.length ?? 0) > 0 && (
        <Section title="Tickets">
          {detail.tickets!.map((t) => (
            <div key={t.id} className="flex justify-between border-b border-hairline py-2 text-sm last:border-0">
              <span>
                {t.originCode} → {t.destinationCode} · {t.passengerNames ?? "-"}
                {t.seat && ` · seat ${t.seat}`}
              </span>
              <span className="capitalize text-muted-foreground">{t.displayStatus ?? t.status}</span>
            </div>
          ))}
        </Section>
      )}

      <Section title="Account issues">
        {detail.issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">No issues recorded.</p>
        ) : (
          <ul className="space-y-2">
            {detail.issues.map((issue) => (
              <li key={issue.id} className="rounded-lg border border-hairline px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{issue.title}</span>
                  <StatusBadge value={issue.severity} />
                </div>
                {issue.description && <p className="mt-1 text-muted-foreground">{issue.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Recent bookings">
        {detail.bookings.slice(0, 5).map((b) => (
          <div key={b.id} className="flex justify-between border-b border-hairline py-2 text-sm last:border-0">
            <span>{b.originCode} → {b.destinationCode} · {b.pnr}</span>
            <span className="text-muted-foreground">{formatMwk(b.priceMwk)}</span>
          </div>
        ))}
      </Section>

      <Section title="Finance history">
        {detail.finance.slice(0, 5).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => openFinanceDetail(f)}
            className="flex w-full justify-between border-b border-hairline py-2 text-left text-sm hover:text-signal last:border-0"
          >
            <span>{f.description}</span>
            <span>{formatMwk(f.amountMwk)}</span>
          </button>
        ))}
      </Section>

      <Section title="Recent audit">
        {detail.audit.slice(0, 5).map((a, i) => (
          <div key={i} className="flex justify-between py-1.5 text-xs text-muted-foreground">
            <span>{a.action}</span>
            <span>{format(new Date(a.createdAt), "dd MMM HH:mm")}</span>
          </div>
        ))}
      </Section>
    </div>
  );
}

function AddIssueForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const { popModal } = useModal();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch(`/admin/users/${userId}/issues`, {
      method: "POST",
      body: JSON.stringify({ title, description, severity }),
    });
    popModal();
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Issue title" required className="w-full rounded-lg border border-hairline px-3 py-2 text-sm" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={3} className="w-full rounded-lg border border-hairline px-3 py-2 text-sm" />
      <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-full rounded-lg border border-hairline px-3 py-2 text-sm">
        {["low", "medium", "high", "critical"].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <button type="submit" className="btn-signal w-full rounded-lg py-2 text-sm font-medium">Record issue</button>
    </form>
  );
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className={cn(
      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
      value === "active" || value === "admin" ? "bg-emerald-100 text-emerald-800" :
      value === "flagged" || value === "critical" ? "bg-red-100 text-red-800" :
      value === "suspended" ? "bg-amber-100 text-amber-800" :
      "bg-surface text-muted-foreground",
    )}>
      {value}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-ink">{title}</h3>
      <div className="rounded-xl border border-hairline p-3">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
