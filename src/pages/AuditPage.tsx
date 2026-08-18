import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { apiFetch } from "@/lib/api";
import { PageShell } from "@/pages/StatisticsPage";

type AuditEntry = {
  id: number;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  action: string;
  level: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
};

export function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from: "", to: "", action: "", level: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set("from", new Date(filters.from).toISOString());
      if (filters.to) {
        const end = new Date(filters.to);
        end.setHours(23, 59, 59, 999);
        params.set("to", end.toISOString());
      }
      if (filters.action) params.set("action", filters.action);
      if (filters.level) params.set("level", filters.level);
      const data = await apiFetch<{ entries: AuditEntry[] }>(`/admin/audit?${params}`);
      setEntries(data.entries);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PageShell title="Audit log" subtitle="Platform activity, admin actions, and security events.">
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-hairline bg-surface-elevated p-4">
        <label className="text-sm">
          <span className="text-muted-foreground">From</span>
          <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="mt-1 block rounded-lg border border-hairline px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">To</span>
          <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="mt-1 block rounded-lg border border-hairline px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Action contains</span>
          <input value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} placeholder="admin.user_updated" className="mt-1 block rounded-lg border border-hairline px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Level</span>
          <select value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })} className="mt-1 block rounded-lg border border-hairline px-3 py-2">
            <option value="">All</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </select>
        </label>
        <button type="button" onClick={load} className="btn-signal rounded-lg px-4 py-2 text-sm font-medium">
          Apply filters
        </button>
      </div>

      {loading ? (
        <LoadingScreen label="Loading audit log" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-hairline bg-surface-elevated">
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-surface text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">When</th>
                <th className="px-4 py-3 text-left">Level</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {!entries.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No audit entries for this period.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="border-b border-hairline last:border-0 align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {format(new Date(e.createdAt), "dd MMM yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-3 capitalize">{e.level}</td>
                    <td className="px-4 py-3 font-mono text-xs">{e.action}</td>
                    <td className="px-4 py-3">
                      {e.userName ? (
                        <>
                          <p>{e.userName}</p>
                          <p className="text-xs text-muted-foreground">{e.userEmail}</p>
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      {e.metadata ? (
                        <pre className="overflow-x-auto rounded bg-surface p-2 text-xs">{JSON.stringify(e.metadata, null, 2)}</pre>
                      ) : (
                        <span className="text-muted-foreground">{e.ipAddress ?? "-"}</span>
                      )}
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
