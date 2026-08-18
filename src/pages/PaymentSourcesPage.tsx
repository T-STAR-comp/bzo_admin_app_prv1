import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { LoadingOverlay, LoadingScreen } from "@/components/LoadingScreen";
import { useModal } from "@/context/modal-context";
import { apiFetch } from "@/lib/api";
import { PageShell } from "@/pages/StatisticsPage";

type PaymentSource = {
  id: string;
  label: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchCode: string | null;
  swiftCode: string | null;
  currency: string;
  instructions: string | null;
  sortOrder: number;
  isActive: boolean;
};

const emptyForm = {
  label: "",
  bankName: "",
  accountName: "",
  accountNumber: "",
  branchCode: "",
  swiftCode: "",
  currency: "MWK",
  instructions: "",
  sortOrder: 0,
  isActive: true,
};

export function PaymentSourcesPage() {
  const [sources, setSources] = useState<PaymentSource[]>([]);
  const [loading, setLoading] = useState(true);
  const { pushModal } = useModal();

  const load = useCallback(async () => {
    const data = await apiFetch<{ sources: PaymentSource[] }>("/admin/payment-sources");
    setSources(data.sources);
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const openEditor = (source?: PaymentSource) => {
    pushModal({
      title: source ? "Edit payment source" : "Add payment source",
      subtitle: "Shown to customers when manual bank transfer is enabled",
      width: "lg",
      content: (
        <PaymentSourceForm
          initial={source}
          onSaved={async () => {
            await load();
          }}
        />
      ),
    });
  };

  return (
    <PageShell
      title="Payment sources"
      subtitle="Bank accounts customers see when USE_PAYMENT_GATEWAY is disabled."
    >
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => openEditor()}
          className="btn-signal inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Add account
        </button>
      </div>

      {loading && sources.length === 0 ? (
        <LoadingScreen label="Loading payment sources" />
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-hairline bg-surface-elevated">
          {loading && sources.length > 0 && <LoadingOverlay label="Refreshing" />}
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-surface text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Label</th>
                <th className="px-4 py-3 text-left">Bank</th>
                <th className="px-4 py-3 text-left">Account</th>
                <th className="px-4 py-3 text-left">Currency</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {!sources.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No payment sources yet. Add at least one bank account for manual payments.
                  </td>
                </tr>
              ) : (
                sources.map((s) => (
                  <tr key={s.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-3 font-medium">{s.label}</td>
                    <td className="px-4 py-3">{s.bankName}</td>
                    <td className="px-4 py-3">
                      <p>{s.accountName}</p>
                      <p className="font-mono text-xs text-muted-foreground">{s.accountNumber}</p>
                    </td>
                    <td className="px-4 py-3">{s.currency}</td>
                    <td className="px-4 py-3 capitalize">{s.isActive ? "Active" : "Hidden"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openEditor(s)} className="rounded-lg border border-hairline p-2">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm(`Remove "${s.label}"?`)) return;
                            await apiFetch(`/admin/payment-sources/${s.id}`, { method: "DELETE" });
                            await load();
                          }}
                          className="rounded-lg border border-hairline p-2 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}

function PaymentSourceForm({
  initial,
  onSaved,
}: {
  initial?: PaymentSource;
  onSaved: () => Promise<void>;
}) {
  const { popModal } = useModal();
  const [form, setForm] = useState({
    ...emptyForm,
    ...(initial
      ? {
          label: initial.label,
          bankName: initial.bankName,
          accountName: initial.accountName,
          accountNumber: initial.accountNumber,
          branchCode: initial.branchCode ?? "",
          swiftCode: initial.swiftCode ?? "",
          currency: initial.currency,
          instructions: initial.instructions ?? "",
          sortOrder: initial.sortOrder,
          isActive: initial.isActive,
        }
      : {}),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        label: form.label,
        bankName: form.bankName,
        accountName: form.accountName,
        accountNumber: form.accountNumber,
        branchCode: form.branchCode || null,
        swiftCode: form.swiftCode || null,
        currency: form.currency,
        instructions: form.instructions || null,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
      };
      if (initial) {
        await apiFetch(`/admin/payment-sources/${initial.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/admin/payment-sources", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      await onSaved();
      popModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Label" value={form.label} onChange={(v) => setForm({ ...form, label: v })} required />
        <Field label="Bank name" value={form.bankName} onChange={(v) => setForm({ ...form, bankName: v })} required />
        <Field label="Account name" value={form.accountName} onChange={(v) => setForm({ ...form, accountName: v })} required />
        <Field label="Account number" value={form.accountNumber} onChange={(v) => setForm({ ...form, accountNumber: v })} required />
        <Field label="Branch code" value={form.branchCode} onChange={(v) => setForm({ ...form, branchCode: v })} />
        <Field label="SWIFT" value={form.swiftCode} onChange={(v) => setForm({ ...form, swiftCode: v })} />
        <Field label="Currency" value={form.currency} onChange={(v) => setForm({ ...form, currency: v.toUpperCase() })} required />
        <Field label="Sort order" value={String(form.sortOrder)} onChange={(v) => setForm({ ...form, sortOrder: Number(v) || 0 })} />
      </div>
      <label className="block">
        <span className="text-xs text-muted-foreground">Instructions (optional)</span>
        <textarea
          value={form.instructions}
          onChange={(e) => setForm({ ...form, instructions: e.target.value })}
          rows={3}
          className="mt-1 w-full rounded-lg border border-hairline px-3 py-2"
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
        />
        <span>Active (visible to customers)</span>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={saving} className="btn-signal rounded-lg px-4 py-2 font-medium">
        {saving ? "Saving…" : initial ? "Save changes" : "Add account"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full rounded-lg border border-hairline px-3 py-2"
      />
    </label>
  );
}
