"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Users, Monitor, Wifi, Clock, QrCode, AlertCircle, CheckCircle2,
  Calendar, RefreshCw, Plus, ShieldCheck, Flame, ChevronRight, X
} from "lucide-react";
import {
  bookNowFromDisplay,
  endEarlyFromDisplay,
  extendFromDisplay,
  getRoomDisplayData,
} from "@/lib/actions/meet/rooms";
import { toast } from "react-toastify";

interface Props {
  initialData: any;
  roomId: string;
}

export default function RoomDisplayClient({ initialData, roomId }: Props) {
  const [data, setData] = useState(initialData);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPending, startTransition] = useTransition();
  const [shiftOffset, setShiftOffset] = useState({ x: 0, y: 0 });
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");

  // Auto-refresh display data every 30s & update clock every second
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const refreshInterval = setInterval(async () => {
      const fresh = await getRoomDisplayData(roomId);
      if (fresh?.room) setData(fresh);
    }, 30000);

    // Burn-in protection: shift layout by ±2px every 60s
    const burnInInterval = setInterval(() => {
      setShiftOffset({
        x: Math.floor(Math.random() * 5) - 2,
        y: Math.floor(Math.random() * 5) - 2,
      });
    }, 60000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(refreshInterval);
      clearInterval(burnInInterval);
    };
  }, [roomId]);

  const handleBookNow = (minutes: number) => {
    startTransition(async () => {
      const res = await bookNowFromDisplay(roomId, minutes);
      if (res.success) {
        toast.success(res.message);
        const fresh = await getRoomDisplayData(roomId);
        setData(fresh);
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleEndEarly = () => {
    if (!confirm("End current meeting and make room available immediately?")) return;
    startTransition(async () => {
      const res = await endEarlyFromDisplay(roomId);
      if (res.success) {
        toast.success("Room released and marked available.");
        const fresh = await getRoomDisplayData(roomId);
        setData(fresh);
      }
    });
  };

  const handleExtend = (extraMinutes: number) => {
    startTransition(async () => {
      const res = await extendFromDisplay(roomId, extraMinutes);
      if (res.success) {
        toast.success(res.message);
        const fresh = await getRoomDisplayData(roomId);
        setData(fresh);
      } else {
        toast.error(res.message);
      }
    });
  };

  const room = data.room;
  const status = data.status; // 'available' | 'in_use' | 'starting_soon'
  const current = data.currentBooking;
  const nextBookings = data.nextBookings || [];

  // Compute progress percent if current meeting
  let progressPercent = 0;
  if (current) {
    const startMs = new Date(current.start_at).getTime();
    const endMs = new Date(current.end_at).getTime();
    const nowMs = currentTime.getTime();
    progressPercent = Math.min(100, Math.max(0, ((nowMs - startMs) / (endMs - startMs)) * 100));
  }

  // Next available time
  const nextStartTime = nextBookings[0]
    ? new Date(nextBookings[0].startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "End of Day";

  return (
    <div
      style={{
        transform: `translate(${shiftOffset.x}px, ${shiftOffset.y}px)`,
        transition: "transform 1s ease-in-out",
      }}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden"
    >
      {/* Top Bar: Room Master & Live Clock */}
      <header className="px-8 py-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-white">{room.name}</h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
              {room.location || "Head Office"} {room.floor ? `· Floor ${room.floor}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-400" /> Max {room.capacity} seats
            </span>
            <span className="flex items-center gap-1">
              <Monitor className="w-3.5 h-3.5 text-emerald-400" /> Teams VC & Projector
            </span>
            <span className="flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5 text-indigo-400" /> High-speed Wi-Fi
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-3xl font-black font-mono tracking-tight text-white">
            {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {currentTime.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}
          </div>
        </div>
      </header>

      {/* Massive Status Band (3m readability) */}
      <div
        className={`px-8 py-6 flex items-center justify-between border-y transition-colors duration-500 ${
          status === "in_use"
            ? "bg-rose-950/80 border-rose-600 text-rose-200"
            : status === "starting_soon"
            ? "bg-amber-950/80 border-amber-500 text-amber-200"
            : "bg-emerald-950/80 border-emerald-500 text-emerald-200"
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-6 h-6 rounded-full animate-pulse ${
              status === "in_use"
                ? "bg-rose-500 shadow-[0_0_15px_#f43f5e]"
                : status === "starting_soon"
                ? "bg-amber-400 shadow-[0_0_15px_#fbbf24]"
                : "bg-emerald-400 shadow-[0_0_15px_#34d399]"
            }`}
          />
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-wider uppercase">
              {status === "in_use"
                ? "In Use · Do Not Disturb"
                : status === "starting_soon"
                ? "Meeting Starting Soon"
                : `Available until ${nextStartTime}`}
            </h2>
            <p className="text-xs font-semibold opacity-80 mt-0.5">
              {status === "in_use"
                ? `Reserved until ${new Date(current.end_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : status === "starting_soon"
                ? "Pre-booking window active · please prepare to vacate"
                : "Free for ad-hoc collaborative work or instant booking"}
            </p>
          </div>
        </div>

        {/* Ad-Hoc Booking Buttons (If Available) */}
        {status === "available" && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-wider">Book Now:</span>
            {[15, 30, 60].map((mins) => (
              <button
                key={mins}
                onClick={() => handleBookNow(mins)}
                disabled={isPending}
                className="px-4 py-2 text-sm font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-transform active:scale-95"
              >
                +{mins}m
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Body Grid */}
      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        {/* Left Column: Current Meeting & QR Check-in */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {current ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between flex-1">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-bold text-rose-400 uppercase tracking-wider">Active Session</span>
                  <span>
                    {new Date(current.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                    {new Date(current.end_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">{current.title}</h3>

                {/* Organizer details */}
                <div className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg text-white">
                    {current.organizerName.charAt(0)}
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Booked By</span>
                    <span className="text-base font-bold text-slate-100">{current.organizerName}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-6">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
                    <span>Meeting Progress</span>
                    <span>{Math.round(progressPercent)}% elapsed</span>
                  </div>
                  <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-rose-500 transition-all duration-1000"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Host Quick Actions */}
              <div className="flex items-center gap-3 mt-8 pt-6 border-t border-slate-800">
                <button
                  onClick={handleEndEarly}
                  disabled={isPending}
                  className="px-5 py-2.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 transition-colors"
                >
                  End Meeting Early
                </button>
                <button
                  onClick={() => handleExtend(15)}
                  disabled={isPending}
                  className="px-5 py-2.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 transition-colors"
                >
                  Extend 15 min
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col items-center justify-center text-center flex-1">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-3" />
              <h3 className="text-xl font-bold text-white">Room is Currently Available</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                No active meeting booked for this slot. Feel free to use this space or book immediately using the buttons above.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Upcoming Schedule & QR Code */}
        <div className="flex flex-col gap-6">
          {/* Upcoming Schedule Card */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex-1 flex flex-col">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" /> Today&apos;s Upcoming Meetings
            </h4>

            <div className="flex-1 space-y-3 overflow-y-auto">
              {nextBookings.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No further bookings scheduled today.</p>
              ) : (
                nextBookings.map((b: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="font-bold text-blue-400">
                        {new Date(b.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                        {new Date(b.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span className="font-bold text-slate-100 block text-sm">{b.title}</span>
                    <span className="text-slate-400 text-[11px] mt-0.5 block">Host: {b.organizerName}</span>
                  </div>
                ))
              )}
            </div>

            {/* Bottom QR Check-in Box */}
            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg">
                  <QrCode className="w-10 h-10 text-slate-950" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Touchless Check-in</span>
                  <span className="text-[11px] text-slate-400">Scan with mobile app</span>
                </div>
              </div>

              <button
                onClick={() => setIsReportOpen(true)}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline"
              >
                Report a problem
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Problem Report Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" /> Report Room Issue
              </h4>
              <button onClick={() => setIsReportOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 text-xs space-y-3">
              <textarea
                rows={3}
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="e.g. Projector HDMI cable loose, AC cooling issue..."
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsReportOpen(false)}
                className="px-3 py-1.5 text-xs rounded border border-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success("Helpdesk ticket raised for Admin department");
                  setIsReportOpen(false);
                  setReportText("");
                }}
                className="px-4 py-1.5 text-xs font-bold rounded bg-blue-600 hover:bg-blue-500 text-white"
              >
                Submit Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
