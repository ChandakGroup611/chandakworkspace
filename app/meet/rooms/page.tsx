import React from "react";
import Link from "next/link";
import { DoorOpen, Users, Video, Monitor, PenLine, MapPin, ExternalLink } from "lucide-react";
import { getRoomsToday, type RoomToday } from "@/lib/actions/meet/rooms-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Rooms · Chandak Meet",
  description: "Meeting rooms, what's booked today and what's free now",
};

const IST = "Asia/Kolkata";
const t = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit" });

const FILTERS = [
  { id: "all", label: "All rooms" },
  { id: "free", label: "Free now" },
  { id: "teams", label: "With Teams" },
  { id: "big", label: "8+ seats" },
];

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const sp = await searchParams;
  const f = FILTERS.some((x) => x.id === sp.f) ? sp.f! : "all";
  let rooms = await getRoomsToday(f === "big" ? 8 : undefined, f === "teams");
  if (f === "free") rooms = rooms.filter((r) => r.freeNow);
  const freeCount = rooms.filter((r) => r.freeNow).length;

  return (
    <div className="space-y-5 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading">Rooms</h1>
          <p className="mt-1 text-[14px] text-subtle">
            {rooms.length} room{rooms.length === 1 ? "" : "s"} · {freeCount} free right now. Book a room while scheduling a meeting.
          </p>
        </div>
        <Link
          href="/meet/meetings/new"
          className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-[14px] font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Schedule a meeting
        </Link>
      </div>

      <nav aria-label="Filter rooms" className="flex flex-wrap gap-2">
        {FILTERS.map((x) => (
          <Link
            key={x.id}
            href={x.id === "all" ? "/meet/rooms" : `/meet/rooms?f=${x.id}`}
            aria-current={f === x.id ? "page" : undefined}
            className={`inline-flex h-9 items-center rounded-full border px-4 text-[13.5px] font-semibold ${
              f === x.id ? "border-primary bg-accent-soft text-accent-soft-text" : "border-border bg-surface text-subtle hover:bg-surface-hover"
            }`}
          >
            {x.label}
          </Link>
        ))}
      </nav>

      {rooms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <DoorOpen className="mx-auto h-8 w-8 text-muted" aria-hidden />
          <p className="mt-3 text-[15px] font-semibold text-heading">No rooms match</p>
          <p className="mt-1 text-[13.5px] text-subtle">Rooms are added by a Meet admin in Settings.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rooms.map((r) => (
            <RoomCard key={r.id} r={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RoomCard({ r }: { r: RoomToday }) {
  return (
    <li className="flex flex-col rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[16px] font-semibold text-heading">{r.name}</h2>
          {r.location && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-muted">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden /> {r.location}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
            r.freeNow ? "bg-success-soft text-success-text" : "bg-danger-soft text-danger-text"
          }`}
        >
          {r.freeNow ? "Free now" : `Busy until ${t(r.busyUntil!)}`}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-subtle">
        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden /> {r.capacity} seats</span>
        {r.hasTeams && <span className="inline-flex items-center gap-1"><Video className="h-3.5 w-3.5" aria-hidden /> Teams</span>}
        {r.projector && <span className="inline-flex items-center gap-1"><Monitor className="h-3.5 w-3.5" aria-hidden /> Screen</span>}
        {r.whiteboard && <span className="inline-flex items-center gap-1"><PenLine className="h-3.5 w-3.5" aria-hidden /> Whiteboard</span>}
      </div>

      <div className="mt-4 flex-1">
        <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted">Today</h3>
        {r.bookings.length === 0 ? (
          <p className="mt-1.5 text-[13.5px] text-subtle">Nothing booked today.</p>
        ) : (
          <ul className="mt-1.5 space-y-1">
            {r.bookings.slice(0, 6).map((b, i) => (
              <li key={i} className="flex gap-2 text-[13.5px]">
                <span className="w-[118px] shrink-0 tabular-nums text-muted">{t(b.start)} – {t(b.end)}</span>
                <span className={`truncate ${b.mine ? "font-semibold text-foreground" : "text-subtle"}`}>
                  {b.title}{b.mine ? " (yours)" : ""}
                </span>
              </li>
            ))}
            {r.bookings.length > 6 && <li className="text-[13px] text-muted">+{r.bookings.length - 6} more</li>}
          </ul>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <Link
          href={`/rooms/${r.id}/display`}
          target="_blank"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-primary hover:underline"
        >
          Open door display <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </li>
  );
}
