"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { DoorOpen } from "lucide-react";
import { getSessionRoomInfo, setSessionRoom, type SessionRoomInfo } from "@/lib/actions/meet/session-room";

/** Book, change or release the meeting room for one meeting date. */
export default function SessionRoomCard({ sessionId, dateLabel }: { sessionId: string; dateLabel?: string }) {
  const [info, setInfo] = useState<SessionRoomInfo | null>(null);
  const [changing, setChanging] = useState(false);
  const [pending, start] = useTransition();
  const load = () => getSessionRoomInfo(sessionId).then(setInfo).catch(() => null);
  useEffect(() => { load(); }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!info) return null;

  const pick = (roomId: string | null) =>
    start(async () => {
      const r = await setSessionRoom({ sessionId, roomId });
      if (!r.success) { toast.error(r.error || "Couldn't change the room."); return; }
      toast.success(roomId ? "Room booked" : "Room released");
      setChanging(false);
      load();
    });

  const showList = info.canEdit && (changing || !info.current);
  return (
    <section className="theme-card-structural space-y-3 p-4" aria-labelledby={`room-${sessionId}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`room-${sessionId}`} className="flex items-center gap-2 text-[15px] font-semibold text-heading">
          <DoorOpen className="h-4 w-4" aria-hidden /> Meeting room{dateLabel ? ` · ${dateLabel}` : ""}
        </h2>
        {info.current && info.canEdit && !changing && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setChanging(true)} className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-[13px] font-semibold text-foreground hover:bg-surface-hover">Change room</button>
            <button type="button" disabled={pending} onClick={() => pick(null)} className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-[13px] font-semibold text-danger-text hover:bg-surface-hover">Release</button>
          </div>
        )}
      </div>
      {info.current ? (
        <p className="text-[14px] text-foreground"><span className="font-semibold">{info.current.name}</span> <span className="text-muted">· {info.current.status === "pending" ? "waiting for the room's confirmation" : "booked"}</span></p>
      ) : (
        <p className="text-[13.5px] text-muted">{info.canEdit ? "No room booked. Pick one below if people will meet in the office." : "No room booked; this meeting is on Teams."}</p>
      )}
      {showList && (
        info.rooms.length === 0 ? (
          <p className="text-[13.5px] text-subtle">No rooms have been added yet. An admin can add them in <Link href="/meet/admin?section=rooms" className="font-semibold text-primary hover:underline">Settings › Rooms and door screens</Link>.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {info.rooms.map((r) => {
              const small = r.capacity > 0 && r.capacity < info.people;
              const isCurrent = info.current?.roomId === r.id;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    disabled={!r.free || pending || isCurrent}
                    onClick={() => pick(r.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left disabled:cursor-not-allowed disabled:opacity-60 ${isCurrent ? "border-primary bg-accent-soft" : "border-border bg-surface hover:bg-surface-hover"}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-foreground">{r.name}</span>
                      <span className="block truncate text-[12.5px] text-muted">{r.capacity} seats{r.location ? ` · ${r.location}` : ""}{small ? " · too small" : ""}</span>
                    </span>
                    <span className={`shrink-0 text-[12px] font-semibold ${r.free ? "text-success-text" : "text-danger-text"}`}>{isCurrent ? "Yours" : r.free ? "Free" : `Booked · ${r.busyWith}`}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )
      )}
      {changing && <button type="button" onClick={() => setChanging(false)} className="text-[13px] font-semibold text-primary hover:underline">Keep the current room</button>}
    </section>
  );
}
