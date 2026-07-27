import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatMwk } from "@/lib/utils";

type Stats = {
  users: { total: number; admins: number; active: number; flagged: number };
  bookings: { total: number; confirmed: number };
  routes: { total: number; active: number };
  finance: { revenueMwk: number; refundsMwk: number };
  tickets: { total: number };
};

export function StatisticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Stats>("/admin/stats")
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageShell title="Statistics" subtitle="Loading overview…" />;
  if (!stats) return <PageShell title="Statistics" subtitle="Unable to load statistics." />;

  const cards = [
    { label: "Total users", value: stats.users.total, detail: `${stats.users.active} active · ${stats.users.flagged} flagged` },
    { label: "Admin accounts", value: stats.users.admins, detail: "Platform administrators" },
    { label: "Bookings", value: stats.bookings.total, detail: `${stats.bookings.confirmed} confirmed` },
    { label: "Active routes", value: stats.routes.active, detail: `${stats.routes.total} total routes` },
    { label: "Revenue (MWK)", value: formatMwk(stats.finance.revenueMwk), detail: `${formatMwk(stats.finance.refundsMwk)} refunded` },
    { label: "Tickets issued", value: stats.tickets.total, detail: "All segments" },
  ];

  return (
    <PageShell title="Statistics" subtitle="Real-time overview of Biazo operations across Malawi.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-hairline bg-surface-elevated p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink">{card.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{card.detail}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

export function PageShell({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-signal">Admin</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em]">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
