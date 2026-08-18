import { format } from "date-fns";
import { Calendar, ChevronRight, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useModal } from "@/context/modal-context";
import { apiFetch } from "@/lib/api";
import { formatMwk } from "@/lib/utils";
import { PageShell } from "@/pages/StatisticsPage";

type RouteRow = {
  id: string;
  originCode: string;
  originCity: string;
  destinationCode: string;
  destinationCity: string;
  airline: string;
  basePriceMwk: number;
  cabinClass: string;
  isActive: boolean;
  departureCount: number;
  upcomingCount: number;
};

type Departure = {
  id: string;
  flightNumber: string;
  departAt: string;
  arriveAt: string;
  seatsTotal: number;
  seatsAvailable: number;
  bookedCount: number;
  status: string;
  priceMwk: number | null;
};

type RouteDetail = {
  route: RouteRow;
  departures: Departure[];
};

export function RoutesPage() {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { pushModal } = useModal();

  const load = useCallback(async () => {
    const data = await apiFetch<{ routes: RouteRow[] }>("/admin/routes");
    setRoutes(data.routes);
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const openRoute = async (routeId: string) => {
    const detail = await apiFetch<RouteDetail>(`/admin/routes/${routeId}`);
    pushModal({
      title: `${detail.route.originCode} → ${detail.route.destinationCode}`,
      subtitle: `${detail.route.originCity} to ${detail.route.destinationCity} · ${detail.route.airline}`,
      width: "xl",
      content: <RouteDetailModal detail={detail} onUpdated={load} />,
    });
  };

  const createRoute = () => {
    pushModal({
      title: "Create flight route",
      subtitle: "Routes appear in customer flight search when departures are scheduled.",
      width: "lg",
      content: <CreateRouteForm onCreated={load} />,
    });
  };

  return (
    <PageShell
      title="Routes"
      subtitle="Manage searchable flight routes and schedule departures. Customers book from the client app."
      action={
        <button type="button" onClick={createRoute} className="btn-signal flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
          <Plus className="h-4 w-4" /> New route
        </button>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-hairline bg-surface-elevated">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline bg-surface text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Airline</th>
              <th className="px-4 py-3">Base fare</th>
              <th className="px-4 py-3">Departures</th>
              <th className="px-4 py-3">Upcoming</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading routes…</td></tr>
            ) : routes.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No routes yet. Create one to enable flight search.</td></tr>
            ) : (
              routes.map((r) => (
                <tr key={r.id} onClick={() => openRoute(r.id)} className="cursor-pointer border-b border-hairline hover:bg-surface last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.originCode} → {r.destinationCode}</p>
                    <p className="text-xs text-muted-foreground">{r.originCity} · {r.destinationCity}</p>
                  </td>
                  <td className="px-4 py-3">{r.airline}</td>
                  <td className="px-4 py-3">{formatMwk(r.basePriceMwk)}</td>
                  <td className="px-4 py-3">{r.departureCount}</td>
                  <td className="px-4 py-3">{r.upcomingCount}</td>
                  <td className="px-4 py-3">{r.isActive ? "Active" : "Inactive"}</td>
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

function RouteDetailModal({ detail, onUpdated }: { detail: RouteDetail; onUpdated: () => void }) {
  const { pushModal } = useModal();

  const openDeparture = async (departureId: string, departAt: string) => {
    const data = await apiFetch<{
      departure: Departure;
      route: { originCode: string; destinationCode: string; originCity: string; destinationCity: string };
      bookings: Array<{
        id: string;
        pnr: string;
        userName: string;
        userEmail: string;
        userPhone: string | null;
        userStatus: string;
        priceMwk: number;
        status: string;
      }>;
    }>(`/admin/departures/${departureId}/bookings`);

    pushModal({
      title: `Flight book · ${format(new Date(departAt), "EEE, dd MMM yyyy")}`,
      subtitle: `${data.route.originCode}→${data.route.destinationCode} · ${data.departure.flightNumber}`,
      width: "xl",
      content: <DepartureBookingsModal data={data} />,
    });
  };

  const addDeparture = () => {
    pushModal({
      title: "Schedule departure",
      subtitle: detail.route.originCode + " → " + detail.route.destinationCode,
      content: <AddDepartureForm routeId={detail.route.id} onAdded={onUpdated} />,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Info label="Cabin" value={detail.route.cabinClass} />
        <Info label="Base price" value={formatMwk(detail.route.basePriceMwk)} />
        <Info label="Departures" value={String(detail.departures.length)} />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Calendar className="h-4 w-4" /> Flight book</h3>
        <button type="button" onClick={addDeparture} className="rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium hover:bg-surface">
          + Add date
        </button>
      </div>

      {detail.departures.length === 0 ? (
        <p className="text-sm text-muted-foreground">No scheduled departures. Add dates for customers to book.</p>
      ) : (
        <div className="space-y-2">
          {detail.departures.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => openDeparture(d.id, d.departAt)}
              className="flex w-full items-center justify-between rounded-xl border border-hairline px-4 py-3 text-left transition-colors hover:border-signal hover:bg-surface"
            >
              <div>
                <p className="font-medium">{format(new Date(d.departAt), "EEE, dd MMM yyyy · HH:mm")}</p>
                <p className="text-xs text-muted-foreground">{d.flightNumber} · {d.seatsAvailable}/{d.seatsTotal} seats · {d.bookedCount} booked</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DepartureBookingsModal({
  data,
}: {
  data: {
    bookings: Array<{
      id: string;
      pnr: string;
      userName: string;
      userEmail: string;
      userPhone: string | null;
      userStatus: string;
      priceMwk: number;
      status: string;
    }>;
    departure: Departure;
  };
}) {
  const { pushModal } = useModal();

  const openCustomer = async (bookingId: string) => {
    const detail = await apiFetch<{
      booking: {
        pnr: string;
        userName: string;
        userEmail: string;
        userPhone: string | null;
        userStatus: string;
        priceMwk: number;
        status: string;
        originCode: string;
        destinationCode: string;
        departAt: string;
      };
      tickets: Array<{ seat: string | null; gate: string | null; status: string }>;
    }>(`/admin/bookings/${bookingId}`);

    pushModal({
      title: detail.booking.userName,
      subtitle: detail.booking.userEmail,
      content: (
        <div className="space-y-3 text-sm">
          <Row label="PNR" value={detail.booking.pnr} />
          <Row label="Status" value={detail.booking.status} />
          <Row label="Account" value={detail.booking.userStatus} />
          <Row label="Phone" value={detail.booking.userPhone ?? "-"} />
          <Row label="Route" value={`${detail.booking.originCode}→${detail.booking.destinationCode}`} />
          <Row label="Depart" value={format(new Date(detail.booking.departAt), "PPpp")} />
          <Row label="Paid" value={formatMwk(detail.booking.priceMwk)} />
          {detail.tickets[0] && (
            <>
              <Row label="Seat" value={detail.tickets[0].seat ?? "Unassigned"} />
              <Row label="Gate" value={detail.tickets[0].gate ?? "TBA"} />
            </>
          )}
        </div>
      ),
    });
  };

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        {data.bookings.length} customer{data.bookings.length !== 1 ? "s" : ""} booked for this departure.
      </p>
      {data.bookings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bookings yet for this date.</p>
      ) : (
        <ul className="space-y-2">
          {data.bookings.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => openCustomer(b.id)}
                className="flex w-full items-center justify-between rounded-xl border border-hairline px-4 py-3 text-left hover:bg-surface"
              >
                <div>
                  <p className="font-medium">{b.userName}</p>
                  <p className="text-xs text-muted-foreground">{b.userEmail} · {b.pnr}</p>
                </div>
                <span className="text-sm text-muted-foreground">{formatMwk(b.priceMwk)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CreateRouteForm({ onCreated }: { onCreated: () => void }) {
  const { popModal } = useModal();
  const [form, setForm] = useState({
    originCode: "LLW",
    originCity: "Lilongwe",
    destinationCode: "JNB",
    destinationCity: "Johannesburg",
    airline: "Biazo Air",
    durationMinutes: 120,
    basePriceMwk: 450000,
    cabinClass: "Economy",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch("/admin/routes", { method: "POST", body: JSON.stringify(form) });
    popModal();
    onCreated();
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      {Object.entries(form).map(([key, val]) => (
        <label key={key} className="text-sm">
          <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
          <input
            type={typeof val === "number" ? "number" : "text"}
            value={val}
            onChange={(e) => setForm({ ...form, [key]: typeof val === "number" ? Number(e.target.value) : e.target.value })}
            className="mt-1 w-full rounded-lg border border-hairline px-3 py-2"
          />
        </label>
      ))}
      <button type="submit" className="btn-signal sm:col-span-2 rounded-lg py-2.5 text-sm font-semibold">Create route</button>
    </form>
  );
}

function AddDepartureForm({ routeId, onAdded }: { routeId: string; onAdded: () => void }) {
  const { popModal } = useModal();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  const arrive = new Date(tomorrow);
  arrive.setHours(10, 0, 0, 0);

  const [form, setForm] = useState({
    flightNumber: "BZ101",
    departAt: tomorrow.toISOString(),
    arriveAt: arrive.toISOString(),
    seatsTotal: 120,
    gate: "A1",
    priceMwk: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch(`/admin/routes/${routeId}/departures`, {
      method: "POST",
      body: JSON.stringify({
        ...form,
        priceMwk: form.priceMwk ? Number(form.priceMwk) : undefined,
      }),
    });
    popModal();
    onAdded();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <input value={form.flightNumber} onChange={(e) => setForm({ ...form, flightNumber: e.target.value })} placeholder="Flight number" className="w-full rounded-lg border border-hairline px-3 py-2 text-sm" />
      <label className="block text-sm">
        <span className="text-muted-foreground">Depart (ISO)</span>
        <input type="datetime-local" value={form.departAt.slice(0, 16)} onChange={(e) => setForm({ ...form, departAt: new Date(e.target.value).toISOString() })} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="text-muted-foreground">Arrive (ISO)</span>
        <input type="datetime-local" value={form.arriveAt.slice(0, 16)} onChange={(e) => setForm({ ...form, arriveAt: new Date(e.target.value).toISOString() })} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2" />
      </label>
      <input type="number" value={form.seatsTotal} onChange={(e) => setForm({ ...form, seatsTotal: Number(e.target.value) })} placeholder="Seats" className="w-full rounded-lg border border-hairline px-3 py-2 text-sm" />
      <button type="submit" className="btn-signal w-full rounded-lg py-2.5 text-sm font-semibold">Schedule flight</button>
    </form>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
