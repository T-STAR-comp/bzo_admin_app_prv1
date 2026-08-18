import { format } from "date-fns";
import { ChevronRight, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { LoadingOverlay, LoadingScreen } from "@/components/LoadingScreen";
import { useModal } from "@/context/modal-context";
import { apiFetch } from "@/lib/api";
import { PageShell } from "@/pages/StatisticsPage";

type AppRow = {
  id: string;
  referenceNumber: string;
  status: string;
  tripType: string;
  originCode: string;
  destinationCode: string;
  originCity: string;
  destinationCity: string;
  departDate: string;
  departTimePreferred: string;
  returnDate: string | null;
  cabinClass: string;
  customerName: string;
  customerEmail: string;
  passengerCount: number;
  quotedPriceMwk: number | null;
  extraChargesMwk: number;
  totalPriceMwk: number;
  requiredTicketCount: number;
  isAlternateOffer: boolean;
  passengers: Array<{
    passengerType: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    ageYears: number | null;
    isAccompanied: boolean | null;
    infantSeatBooked: boolean | null;
  }>;
  contactPhone: string;
  contactWhatsapp: string | null;
  needCarRental: boolean;
  needHotel: boolean;
  hotelRequestDetails: string | null;
  carRentalRequestDetails: string | null;
  specialWheelchair: boolean;
  wheelchairReason: string | null;
  specialMeals: boolean;
  mealsReason: string | null;
  specialSeat: boolean;
  seatPreference: string | null;
  quotedDepartDate: string | null;
  quotedDepartTime: string | null;
  quotedReturnDate: string | null;
  quotedReturnTime: string | null;
  quotedAirline: string | null;
  quotedFlightNumber: string | null;
  adminMessage: string | null;
  quoteLineItems?: Array<{
    id: string;
    type: string;
    label: string;
    description: string;
    amountMwk: number;
    removable: boolean;
    removed?: boolean;
    details?: Record<string, string>;
  }>;
  quoteExchangeRates?: Record<string, number>;
  paidCurrency?: string | null;
  paidAmount?: number | null;
  customerDisplayCurrency?: string | null;
  events: Array<{ eventType: string; message: string; createdAt: string }>;
  tickets?: UploadedTicket[];
};

type UploadedTicket = {
  id: string;
  fileName: string;
  segmentOrder: number;
  passengerNames: string | null;
  seat: string | null;
  airline: string | null;
  flightNumber: string | null;
  bookingNumber: string | null;
};

export function ApplicationsPage() {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { pushModal } = useModal();

  const load = useCallback(async () => {
    const data = await apiFetch<{ applications: AppRow[] }>("/admin/applications");
    setApps(data.applications);
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const openApp = async (id: string) => {
    setLoading(true);
    try {
      const data = await apiFetch<{
        application: AppRow;
        customer: { name: string; email: string };
        events: AppRow["events"];
        tickets: UploadedTicket[];
        uploadedTicketCount: number;
        requiredTicketCount: number;
      }>(`/admin/applications/${id}`);
      pushModal({
        title: data.application.referenceNumber,
        subtitle: `${data.application.originCode} → ${data.application.destinationCode} · ${data.customer.name}`,
        width: "xl",
        content: (
          <ApplicationDetailModal
            applicationId={id}
            initial={{
              app: {
                ...data.application,
                events: data.events,
                tickets: data.tickets,
              },
              events: data.events,
              uploadedTicketCount: data.uploadedTicketCount,
              requiredTicketCount: data.requiredTicketCount,
            }}
            onUpdated={load}
          />
        ),
      });
      await load();
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Flight applications"
      subtitle="Review customer availability requests, send quotes, and upload tickets after payment."
    >
      {loading && apps.length === 0 ? (
        <LoadingScreen label="Loading applications" />
      ) : (
      <div className="relative overflow-hidden rounded-2xl border border-hairline bg-surface-elevated">
        {loading && apps.length > 0 && <LoadingOverlay label="Refreshing" />}
        <table className="w-full text-sm">
          <thead className="border-b border-hairline bg-surface text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Ref</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Route</th>
              <th className="px-4 py-3 text-left">Depart</th>
              <th className="px-4 py-3 text-left">Pax</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {apps.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No applications yet.</td></tr>
            ) : (
              apps.map((a) => (
                <tr key={a.id} onClick={() => openApp(a.id)} className="cursor-pointer border-b border-hairline hover:bg-surface last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{a.referenceNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.customerName}</p>
                    <p className="text-xs text-muted-foreground">{a.customerEmail}</p>
                  </td>
                  <td className="px-4 py-3">{a.originCode} → {a.destinationCode}</td>
                  <td className="px-4 py-3">{format(new Date(a.departDate), "d MMM yyyy")} {a.departTimePreferred}</td>
                  <td className="px-4 py-3">{a.passengerCount}</td>
                  <td className="px-4 py-3 capitalize">{a.status.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3"><ChevronRight className="h-4 w-4 text-muted-foreground" /></td>
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

function ApplicationDetailModal({
  applicationId,
  initial,
  onUpdated,
}: {
  applicationId: string;
  initial: {
    app: AppRow;
    events: AppRow["events"];
    uploadedTicketCount: number;
    requiredTicketCount: number;
  };
  onUpdated: () => void;
}) {
  const { pushModal, popModal } = useModal();
  const [detail, setDetail] = useState(initial);
  const [submitting, setSubmitting] = useState(false);

  const { app, events, uploadedTicketCount, requiredTicketCount } = detail;
  const ticketsUploaded = uploadedTicketCount;
  const ticketsRequired = requiredTicketCount;
  const ticketsRemaining = Math.max(0, ticketsRequired - ticketsUploaded);

  const refreshDetail = async () => {
    const data = await apiFetch<{
      application: AppRow;
      events: AppRow["events"];
      tickets: UploadedTicket[];
      uploadedTicketCount: number;
      requiredTicketCount: number;
    }>(`/admin/applications/${applicationId}`);
    setDetail({
      app: { ...data.application, events: data.events, tickets: data.tickets },
      events: data.events,
      uploadedTicketCount: data.uploadedTicketCount,
      requiredTicketCount: data.requiredTicketCount,
    });
    if (data.application.status === "awaiting_payment") {
      setQuote(quoteFormFromApp({ ...data.application, tickets: data.tickets }));
    }
    onUpdated();
  };

  const [quote, setQuote] = useState(() => quoteFormFromApp(initial.app));

  const submitQuote = async (edit = false) => {
    setSubmitting(true);
    try {
      const extras: Array<{ label: string; description: string; amountMwk: number }> = [];
      if (quote.extraLabel && Number(quote.extraAmountMwk) > 0) {
        extras.push({
          label: quote.extraLabel,
          description: quote.extraDescription,
          amountMwk: Number(quote.extraAmountMwk),
        });
      }

      const exchangeRates = buildExchangeRatesPayload(quote);

      const payload = {
        isAlternateOffer: quote.isAlternateOffer,
        quotedDepartDate: quote.quotedDepartDate,
        quotedDepartTime: quote.quotedDepartTime,
        quotedAirline: quote.quotedAirline || undefined,
        quotedFlightNumber: quote.quotedFlightNumber || undefined,
        quotedPriceMwk: Number(quote.quotedPriceMwk),
        hotel:
          quote.includeHotel && quote.hotelName && Number(quote.hotelAmountMwk) > 0
            ? {
                hotelName: quote.hotelName,
                nights: quote.hotelNights || undefined,
                roomType: quote.hotelRoomType || undefined,
                amountMwk: Number(quote.hotelAmountMwk),
              }
            : null,
        carRental:
          quote.includeCarRental && quote.carProvider && Number(quote.carAmountMwk) > 0
            ? {
                provider: quote.carProvider,
                vehicle: quote.carVehicle,
                days: quote.carDays || undefined,
                amountMwk: Number(quote.carAmountMwk),
              }
            : null,
        extras,
        adminMessage: quote.adminMessage || undefined,
        exchangeRates: Object.keys(exchangeRates).length > 0 ? exchangeRates : undefined,
      };

      await apiFetch(`/admin/applications/${app.id}/quote`, {
        method: edit ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      if (!edit) {
        popModal();
      }
      await refreshDetail();
    } finally {
      setSubmitting(false);
    }
  };

  const uploadTicket = () => {
    if (ticketsRemaining <= 0) return;
    pushModal({
      title: `Upload ticket ${ticketsUploaded + 1} of ${ticketsRequired}`,
      subtitle: `${app.referenceNumber} - enter details for this boarding pass only`,
      width: "lg",
      content: (
        <UploadTicketForm
          app={app}
          ticketIndex={ticketsUploaded}
          totalRequired={ticketsRequired}
          onDone={async (completed) => {
            popModal();
            await refreshDetail();
            if (completed) popModal();
          }}
        />
      ),
    });
  };

  const ticketSlotLabel = (index: number) => {
    const segments = app.tripType === "roundtrip" ? 2 : 1;
    if (segments > 1 && app.passengers.length === 1) {
      return index === 0 ? "Outbound flight" : "Return flight";
    }
    if (app.passengers.length > 1 && segments === 1) {
      const pax = app.passengers[index];
      return pax ? `${pax.firstName} ${pax.lastName}` : `Passenger ${index + 1}`;
    }
    if (segments > 1 && app.passengers.length > 1) {
      const paxIndex = index % app.passengers.length;
      const leg = Math.floor(index / app.passengers.length) === 0 ? "Outbound" : "Return";
      const pax = app.passengers[paxIndex];
      return pax ? `${leg} · ${pax.firstName} ${pax.lastName}` : `${leg} · Passenger ${paxIndex + 1}`;
    }
    return `Ticket ${index + 1}`;
  };

  return (
    <div className="space-y-5 text-sm">
      <section className="grid gap-3 sm:grid-cols-3">
        <Info label="Status" value={app.status.replace(/_/g, " ")} />
        <Info label="Contact" value={`${app.contactPhone}${app.contactWhatsapp ? ` · WA ${app.contactWhatsapp}` : ""}`} />
        <Info label="Cabin" value={app.cabinClass} />
      </section>

      <section className="rounded-xl border border-hairline p-4">
        <h3 className="font-semibold">Passengers</h3>
        <ul className="mt-2 space-y-1">
          {app.passengers.map((p, i) => (
            <li key={i} className="text-muted-foreground">
              {p.firstName} {p.lastName} · {p.passengerType}
              {p.ageYears != null && ` · age ${p.ageYears}`}
              {p.isAccompanied != null && (p.isAccompanied ? " · accompanied" : " · unaccompanied")}
              {p.infantSeatBooked && " · infant seat"}
            </li>
          ))}
        </ul>
      </section>

      {(app.needCarRental || app.needHotel || app.specialWheelchair || app.specialMeals || app.specialSeat) && (
        <section className="rounded-xl border border-hairline p-4">
          <h3 className="font-semibold">Extras & services</h3>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {app.needCarRental && (
              <li>
                Car rental requested
                {app.carRentalRequestDetails && (
                  <p className="mt-1 whitespace-pre-wrap text-ink">{app.carRentalRequestDetails}</p>
                )}
              </li>
            )}
            {app.needHotel && (
              <li>
                Hotel requested
                {app.hotelRequestDetails && (
                  <p className="mt-1 whitespace-pre-wrap text-ink">{app.hotelRequestDetails}</p>
                )}
              </li>
            )}
            {app.specialWheelchair && <li>Wheelchair: {app.wheelchairReason}</li>}
            {app.specialMeals && <li>Meals: {app.mealsReason}</li>}
            {app.specialSeat && <li>Seat: {app.seatPreference}</li>}
          </ul>
        </section>
      )}

      {["in_review", "pending"].includes(app.status) && (
        <section className="relative space-y-4">
          {submitting && <LoadingOverlay label="Sending quote" />}

          <div className="rounded-xl border border-hairline p-4">
            <h3 className="font-semibold">Flight availability</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {quote.isAlternateOffer
                ? "Customer requested different specs - enter what you found."
                : "Confirm the flight details that match the customer request."}
            </p>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={quote.isAlternateOffer} onChange={(e) => setQuote({ ...quote, isAlternateOffer: e.target.checked })} />
              Alternate offer (times or route differ from request)
            </label>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Field label="Departure date" type="date" value={quote.quotedDepartDate} onChange={(v) => setQuote({ ...quote, quotedDepartDate: v })} />
              <Field label="Departure time" type="time" value={quote.quotedDepartTime} onChange={(v) => setQuote({ ...quote, quotedDepartTime: v })} />
              <Field label="Airline" value={quote.quotedAirline} onChange={(v) => setQuote({ ...quote, quotedAirline: v })} placeholder="e.g. Biazo Air" />
              <Field label="Flight number" value={quote.quotedFlightNumber} onChange={(v) => setQuote({ ...quote, quotedFlightNumber: v })} placeholder="BZ101" />
            </div>
          </div>

          <div className="rounded-xl border-2 border-signal/30 bg-signal-soft/40 p-4">
            <h3 className="font-semibold text-ink">Pricing</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Fare and optional add-ons are shown separately to the customer - they can remove hotel or car rental before paying.
            </p>
            <div className="mt-3">
              <Field label="Main fare (MWK)" type="number" value={quote.quotedPriceMwk} onChange={(v) => setQuote({ ...quote, quotedPriceMwk: v })} placeholder="450000" required />
            </div>

            <div className="mt-4 rounded-lg border border-hairline bg-background p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={quote.includeHotel} onChange={(e) => setQuote({ ...quote, includeHotel: e.target.checked })} />
                Include hotel
              </label>
              {quote.includeHotel && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Field label="Hotel name" value={quote.hotelName} onChange={(v) => setQuote({ ...quote, hotelName: v })} placeholder="Sunbird Lilongwe" />
                  <Field label="Room type" value={quote.hotelRoomType} onChange={(v) => setQuote({ ...quote, hotelRoomType: v })} placeholder="Deluxe double" />
                  <Field label="Nights" value={quote.hotelNights} onChange={(v) => setQuote({ ...quote, hotelNights: v })} placeholder="2" />
                  <Field label="Hotel charge (MWK)" type="number" value={quote.hotelAmountMwk} onChange={(v) => setQuote({ ...quote, hotelAmountMwk: v })} placeholder="85000" />
                </div>
              )}
            </div>

            <div className="mt-3 rounded-lg border border-hairline bg-background p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={quote.includeCarRental} onChange={(e) => setQuote({ ...quote, includeCarRental: e.target.checked })} />
                Include car rental
              </label>
              {quote.includeCarRental && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Field label="Rental company" value={quote.carProvider} onChange={(v) => setQuote({ ...quote, carProvider: v })} placeholder="Avis Malawi" />
                  <Field label="Vehicle" value={quote.carVehicle} onChange={(v) => setQuote({ ...quote, carVehicle: v })} placeholder="Toyota RAV4" />
                  <Field label="Days" value={quote.carDays} onChange={(v) => setQuote({ ...quote, carDays: v })} placeholder="3" />
                  <Field label="Rental charge (MWK)" type="number" value={quote.carAmountMwk} onChange={(v) => setQuote({ ...quote, carAmountMwk: v })} placeholder="120000" />
                </div>
              )}
            </div>

            <div className="mt-3 rounded-lg border border-hairline bg-background p-3">
              <p className="text-sm font-medium">Other extra (optional)</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Field label="Label" value={quote.extraLabel} onChange={(v) => setQuote({ ...quote, extraLabel: v })} placeholder="Infant seat" />
                <Field label="Amount (MWK)" type="number" value={quote.extraAmountMwk} onChange={(v) => setQuote({ ...quote, extraAmountMwk: v })} placeholder="0" />
              </div>
              <textarea placeholder="Description shown to customer" value={quote.extraDescription} onChange={(e) => setQuote({ ...quote, extraDescription: e.target.value })} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2" rows={2} />
            </div>

            <div className="mt-3 rounded-lg border border-dashed border-hairline bg-background p-3">
              <p className="text-sm font-medium">Exchange rates (admin only)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                MWK per 1 unit of foreign currency - e.g. 1750 means 1 USD costs 1,750 kwacha. Used to convert quote prices for customers. Not shown to customers.
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Field label="MWK per USD" type="number" value={quote.rateUsd} onChange={(v) => setQuote({ ...quote, rateUsd: v })} placeholder="1750" />
                <Field label="MWK per ZAR" type="number" value={quote.rateZar} onChange={(v) => setQuote({ ...quote, rateZar: v })} placeholder="49" />
                <Field label="MWK per EUR" type="number" value={quote.rateEur} onChange={(v) => setQuote({ ...quote, rateEur: v })} placeholder="1900" />
                <Field label="MWK per GBP" type="number" value={quote.rateGbp} onChange={(v) => setQuote({ ...quote, rateGbp: v })} placeholder="2200" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-hairline p-4">
            <h3 className="font-semibold">Message to customer</h3>
            <textarea placeholder="Optional note included in the quote email" value={quote.adminMessage} onChange={(e) => setQuote({ ...quote, adminMessage: e.target.value })} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2" rows={2} />
            <button type="button" onClick={() => submitQuote(false)} disabled={submitting || !quote.quotedPriceMwk} className="btn-signal mt-3 rounded-lg px-4 py-2 font-medium disabled:opacity-50">
              Submit quote
            </button>
          </div>
        </section>
      )}

      {app.status === "awaiting_payment" && (
        <section className="relative space-y-4">
          {submitting && <LoadingOverlay label="Updating quote" />}
          <div className="rounded-xl border border-signal/30 bg-signal-soft/20 p-4">
            <h3 className="font-semibold">Edit sent quote</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Update pricing or add-ons while the customer has not paid yet. Changes apply immediately on their dashboard.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Field label="Departure date" type="date" value={quote.quotedDepartDate} onChange={(v) => setQuote({ ...quote, quotedDepartDate: v })} />
              <Field label="Departure time" type="time" value={quote.quotedDepartTime} onChange={(v) => setQuote({ ...quote, quotedDepartTime: v })} />
              <Field label="Airline" value={quote.quotedAirline} onChange={(v) => setQuote({ ...quote, quotedAirline: v })} />
              <Field label="Flight number" value={quote.quotedFlightNumber} onChange={(v) => setQuote({ ...quote, quotedFlightNumber: v })} />
              <Field label="Main fare (MWK)" type="number" value={quote.quotedPriceMwk} onChange={(v) => setQuote({ ...quote, quotedPriceMwk: v })} required />
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={quote.includeHotel} onChange={(e) => setQuote({ ...quote, includeHotel: e.target.checked })} />
              Include hotel
            </label>
            {quote.includeHotel && (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Field label="Hotel name" value={quote.hotelName} onChange={(v) => setQuote({ ...quote, hotelName: v })} />
                <Field label="Hotel charge (MWK)" type="number" value={quote.hotelAmountMwk} onChange={(v) => setQuote({ ...quote, hotelAmountMwk: v })} />
              </div>
            )}
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={quote.includeCarRental} onChange={(e) => setQuote({ ...quote, includeCarRental: e.target.checked })} />
              Include car rental
            </label>
            {quote.includeCarRental && (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Field label="Rental company" value={quote.carProvider} onChange={(v) => setQuote({ ...quote, carProvider: v })} />
                <Field label="Rental charge (MWK)" type="number" value={quote.carAmountMwk} onChange={(v) => setQuote({ ...quote, carAmountMwk: v })} />
              </div>
            )}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Field label="MWK per USD" type="number" value={quote.rateUsd} onChange={(v) => setQuote({ ...quote, rateUsd: v })} placeholder="1750" />
              <Field label="MWK per ZAR" type="number" value={quote.rateZar} onChange={(v) => setQuote({ ...quote, rateZar: v })} placeholder="49" />
              <Field label="MWK per EUR" type="number" value={quote.rateEur} onChange={(v) => setQuote({ ...quote, rateEur: v })} placeholder="1900" />
              <Field label="MWK per GBP" type="number" value={quote.rateGbp} onChange={(v) => setQuote({ ...quote, rateGbp: v })} placeholder="2200" />
            </div>
            <textarea placeholder="Message to customer" value={quote.adminMessage} onChange={(e) => setQuote({ ...quote, adminMessage: e.target.value })} className="mt-3 w-full rounded-lg border border-hairline px-3 py-2" rows={2} />
            <button type="button" onClick={() => submitQuote(true)} disabled={submitting || !quote.quotedPriceMwk} className="btn-signal mt-3 rounded-lg px-4 py-2 font-medium disabled:opacity-50">
              Save quote changes
            </button>
          </div>
        </section>
      )}

      {(app.paidAmount != null || app.paidCurrency) && (
        <section className="rounded-xl border border-hairline p-4">
          <h3 className="font-semibold">Payment received</h3>
          <p className="mt-2 text-sm">
            {app.paidAmount != null && app.paidCurrency
              ? `${app.paidAmount.toLocaleString()} ${app.paidCurrency}`
              : "-"}
            {app.customerDisplayCurrency && app.customerDisplayCurrency !== app.paidCurrency && (
              <span className="text-muted-foreground">
                {" "}
                · customer viewed prices in {app.customerDisplayCurrency}
              </span>
            )}
          </p>
        </section>
      )}

      {["paid", "purchasing"].includes(app.status) && ticketsRemaining > 0 && (
        <section className="rounded-xl border border-hairline p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Ticket uploads</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {ticketsRequired} ticket{ticketsRequired === 1 ? "" : "s"} required
                {app.tripType === "roundtrip" && app.passengers.length === 1
                  ? " (outbound + return)"
                  : app.passengers.length > 1
                    ? ` (${app.passengers.length} passenger${app.passengers.length === 1 ? "" : "s"}${app.tripType === "roundtrip" ? " × 2 flights" : ""})`
                    : ""}
                . Upload each PDF with its own PNR, seat, and passenger details.
              </p>
              <p className="mt-2 text-sm font-medium text-signal">
                {ticketsUploaded} of {ticketsRequired} uploaded
                {ticketsRemaining > 0 ? ` · ${ticketsRemaining} remaining` : ""}
              </p>
            </div>
            <button type="button" onClick={uploadTicket} className="btn-signal flex items-center gap-2 rounded-lg px-4 py-2 font-medium">
              <Upload className="h-4 w-4" />
              Upload ticket {ticketsUploaded + 1} of {ticketsRequired}
            </button>
          </div>

          {(app.tickets?.length ?? 0) > 0 && (
            <ul className="mt-4 space-y-2 border-t border-hairline pt-4">
              {app.tickets!.map((t, i) => (
                <li key={t.id} className="rounded-lg bg-surface px-3 py-2 text-xs">
                  <span className="font-semibold text-ink">{ticketSlotLabel(i)}</span>
                  <span className="text-muted-foreground">
                    {" · "}
                    {t.passengerNames ?? "-"}
                    {t.seat ? ` · Seat ${t.seat}` : ""}
                    {t.flightNumber ? ` · ${t.flightNumber}` : ""}
                    {t.bookingNumber ? ` · PNR ${t.bookingNumber}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section>
        <h3 className="font-semibold">Timeline</h3>
        <ul className="mt-2 space-y-2">
          {events.map((e, i) => (
            <li key={i} className="flex justify-between text-xs text-muted-foreground">
              <span>{e.message}</span>
              <span>{format(new Date(e.createdAt), "dd MMM HH:mm")}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function UploadTicketForm({
  app,
  ticketIndex,
  totalRequired,
  onDone,
}: {
  app: AppRow;
  ticketIndex: number;
  totalRequired: number;
  onDone: (completed: boolean) => void;
}) {
  const defaultPassenger = (() => {
    const segments = app.tripType === "roundtrip" ? 2 : 1;
    const paxIndex =
      segments > 1 && app.passengers.length === 1 ? 0 : ticketIndex % app.passengers.length;
    const pax = app.passengers[paxIndex];
    return pax ? `${pax.firstName} ${pax.lastName}` : "";
  })();

  const departDate = (() => {
    if (app.tripType === "roundtrip" && app.passengers.length >= 1) {
      const leg = Math.floor(ticketIndex / Math.max(app.passengers.length, 1));
      if (leg === 1 && app.quotedReturnDate) return app.quotedReturnDate.slice(0, 10);
    }
    return (app.quotedDepartDate ?? app.departDate).slice(0, 10);
  })();

  const departTime = (() => {
    if (app.tripType === "roundtrip" && app.passengers.length >= 1) {
      const leg = Math.floor(ticketIndex / Math.max(app.passengers.length, 1));
      if (leg === 1 && app.quotedReturnTime) return app.quotedReturnTime.slice(0, 5);
    }
    return (app.quotedDepartTime ?? app.departTimePreferred ?? "08:00").slice(0, 5);
  })();

  const defaultDepart = `${departDate}T${departTime}`;
  const defaultArrive = (() => {
    const d = new Date(`${departDate}T${departTime}:00`);
    d.setHours(d.getHours() + 2);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    bookingNumber: app.referenceNumber.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase(),
    seat: "",
    airline: app.quotedAirline ?? "",
    flightNumber: app.quotedFlightNumber ?? "",
    gate: "",
    departAt: defaultDepart,
    arriveAt: defaultArrive,
    passengerNames: defaultPassenger,
    cabinClass: app.cabinClass,
  });

  const isLastTicket = ticketIndex + 1 >= totalRequired;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!);
      const base64 = btoa(binary);
      const result = await apiFetch<{
        uploaded: number;
        required: number;
        completed: boolean;
        message: string;
      }>(`/admin/applications/${app.id}/tickets`, {
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || "application/pdf",
          fileBase64: base64,
          bookingNumber: form.bookingNumber,
          seat: form.seat,
          airline: form.airline,
          flightNumber: form.flightNumber,
          gate: form.gate || undefined,
          departAt: new Date(form.departAt).toISOString(),
          arriveAt: new Date(form.arriveAt).toISOString(),
          passengerNames: form.passengerNames,
          cabinClass: form.cabinClass,
        }),
      });
      onDone(result.completed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="relative space-y-4">
      {loading && <LoadingOverlay label={isLastTicket ? "Completing order" : "Saving ticket"} />}
      <p className="text-xs text-muted-foreground">
        Ticket {ticketIndex + 1} of {totalRequired}. Each upload creates one boarding pass on the customer dashboard with the details below.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Booking / PNR number" value={form.bookingNumber} onChange={(v) => setForm({ ...form, bookingNumber: v })} required />
        <Field label="Seat number" value={form.seat} onChange={(v) => setForm({ ...form, seat: v })} placeholder="12A" required />
        <Field label="Airline" value={form.airline} onChange={(v) => setForm({ ...form, airline: v })} required />
        <Field label="Flight number" value={form.flightNumber} onChange={(v) => setForm({ ...form, flightNumber: v })} placeholder="BZ101" required />
        <Field label="Gate" value={form.gate} onChange={(v) => setForm({ ...form, gate: v })} placeholder="B4" />
        <Field label="Cabin class" value={form.cabinClass} onChange={(v) => setForm({ ...form, cabinClass: v })} required />
        <Field label="Departure" type="datetime-local" value={form.departAt} onChange={(v) => setForm({ ...form, departAt: v })} required />
        <Field label="Arrival" type="datetime-local" value={form.arriveAt} onChange={(v) => setForm({ ...form, arriveAt: v })} required />
        <label className="block text-sm sm:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Passenger for this ticket</span>
          <input
            required
            value={form.passengerNames}
            onChange={(e) => setForm({ ...form, passengerNames: e.target.value })}
            placeholder="Jane Banda"
            className="mt-1 w-full rounded-lg border border-hairline bg-background px-3 py-2"
          />
        </label>
      </div>

      <div>
        <span className="text-xs font-medium text-muted-foreground">Ticket document (PDF or image)</span>
        <input type="file" accept=".pdf,image/*" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 w-full cursor-pointer text-sm" />
      </div>

      <button type="submit" disabled={!file || loading} className="btn-signal w-full rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50">
        {isLastTicket ? "Upload final ticket & notify customer" : `Save ticket ${ticketIndex + 1} - upload next`}
      </button>
    </form>
  );
}

type QuoteFormState = {
  isAlternateOffer: boolean;
  quotedDepartDate: string;
  quotedDepartTime: string;
  quotedAirline: string;
  quotedFlightNumber: string;
  quotedPriceMwk: string;
  includeHotel: boolean;
  hotelName: string;
  hotelNights: string;
  hotelRoomType: string;
  hotelAmountMwk: string;
  includeCarRental: boolean;
  carProvider: string;
  carVehicle: string;
  carDays: string;
  carAmountMwk: string;
  extraLabel: string;
  extraDescription: string;
  extraAmountMwk: string;
  adminMessage: string;
  rateUsd: string;
  rateZar: string;
  rateEur: string;
  rateGbp: string;
};

function quoteFormFromApp(app: AppRow): QuoteFormState {
  const items = app.quoteLineItems ?? [];
  const fare = items.find((i) => i.type === "fare" && !i.removed);
  const hotel = items.find((i) => i.type === "hotel" && !i.removed);
  const car = items.find((i) => i.type === "car_rental" && !i.removed);
  const extra = items.find((i) => i.type === "extra" && !i.removed && i.id !== "legacy-extra");
  const rates = app.quoteExchangeRates ?? {};

  return {
    isAlternateOffer: app.isAlternateOffer,
    quotedDepartDate: app.quotedDepartDate ?? app.departDate,
    quotedDepartTime: app.quotedDepartTime ?? app.departTimePreferred,
    quotedAirline: app.quotedAirline ?? "",
    quotedFlightNumber: app.quotedFlightNumber ?? "",
    quotedPriceMwk: fare ? String(fare.amountMwk) : app.quotedPriceMwk ? String(app.quotedPriceMwk) : "",
    includeHotel: Boolean(hotel) || app.needHotel,
    hotelName: hotel?.details?.hotelName ?? "",
    hotelNights: hotel?.details?.nights ?? "",
    hotelRoomType: hotel?.details?.roomType ?? "",
    hotelAmountMwk: hotel ? String(hotel.amountMwk) : "",
    includeCarRental: Boolean(car) || app.needCarRental,
    carProvider: car?.details?.provider ?? "",
    carVehicle: car?.details?.vehicle ?? "",
    carDays: car?.details?.days ?? "",
    carAmountMwk: car ? String(car.amountMwk) : "",
    extraLabel: extra?.label ?? "",
    extraDescription: extra?.description ?? "",
    extraAmountMwk: extra ? String(extra.amountMwk) : "",
    adminMessage: app.adminMessage ?? "",
    rateUsd: rates.USD != null ? formatStoredMwkPerUnit(rates.USD) : "",
    rateZar: rates.ZAR != null ? formatStoredMwkPerUnit(rates.ZAR) : "",
    rateEur: rates.EUR != null ? formatStoredMwkPerUnit(rates.EUR) : "",
    rateGbp: rates.GBP != null ? formatStoredMwkPerUnit(rates.GBP) : "",
  };
}

/** Stored rates are MWK per 1 foreign unit (e.g. 1750 = 1 USD). */
function formatStoredMwkPerUnit(storedRate: number): string {
  const mwkPerUnit = storedRate > 0 && storedRate < 0.05 ? 1 / storedRate : storedRate;
  if (mwkPerUnit >= 100) return String(Math.round(mwkPerUnit));
  return mwkPerUnit.toFixed(4).replace(/\.?0+$/, "");
}

function buildExchangeRatesPayload(quote: QuoteFormState): Record<string, number> {
  const out: Record<string, number> = {};
  if (quote.rateUsd && Number(quote.rateUsd) > 0) out.USD = Number(quote.rateUsd);
  if (quote.rateZar && Number(quote.rateZar) > 0) out.ZAR = Number(quote.rateZar);
  if (quote.rateEur && Number(quote.rateEur) > 0) out.EUR = Number(quote.rateEur);
  if (quote.rateGbp && Number(quote.rateGbp) > 0) out.GBP = Number(quote.rateGbp);
  return out;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-hairline bg-background px-3 py-2"
      />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  );
}
