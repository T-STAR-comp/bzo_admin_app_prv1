import { format } from "date-fns";
import { ChevronRight, Mail, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { LoadingOverlay } from "@/components/LoadingScreen";
import { useModal } from "@/context/modal-context";
import { apiFetch } from "@/lib/api";
import { getApiBase } from "@/lib/runtime-config";
import { formatMwk } from "@/lib/utils";
import { PageShell } from "@/pages/StatisticsPage";

type PaymentRow = {
  id: string;
  chargeId: string;
  paymentMethod: string;
  amountMwk: number;
  status: string;
  userEmail?: string;
  userName?: string;
  createdAt: string;
  completedAt: string | null;
};

type PaymentDetail = {
  payment: Record<string, unknown>;
  financeEntries: Array<{ id: string; entryType: string; amountMwk: number; description: string; createdAt: string }>;
  travelCreditTransactions: Array<{ id: string; entryType: string; amountMwk: number; description: string; createdAt: string }>;
};

export function PaymentsPage() {
  const [entries, setEntries] = useState<PaymentRow[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { pushModal } = useModal();

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (from) params.set("from", new Date(from).toISOString());
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      params.set("to", end.toISOString());
    }
    const data = await apiFetch<{ entries: PaymentRow[] }>(`/admin/payments?${params}`);
    setEntries(data.entries);
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const openPayment = async (id: string) => {
    const detail = await apiFetch<PaymentDetail>(`/admin/payments/ledger/${id}`);
    const p = detail.payment;
    pushModal({
      title: String(p.chargeId ?? "Payment"),
      subtitle: `${p.userName ?? "Customer"} · ${String(p.status)}`,
      width: "lg",
      content: <PaymentDetailModal detail={detail} paymentId={id} onUpdated={load} />,
    });
  };

  return (
    <PageShell title="Payments" subtitle="All payment ledger entries. Click a row for full details.">
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-hairline bg-surface-elevated p-4">
        <label className="text-sm">
          <span className="text-muted-foreground">From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-lg border border-hairline px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-lg border border-hairline px-3 py-2" />
        </label>
        <button type="button" onClick={load} className="btn-signal rounded-lg px-4 py-2 text-sm font-medium">
          Filter
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-hairline bg-surface-elevated">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline bg-surface text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Charge ID</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Method</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!entries.length ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No payments in this period.</td></tr>
            ) : (
              entries.map((t) => (
                <tr key={t.id} onClick={() => openPayment(t.id)} className="cursor-pointer border-b border-hairline transition-colors last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-mono text-xs">{t.chargeId}</td>
                  <td className="px-4 py-3">
                    <p>{t.userName}</p>
                    <p className="text-xs text-muted-foreground">{t.userEmail}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{t.paymentMethod.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 capitalize">{t.status}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatMwk(t.amountMwk)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{format(new Date(t.createdAt), "dd MMM yyyy HH:mm")}</td>
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

function PaymentDetailModal({
  detail,
  paymentId,
  onUpdated,
}: {
  detail: PaymentDetail;
  paymentId: string;
  onUpdated: () => void;
}) {
  const { popModal } = useModal();
  const p = detail.payment;
  const snapshot = p.orderSnapshot as Record<string, unknown> | undefined;
  const bank = p.bankDetails as Record<string, string | null> | null;
  const card = p.card3ds as { requires3ds: boolean; authUrl: string | null } | null;
  const [acting, setActing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const hasProof = Boolean(p.hasProof);
  const proofUrl = hasProof ? `${getApiBase()}/admin/payments/ledger/${paymentId}/proof` : null;

  const viewProof = async () => {
    const token = localStorage.getItem("biazo-admin-access");
    if (!token || !proofUrl) return;
    const res = await fetch(proofUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      setMessage("Could not load proof document.");
      return;
    }
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
  };

  const approve = async () => {
    setActing(true);
    setMessage(null);
    try {
      await apiFetch(`/admin/payments/ledger/${paymentId}/approve-proof`, { method: "POST" });
      onUpdated();
      popModal();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setActing(false);
    }
  };

  const reject = async () => {
    if (rejectReason.trim().length < 3) {
      setMessage("Enter a short rejection reason.");
      return;
    }
    setActing(true);
    setMessage(null);
    try {
      await apiFetch(`/admin/payments/ledger/${paymentId}/reject-proof`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      onUpdated();
      popModal();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setActing(false);
    }
  };

  const fields: Array<[string, string]> = [
    ["Charge ID", String(p.chargeId ?? "-")],
    ["Status", String(p.status ?? "-")],
    ["Payment method", String(p.paymentMethod ?? "-")],
    ["Amount", formatMwk(Number(p.amountMwk ?? 0))],
    ["Currency", String(p.currency ?? "-")],
    ["Display currency", String(p.displayCurrency ?? "-")],
    ["Customer", `${p.userName ?? "-"} · ${p.userEmail ?? "-"}`],
    ["Phone", String(p.userPhone ?? "-")],
    ["Order type", String(p.orderType ?? "-")],
    ["Order ID", String(p.orderId ?? "-")],
    ["Manual reference", String(p.manualReference ?? "-")],
    ["Proof status", String(p.proofReviewStatus ?? "-")],
    ["PayChangu status", String(p.paychanguStatus ?? "-")],
    ["PayChangu ref", String(p.paychanguRefId ?? "-")],
    ["Mobile number", String(p.mobileNumber ?? "-")],
    ["Mobile operator", String(p.mobileOperatorName ?? "-")],
    ["Created", p.createdAt ? format(new Date(String(p.createdAt)), "PPpp") : "-"],
    ["Completed", p.completedAt ? format(new Date(String(p.completedAt)), "PPpp") : "-"],
    ["Expires", p.expiresAt ? format(new Date(String(p.expiresAt)), "PPpp") : "-"],
    ["Order fulfilled", p.orderFulfilled ? "Yes" : "No"],
    ["Verification attempts", String(p.verificationAttempts ?? 0)],
    ["Failure reason", String(p.failureReason ?? "-")],
  ];

  return (
    <div className="space-y-5 text-sm">
      <section className="grid gap-2 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-surface px-3 py-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium break-all">{value}</p>
          </div>
        ))}
      </section>

      {bank && (
        <section className="rounded-xl border border-hairline p-4">
          <h3 className="font-semibold">Bank transfer details</h3>
          <p className="mt-2">{bank.bankName} · {bank.accountNumber} · {bank.accountName}</p>
          {bank.expiresAt && <p className="text-xs text-muted-foreground">Expires {format(new Date(bank.expiresAt), "PPpp")}</p>}
        </section>
      )}

      {p.paymentMethod === "manual_transfer" && p.proofReviewStatus === "submitted" && proofUrl && (
        <section className="rounded-xl border border-signal/40 bg-signal-soft/20 p-4">
          <h3 className="font-semibold">Manual payment proof</h3>
          <p className="mt-1 text-xs text-muted-foreground">Review the receipt, then approve or reject.</p>
          <button
            type="button"
            onClick={() => void viewProof()}
            className="mt-3 text-sm font-medium text-signal underline"
          >
            View proof document
          </button>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={approve} disabled={acting} className="btn-signal rounded-lg px-4 py-2 text-sm font-medium">
              {acting ? "Working…" : "Approve & mark paid"}
            </button>
          </div>
          <div className="mt-4 space-y-2">
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason (shown to customer)"
              className="w-full rounded-lg border border-hairline px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={reject}
              disabled={acting}
              className="rounded-lg border border-hairline px-4 py-2 text-sm text-red-700"
            >
              Reject proof
            </button>
          </div>
          {message && <p className="mt-3 text-sm">{message}</p>}
        </section>
      )}

      {Boolean(p.proofRejectionReason) && (
        <section className="rounded-xl border border-hairline p-4">
          <h3 className="font-semibold">Proof rejection</h3>
          <p className="mt-1 text-sm">{String(p.proofRejectionReason)}</p>
        </section>
      )}

      {card && (
        <section className="rounded-xl border border-hairline p-4">
          <h3 className="font-semibold">Card / 3DS</h3>
          <p>Requires 3DS: {card.requires3ds ? "Yes" : "No"}</p>
          {card.authUrl && <a href={card.authUrl} className="text-signal underline" target="_blank" rel="noreferrer">Auth URL</a>}
        </section>
      )}

      {snapshot && (
        <section className="rounded-xl border border-hairline p-4">
          <h3 className="font-semibold">Order snapshot</h3>
          <pre className="mt-2 max-h-48 overflow-auto rounded bg-surface p-2 text-xs">{JSON.stringify(snapshot, null, 2)}</pre>
        </section>
      )}

      {detail.financeEntries.length > 0 && (
        <section className="rounded-xl border border-hairline p-4">
          <h3 className="font-semibold">Finance ledger entries</h3>
          <ul className="mt-2 space-y-1">
            {detail.financeEntries.map((e) => (
              <li key={e.id} className="text-xs">{format(new Date(e.createdAt), "dd MMM yyyy")} · {e.entryType} · {formatMwk(e.amountMwk)} · {e.description}</li>
            ))}
          </ul>
        </section>
      )}

      {detail.travelCreditTransactions.length > 0 && (
        <section className="rounded-xl border border-hairline p-4">
          <h3 className="font-semibold">Travel credit transactions</h3>
          <ul className="mt-2 space-y-1">
            {detail.travelCreditTransactions.map((e) => (
              <li key={e.id} className="text-xs">{format(new Date(e.createdAt), "dd MMM yyyy")} · {e.entryType} · {formatMwk(e.amountMwk)} · {e.description}</li>
            ))}
          </ul>
        </section>
      )}

      {p.providerResponse != null && (
        <section className="rounded-xl border border-hairline p-4">
          <h3 className="font-semibold">Provider response</h3>
          <pre className="mt-2 max-h-48 overflow-auto rounded bg-surface p-2 text-xs">{JSON.stringify(p.providerResponse, null, 2)}</pre>
        </section>
      )}
    </div>
  );
}

export function FinancePage() {
  const [data, setData] = useState<{
    totals: {
      paymentsMwk: number;
      refundsMwk: number;
      feesMwk: number;
      creditsMwk: number;
      grossRevenueMwk?: number;
      netRevenueMwk?: number;
    };
    entries: Array<{ id: string; entryType: string; amountMwk: number; description: string; userName: string | null; createdAt: string }>;
  } | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [sendingReport, setSendingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (from) params.set("from", new Date(from).toISOString());
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      params.set("to", end.toISOString());
    }
    const result = await apiFetch<typeof data>(`/admin/finance?${params}`);
    setData(result);
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const sendReport = async () => {
    if (!reportFrom || !reportTo) return;
    setSendingReport(true);
    setReportMessage(null);
    try {
      const result = await apiFetch<{ message: string; sentTo: string }>("/admin/finance/report", {
        method: "POST",
        body: JSON.stringify({
          from: new Date(reportFrom).toISOString(),
          to: new Date(reportTo).toISOString(),
        }),
      });
      setReportMessage(`${result.message} - sent to ${result.sentTo}`);
    } catch (err) {
      setReportMessage(err instanceof Error ? err.message : "Failed to send report");
    } finally {
      setSendingReport(false);
    }
  };

  const totals = data?.totals;
  const gross = totals?.grossRevenueMwk ?? (totals ? totals.paymentsMwk + totals.feesMwk : 0);
  const net = totals?.netRevenueMwk ?? (totals ? totals.paymentsMwk + totals.feesMwk - totals.refundsMwk : 0);

  return (
    <PageShell title="Finance tracker" subtitle="Ledger entries, revenue, refunds, and travel credits across Biazo.">
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-hairline bg-surface-elevated p-4">
        <label className="text-sm">
          <span className="text-muted-foreground">From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-lg border border-hairline px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-lg border border-hairline px-3 py-2" />
        </label>
        <button type="button" onClick={load} className="btn-signal rounded-lg px-4 py-2 text-sm font-medium">
          Filter
        </button>
      </div>

      {totals && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border-2 border-signal/40 bg-signal-soft/30 p-5 sm:col-span-2 lg:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-signal">Gross revenue</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{formatMwk(gross)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Payments + fees (before refunds)</p>
            </div>
            <div className="rounded-2xl border border-hairline bg-surface-elevated p-5 sm:col-span-2 lg:col-span-1">
              <p className="text-xs uppercase text-muted-foreground">Net revenue</p>
              <p className="mt-2 text-3xl font-semibold">{formatMwk(net)}</p>
              <p className="mt-1 text-xs text-muted-foreground">After refunds</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Payments", value: totals.paymentsMwk },
              { label: "Refunds", value: totals.refundsMwk },
              { label: "Fees", value: totals.feesMwk },
              { label: "Credits", value: totals.creditsMwk },
            ].map((t) => (
              <div key={t.label} className="rounded-2xl border border-hairline bg-surface-elevated p-4">
                <p className="text-xs uppercase text-muted-foreground">{t.label}</p>
                <p className="mt-1 text-xl font-semibold">{formatMwk(t.value)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <section className="mt-8 rounded-2xl border border-hairline bg-surface-elevated p-6">
        <h2 className="text-sm font-semibold">Request financial report</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Sends a detailed report to the main admin email. Scheduled reports (weekly, monthly, quarterly, bi-yearly, yearly) are configured in Settings.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="text-muted-foreground">Report from</span>
            <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="mt-1 block rounded-lg border border-hairline px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Report to</span>
            <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="mt-1 block rounded-lg border border-hairline px-3 py-2" />
          </label>
          <button type="button" onClick={sendReport} disabled={sendingReport || !reportFrom || !reportTo} className="btn-signal rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
            {sendingReport ? "Sending…" : "Email report"}
          </button>
        </div>
        {reportMessage && <p className="mt-3 text-sm text-signal">{reportMessage}</p>}
      </section>

      <div className="mt-6 overflow-hidden rounded-2xl border border-hairline bg-surface-elevated">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline bg-surface text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {!data?.entries.length ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No ledger entries.</td></tr>
            ) : (
              data.entries.map((e) => (
                <tr key={e.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3">{e.description}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.userName ?? "-"}</td>
                  <td className="px-4 py-3 capitalize">{e.entryType}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatMwk(e.amountMwk)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{format(new Date(e.createdAt), "dd MMM yyyy")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}

export function TicketsPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const { pushModal } = useModal();

  const load = () => {
    apiFetch<{ tickets: TicketRow[] }>("/admin/tickets").then((d) => setTickets(d.tickets));
  };

  useEffect(() => {
    load();
  }, []);

  const openTicket = async (id: string) => {
    const detail = await apiFetch<TicketDetail>(`/admin/tickets/${id}`);
    pushModal({
      title: detail.ticket.pnr ?? "Ticket",
      subtitle: `${detail.ticket.originCode} → ${detail.ticket.destinationCode} · ${detail.customer.name}`,
      width: "lg",
      content: <TicketDetailModal detail={detail} onUpdated={load} />,
    });
  };

  return (
    <PageShell title="Tickets" subtitle="All issued ticket segments. Click a row for full details and admin controls.">
      <div className="overflow-hidden rounded-2xl border border-hairline bg-surface-elevated">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline bg-surface text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">PNR</th>
              <th className="px-4 py-3 text-left">Passenger</th>
              <th className="px-4 py-3 text-left">Route</th>
              <th className="px-4 py-3 text-left">Depart</th>
              <th className="px-4 py-3 text-left">Seat</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!tickets.length ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No tickets issued yet.</td></tr>
            ) : (
              tickets.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => openTicket(t.id)}
                  className="cursor-pointer border-b border-hairline transition-colors last:border-0 hover:bg-surface"
                >
                  <td className="px-4 py-3 font-mono text-xs">{t.pnr}</td>
                  <td className="px-4 py-3">
                    <p>{t.passengerNames ?? t.userName}</p>
                    <p className="text-xs text-muted-foreground">{t.userEmail}</p>
                  </td>
                  <td className="px-4 py-3">{t.originCode} → {t.destinationCode}</td>
                  <td className="px-4 py-3">{format(new Date(t.departAt), "dd MMM yyyy HH:mm")}</td>
                  <td className="px-4 py-3">{t.seat ?? "-"}</td>
                  <td className="px-4 py-3 capitalize">{t.displayStatus ?? t.status}</td>
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

type TicketRow = {
  id: string;
  pnr?: string;
  userName?: string;
  userEmail?: string;
  originCode: string;
  destinationCode: string;
  departAt: string;
  airline: string;
  seat: string | null;
  status: string;
  displayStatus?: string;
  passengerNames?: string | null;
};

type TicketDetail = {
  ticket: TicketRow & {
    arriveAt: string;
    gate: string | null;
    flightLabel: string | null;
    class: string;
    bookingId: string;
  };
  customer: { email: string; name: string; phone: string | null };
  application: { id: string; referenceNumber: string; appTicketId: string; fileName: string } | null;
};

function TicketDetailModal({ detail, onUpdated }: { detail: TicketDetail; onUpdated: () => void }) {
  const { popModal } = useModal();
  const [seat, setSeat] = useState(detail.ticket.seat ?? "");
  const [gate, setGate] = useState(detail.ticket.gate ?? "");
  const [status, setStatus] = useState(detail.ticket.status);
  const [passengerNames, setPassengerNames] = useState(detail.ticket.passengerNames ?? "");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch(`/admin/tickets/${detail.ticket.id}`, {
        method: "PATCH",
        body: JSON.stringify({ seat, gate, status, passengerNames }),
      });
      onUpdated();
      popModal();
    } finally {
      setSaving(false);
    }
  };

  const resend = async () => {
    setSending(true);
    setMessage(null);
    try {
      await apiFetch(`/admin/tickets/${detail.ticket.id}/resend`, { method: "POST" });
      setMessage("Ticket email sent to customer.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative space-y-5 text-sm">
      {(saving || sending) && <LoadingOverlay label={sending ? "Sending email" : "Saving"} />}
      {message && <p className="rounded-lg bg-signal-soft px-3 py-2 text-signal">{message}</p>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="Customer" value={`${detail.customer.name} · ${detail.customer.email}`} />
        <Info label="Route" value={`${detail.ticket.originCode} → ${detail.ticket.destinationCode}`} />
        <Info label="Airline / flight" value={`${detail.ticket.airline}${detail.ticket.flightLabel ? ` · ${detail.ticket.flightLabel}` : ""}`} />
        <Info label="Departure" value={format(new Date(detail.ticket.departAt), "PPpp")} />
        <Info label="Arrival" value={format(new Date(detail.ticket.arriveAt), "PPpp")} />
        <Info label="Display status" value={detail.ticket.displayStatus ?? detail.ticket.status} />
      </section>

      {detail.application && (
        <section className="rounded-xl border border-hairline bg-surface px-4 py-3">
          <p className="text-xs text-muted-foreground">Linked application</p>
          <p className="font-medium">{detail.application.referenceNumber}</p>
          <p className="text-xs text-muted-foreground">Document: {detail.application.fileName}</p>
        </section>
      )}

      <section className="rounded-xl border border-hairline p-4">
        <h3 className="font-semibold">Edit ticket details</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-muted-foreground">Seat</span>
            <input value={seat} onChange={(e) => setSeat(e.target.value)} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Gate</span>
            <input value={gate} onChange={(e) => setGate(e.target.value)} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2" />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-muted-foreground">Passenger name(s)</span>
            <input value={passengerNames} onChange={(e) => setPassengerNames(e.target.value)} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2">
              {["confirmed", "completed", "cancelled"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={save} disabled={saving} className="btn-signal rounded-lg px-4 py-2 font-medium">
            Save changes
          </button>
          <button type="button" onClick={resend} disabled={sending || !detail.application} className="inline-flex items-center gap-2 rounded-lg border border-hairline px-4 py-2 font-medium hover:bg-surface disabled:opacity-50">
            <Send className="h-4 w-4" /> Resend ticket email
          </button>
          <a href={`mailto:${detail.customer.email}`} className="inline-flex items-center gap-2 rounded-lg border border-hairline px-4 py-2 font-medium hover:bg-surface">
            <Mail className="h-4 w-4" /> Email customer
          </a>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

export function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [platform, setPlatform] = useState({
    whatsappNumber: "",
    conciergePhone: "",
    reportEmail: "",
    reportSchedules: { weekly: true, monthly: true, quarterly: true, biannual: true, yearly: true },
  });
  const [profile, setProfile] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
  });

  useEffect(() => {
    Promise.all([
      apiFetch<{ settings: typeof platform }>("/admin/settings"),
      apiFetch<{ user: { email: string; firstName: string; lastName: string; phone: string | null } }>("/admin/me"),
    ]).then(([settingsRes, meRes]) => {
      setPlatform(settingsRes.settings);
      setProfile({
        email: meRes.user.email,
        firstName: meRes.user.firstName,
        lastName: meRes.user.lastName,
        phone: meRes.user.phone ?? "",
        currentPassword: "",
        newPassword: "",
      });
    }).finally(() => setLoading(false));
  }, []);

  const savePlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch("/admin/settings", { method: "PATCH", body: JSON.stringify(platform) });
      setMessage("Platform settings saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setMessage(null);
    try {
      await apiFetch("/admin/me", {
        method: "PATCH",
        body: JSON.stringify({
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone || null,
          currentPassword: profile.currentPassword || undefined,
          newPassword: profile.newPassword || undefined,
        }),
      });
      setMessage("Admin profile updated.");
      setProfile((p) => ({ ...p, currentPassword: "", newPassword: "" }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  if (loading) {
    return (
      <PageShell title="Settings" subtitle="Loading…">
        <LoadingOverlay label="Loading settings" />
      </PageShell>
    );
  }

  return (
    <PageShell title="Settings" subtitle="Platform configuration and your admin account.">
      {message && <p className="mb-6 rounded-xl border border-signal/30 bg-signal-soft px-4 py-3 text-sm">{message}</p>}

      <form onSubmit={savePlatform} className="max-w-2xl space-y-4 rounded-2xl border border-hairline bg-surface-elevated p-6">
        <h2 className="text-sm font-semibold">Platform settings</h2>
        <p className="text-xs text-muted-foreground">WhatsApp and concierge numbers appear in ticket and quote emails.</p>
        <label className="block text-sm">
          <span className="text-muted-foreground">WhatsApp number</span>
          <input required value={platform.whatsappNumber} onChange={(e) => setPlatform({ ...platform, whatsappNumber: e.target.value })} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2" placeholder="+265999123456" />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Concierge phone (display)</span>
          <input required value={platform.conciergePhone} onChange={(e) => setPlatform({ ...platform, conciergePhone: e.target.value })} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2" placeholder="+265 999 123 456" />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Financial report email</span>
          <input required type="email" value={platform.reportEmail} onChange={(e) => setPlatform({ ...platform, reportEmail: e.target.value })} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2" />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm text-muted-foreground">Automatic report schedule</legend>
          {(["weekly", "monthly", "quarterly", "biannual", "yearly"] as const).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm capitalize">
              <input
                type="checkbox"
                checked={platform.reportSchedules[key]}
                onChange={(e) =>
                  setPlatform({
                    ...platform,
                    reportSchedules: { ...platform.reportSchedules, [key]: e.target.checked },
                  })
                }
              />
              {key === "biannual" ? "Bi-yearly" : key}
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={saving} className="btn-signal rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
          {saving ? "Saving…" : "Save platform settings"}
        </button>
      </form>

      <form onSubmit={saveProfile} className="mt-8 max-w-2xl space-y-4 rounded-2xl border border-hairline bg-surface-elevated p-6">
        <h2 className="text-sm font-semibold">Your admin account</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="text-muted-foreground">Email</span>
            <input required type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">First name</span>
            <input required value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Last name</span>
            <input required value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2" />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-muted-foreground">Phone</span>
            <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Current password</span>
            <input type="password" value={profile.currentPassword} onChange={(e) => setProfile({ ...profile, currentPassword: e.target.value })} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2" placeholder="Required to change password" />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">New password</span>
            <input type="password" value={profile.newPassword} onChange={(e) => setProfile({ ...profile, newPassword: e.target.value })} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2" placeholder="Min 8 characters" />
          </label>
        </div>
        <button type="submit" disabled={profileSaving} className="btn-signal rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
          {profileSaving ? "Saving…" : "Update profile"}
        </button>
      </form>
    </PageShell>
  );
}
