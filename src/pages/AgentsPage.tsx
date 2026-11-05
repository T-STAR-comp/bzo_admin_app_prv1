import { format } from "date-fns";
import { Fragment, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatMwk } from "@/lib/utils";
import { PageShell } from "@/pages/StatisticsPage";

type Agent = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: "active" | "paused" | "suspended";
  percentage: number;
  agentCode: string;
  referralLink: string;
  notes?: string | null;
  totalCommissionMwk: number;
  redeemedMwk: number;
  payableBalanceMwk: number;
  userStatus: string;
  createdAt: string;
};

type AgentDetail = {
  sales: Array<{ id: string; saleDate: string; amountMwk: number; commissionAmountMwk: number; source: string; note: string | null }>;
  redemptions: Array<{ id: string; amountMwk: number; note: string | null; createdAt: string }>;
};

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  percentage: "10",
  notes: "",
};

export function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [saleAmount, setSaleAmount] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [saleNote, setSaleNote] = useState("");
  const [redemptionAmount, setRedemptionAmount] = useState("");
  const [redemptionNote, setRedemptionNote] = useState("");
  const [recording, setRecording] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const totalPayable = useMemo(
    () => agents.reduce((sum, agent) => sum + agent.payableBalanceMwk, 0),
    [agents],
  );

  const loadAgents = async () => {
    setLoading(true);
    const data = await apiFetch<{ agents: Agent[] }>("/admin/agents");
    setAgents(data.agents);
    setLoading(false);
  };

  useEffect(() => {
    loadAgents().catch(() => setLoading(false));
  }, []);

  const onCreate = async () => {
    setSubmitting(true);
    await apiFetch<{ message: string; agent: Agent }>("/admin/agents", {
      method: "POST",
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || null,
        percentage: Number(form.percentage),
        notes: form.notes || null,
      }),
    });
    setForm(emptyForm);
    setShowForm(false);
    setSubmitting(false);
    await loadAgents();
  };

  const onRegenerate = async (agentId: string) => {
    await apiFetch<{ message: string; code: string; link: string }>(`/admin/agents/${agentId}/regenerate-link`, {
      method: "POST",
    });
    await loadAgents();
  };

  const onUpdate = async (agentId: string, field: "status" | "percentage", value: string) => {
    const payload: Record<string, unknown> = {};
    if (field === "status") payload.status = value;
    if (field === "percentage") payload.percentage = Number(value);

    await apiFetch(`/admin/agents/${agentId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    await loadAgents();
  };

  const toggleDetails = async (agentId: string) => {
    if (expandedId === agentId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(agentId);
    setDetail(null);
    const data = await apiFetch<AgentDetail & { agent: Agent }>(`/admin/agents/${agentId}`);
    setDetail(data);
  };

  const refreshDetail = async (agentId: string) => {
    const data = await apiFetch<AgentDetail & { agent: Agent }>(`/admin/agents/${agentId}`);
    setDetail(data);
    await loadAgents();
  };

  const recordSale = async (agentId: string) => {
    setRecording(true);
    setFeedback(null);
    try {
      await apiFetch(`/admin/agents/${agentId}/sales`, {
        method: "POST",
        body: JSON.stringify({ saleDate, amountMwk: Number(saleAmount), note: saleNote || null }),
      });
      setSaleAmount("");
      setSaleNote("");
      setFeedback("Manual sale recorded.");
      await refreshDetail(agentId);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to record sale.");
    } finally {
      setRecording(false);
    }
  };

  const recordRedemption = async (agentId: string) => {
    setRecording(true);
    setFeedback(null);
    try {
      await apiFetch(`/admin/agents/${agentId}/redemptions`, {
        method: "POST",
        body: JSON.stringify({ amountMwk: Number(redemptionAmount), note: redemptionNote || null }),
      });
      setRedemptionAmount("");
      setRedemptionNote("");
      setFeedback("Redemption recorded.");
      await refreshDetail(agentId);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to record redemption.");
    } finally {
      setRecording(false);
    }
  };

  const updateDetails = async (agentId: string, details: { fullName: string; email: string; phone: string | null; notes: string | null }) => {
    setFeedback(null);
    try {
      await apiFetch(`/admin/agents/${agentId}`, {
        method: "PATCH",
        body: JSON.stringify(details),
      });
      setFeedback("Agent details updated.");
      await refreshDetail(agentId);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update agent details.");
    }
  };

  return (
    <PageShell
      title="Agents"
      subtitle="Manage commission agents, referral codes, and payout balances across the platform."
      action={
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded-xl bg-signal px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:opacity-90"
        >
          {showForm ? "Close" : "+ New agent"}
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard label="Agents" value={String(agents.length)} detail="active records" />
        <InfoCard label="Total commission" value={formatMwk(agents.reduce((sum, agent) => sum + agent.totalCommissionMwk, 0))} detail="gross pipeline" />
        <InfoCard label="Payable" value={formatMwk(totalPayable)} detail="minus redemptions" />
      </div>

      {showForm && (
        <div className="rounded-2xl border border-hairline bg-surface-elevated p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="First name">
              <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="input" />
            </Field>
            <Field label="Last name">
              <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="input" />
            </Field>
            <Field label="Email" className="md:col-span-2">
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
            </Field>
            <Field label="Commission %">
              <input type="number" min={0} max={100} value={form.percentage} onChange={(e) => setForm({ ...form, percentage: e.target.value })} className="input" />
            </Field>
            <Field label="Notes" className="md:col-span-2">
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="input resize-none" />
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={submitting || !form.firstName || !form.lastName || !form.email}
              onClick={onCreate}
              className="rounded-xl bg-signal px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create agent"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-hairline bg-surface-elevated">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline bg-surface text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Agent</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Commission</th>
              <th className="px-4 py-3 font-semibold">Payable</th>
              <th className="px-4 py-3 font-semibold">Referral</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading agents…</td></tr>
            ) : agents.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No agents found.</td></tr>
            ) : (
              agents.map((agent) => (
                <Fragment key={agent.id}>
                <tr className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{agent.fullName}</p>
                    <p className="text-xs text-muted-foreground">{agent.email}</p>
                    <p className="text-xs text-muted-foreground">{agent.agentCode}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={agent.status}
                      onChange={(e) => onUpdate(agent.id, "status", e.target.value)}
                      className="rounded-lg border border-hairline bg-surface px-2 py-1 text-xs"
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={agent.percentage}
                        onBlur={(e) => {
                          if (Number(e.target.value) !== agent.percentage) {
                            void onUpdate(agent.id, "percentage", e.target.value);
                          }
                        }}
                        className="w-20 rounded-lg border border-hairline bg-surface px-2 py-1 text-xs"
                      />
                      <span>%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{formatMwk(agent.payableBalanceMwk)}</p>
                    <p className="text-xs text-muted-foreground">{formatMwk(agent.totalCommissionMwk)} gross</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="truncate text-xs text-muted-foreground">{agent.referralLink}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {format(new Date(agent.createdAt), "dd MMM yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => onRegenerate(agent.id)} className="rounded-lg border border-hairline px-2 py-1 text-xs hover:bg-surface">Refresh link</button>
                      <button type="button" onClick={() => void toggleDetails(agent.id)} className="rounded-lg border border-hairline px-2 py-1 text-xs hover:bg-surface">{expandedId === agent.id ? "Close" : "Manage"}</button>
                    </div>
                  </td>
                </tr>
                {expandedId === agent.id && (
                  <tr className="border-b border-hairline bg-surface/60">
                    <td colSpan={7} className="p-4 sm:p-5">
                      {!detail ? <p className="py-4 text-sm text-muted-foreground">Loading agent records…</p> : (
                        <div className="space-y-5">
                          {feedback && <p role="status" className="rounded-lg bg-signal-soft px-3 py-2 text-sm">{feedback}</p>}
                          <EditableAgentDetails agent={agent} onSave={(details) => void updateDetails(agent.id, details)} />
                          <div className="grid gap-4 lg:grid-cols-2">
                            <form onSubmit={(event) => { event.preventDefault(); void recordSale(agent.id); }} className="space-y-3 rounded-xl border border-hairline bg-background p-4">
                              <h3 className="text-sm font-semibold">Record a manual sale</h3>
                              <label className="block text-xs text-muted-foreground">Sale date<input required type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} className="mt-1 w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink" /></label>
                              <label className="block text-xs text-muted-foreground">Sale amount (MWK)<input required min="0.01" step="0.01" type="number" value={saleAmount} onChange={(event) => setSaleAmount(event.target.value)} className="mt-1 w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink" /></label>
                              <label className="block text-xs text-muted-foreground">Note<input value={saleNote} onChange={(event) => setSaleNote(event.target.value)} maxLength={500} className="mt-1 w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink" /></label>
                              <button disabled={recording || !saleAmount} className="rounded-lg bg-signal px-3 py-2 text-sm font-medium text-white disabled:opacity-60">{recording ? "Saving…" : "Record sale"}</button>
                            </form>
                            <form onSubmit={(event) => { event.preventDefault(); void recordRedemption(agent.id); }} className="space-y-3 rounded-xl border border-hairline bg-background p-4">
                              <h3 className="text-sm font-semibold">Record a redemption</h3>
                              <p className="text-xs text-muted-foreground">Available: {formatMwk(agent.payableBalanceMwk)}</p>
                              <label className="block text-xs text-muted-foreground">Amount (MWK)<input required min="0.01" max={agent.payableBalanceMwk} step="0.01" type="number" value={redemptionAmount} onChange={(event) => setRedemptionAmount(event.target.value)} className="mt-1 w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink" /></label>
                              <label className="block text-xs text-muted-foreground">Note<input value={redemptionNote} onChange={(event) => setRedemptionNote(event.target.value)} maxLength={500} className="mt-1 w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink" /></label>
                              <button disabled={recording || !redemptionAmount} className="rounded-lg border border-hairline px-3 py-2 text-sm font-medium hover:bg-surface disabled:opacity-60">{recording ? "Saving…" : "Record redemption"}</button>
                            </form>
                          </div>
                          <div className="grid gap-5 lg:grid-cols-2">
                            <div>
                              <h3 className="mb-2 text-sm font-semibold">Sales and commissions</h3>
                              <div className="divide-y divide-hairline rounded-xl border border-hairline bg-background">
                                {detail.sales.length === 0 ? <p className="p-3 text-xs text-muted-foreground">No sales recorded.</p> : detail.sales.slice(0, 8).map((sale) => <div key={sale.id} className="flex justify-between gap-3 p-3 text-xs"><div><p className="font-medium">{formatMwk(sale.amountMwk)} · {sale.source}</p><p className="text-muted-foreground">{format(new Date(sale.saleDate), "dd MMM yyyy")} {sale.note ? `· ${sale.note}` : ""}</p></div><span className="font-semibold">{formatMwk(sale.commissionAmountMwk)}</span></div>)}
                              </div>
                            </div>
                            <div>
                              <h3 className="mb-2 text-sm font-semibold">Redemptions</h3>
                              <div className="divide-y divide-hairline rounded-xl border border-hairline bg-background">
                                {detail.redemptions.length === 0 ? <p className="p-3 text-xs text-muted-foreground">No redemptions recorded.</p> : detail.redemptions.slice(0, 8).map((redemption) => <div key={redemption.id} className="flex justify-between gap-3 p-3 text-xs"><div><p className="font-medium">{formatMwk(redemption.amountMwk)}</p><p className="text-muted-foreground">{format(new Date(redemption.createdAt), "dd MMM yyyy")} {redemption.note ? `· ${redemption.note}` : ""}</p></div></div>)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}

function InfoCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface-elevated p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function EditableAgentDetails({
  agent,
  onSave,
}: {
  agent: Agent;
  onSave: (details: { fullName: string; email: string; phone: string | null; notes: string | null }) => void;
}) {
  const [fullName, setFullName] = useState(agent.fullName);
  const [email, setEmail] = useState(agent.email);
  const [phone, setPhone] = useState(agent.phone ?? "");
  const [notes, setNotes] = useState(agent.notes ?? "");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim() || null, notes: notes.trim() || null });
      }}
      className="grid gap-3 rounded-xl border border-hairline bg-background p-4 sm:grid-cols-2"
    >
      <h3 className="text-sm font-semibold sm:col-span-2">Agent details</h3>
      <Field label="Full name"><input required maxLength={150} value={fullName} onChange={(event) => setFullName(event.target.value)} className="input" /></Field>
      <Field label="Email"><input required type="email" maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} className="input" /></Field>
      <Field label="Phone"><input maxLength={32} value={phone} onChange={(event) => setPhone(event.target.value)} className="input" /></Field>
      <Field label="Notes"><input maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} className="input" /></Field>
      <div className="sm:col-span-2"><button className="rounded-lg border border-hairline px-3 py-2 text-sm font-medium hover:bg-surface">Save agent details</button></div>
    </form>
  );
}
