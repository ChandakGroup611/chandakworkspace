"use client";

import React, { useState, useEffect, useTransition } from "react";
import { QrCode, CheckCircle2, Clock, XCircle, ShieldCheck, RefreshCw, X, User } from "lucide-react";
import type { SessionAttendee } from "@/types/meet";
import { markAttendance, generateSessionCheckInQR } from "@/lib/actions/meet/attendance";
import { toast } from "react-toastify";

interface Props {
  sessionId: string;
  initialAttendees: SessionAttendee[];
  canManage: boolean;
}

export default function AttendanceCard({
  sessionId,
  initialAttendees,
  canManage,
}: Props) {
  const [attendees, setAttendees] = useState(initialAttendees);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrString, setQrString] = useState("");
  const [qrCountdown, setQrCountdown] = useState(60);
  const [isPending, startTransition] = useTransition();

  // Load and rotate QR code
  useEffect(() => {
    let interval: any;
    if (isQRModalOpen) {
      const fetchQR = async () => {
        const { qrString: token } = await generateSessionCheckInQR(sessionId);
        setQrString(token);
        setQrCountdown(60);
      };
      fetchQR();

      interval = setInterval(() => {
        setQrCountdown((prev) => {
          if (prev <= 1) {
            fetchQR();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isQRModalOpen, sessionId]);

  const handleUpdateStatus = (
    userId: string,
    status: "present" | "late" | "absent" | "excused",
    lateMinutes: number = 0
  ) => {
    startTransition(async () => {
      const res = await markAttendance(sessionId, userId, status, "manual", lateMinutes);
      if (res.success) {
        setAttendees((prev) =>
          prev.map((a) =>
            a.user_id === userId
              ? {
                  ...a,
                  attendance: status,
                  late_minutes: lateMinutes,
                  check_in_at: status === "present" || status === "late" ? new Date().toISOString() : null,
                }
              : a
          )
        );
        toast.success(`Marked as ${status}`);
      }
    });
  };

  const presentCount = attendees.filter((a) => a.attendance === "present" || a.attendance === "late").length;
  const lateCount = attendees.filter((a) => a.attendance === "late").length;
  const excusedCount = attendees.filter((a) => a.attendance === "excused").length;
  const absentCount = attendees.filter((a) => a.attendance === "absent").length;

  return (
    <div className="rounded-lg border border-border bg-elevated overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border bg-elevated/80 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <User className="w-4 h-4 text-theme-btn-primary" />
            Session Attendance & Check-in
          </h3>
          <p className="text-[12.5px] text-muted">
            Quorum: {presentCount} of {attendees.length} present ({lateCount} late, {excusedCount} excused)
          </p>
        </div>

        <button
          onClick={() => setIsQRModalOpen(true)}
          className="px-3 py-1.5 text-xs font-semibold rounded bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 flex items-center gap-1.5 shadow-sm"
        >
          <QrCode className="w-3.5 h-3.5" />
          Display Check-in QR
        </button>
      </div>

      <div className="p-4 divide-y divide-border">
        {attendees.map((a) => (
          <div key={a.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-muted text-[12px] shrink-0">
                {a.user?.full_name?.charAt(0) || "U"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground truncate">{a.user?.full_name || a.guest_name}</span>
                  <span className="text-[12px] text-muted capitalize">({a.role})</span>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-muted mt-0.5">
                  {a.check_in_at ? (
                    <span>Checked in at {new Date(a.check_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  ) : (
                    <span>Not checked in</span>
                  )}
                  {a.attendance === "late" && (
                    <span className="text-warning-text font-semibold">Late by {a.late_minutes || 0}m</span>
                  )}
                  {a.attendance === "excused" && (
                    <span className="text-info-text font-semibold">Excused</span>
                  )}
                </div>
              </div>
            </div>

            {canManage && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleUpdateStatus(a.user_id!, "present")}
                  className={`px-2 py-0.5 text-[12px] font-bold rounded ${
                    a.attendance === "present"
                      ? "bg-success text-white"
                      : "bg-surface hover:bg-success-soft text-success-text border border-success-border"
                  }`}
                >
                  P
                </button>
                <button
                  onClick={() => handleUpdateStatus(a.user_id!, "late", 10)}
                  className={`px-2 py-0.5 text-[12px] font-bold rounded ${
                    a.attendance === "late"
                      ? "bg-warning text-white"
                      : "bg-surface hover:bg-warning-soft text-warning-text border border-warning-border"
                  }`}
                >
                  L
                </button>
                <button
                  onClick={() => handleUpdateStatus(a.user_id!, "absent")}
                  className={`px-2 py-0.5 text-[12px] font-bold rounded ${
                    a.attendance === "absent"
                      ? "bg-danger-solid text-white"
                      : "bg-surface hover:bg-danger-soft text-danger-text border border-danger-border"
                  }`}
                >
                  A
                </button>
                <button
                  onClick={() => handleUpdateStatus(a.user_id!, "excused")}
                  className={`px-2 py-0.5 text-[12px] font-bold rounded ${
                    a.attendance === "excused"
                      ? "bg-info text-white"
                      : "bg-surface hover:bg-info-soft text-info-text border border-info-border"
                  }`}
                >
                  E
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rotating QR Modal */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-elevated border border-border rounded-lg max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-theme-btn-primary" /> Scan to Check In
              </h3>
              <button onClick={() => setIsQRModalOpen(false)} className="text-muted hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-6 flex flex-col items-center">
              <div className="p-4 bg-white rounded-xl shadow-lg border border-border">
                {/* SVG QR Visual */}
                <div className="w-44 h-44 flex flex-col items-center justify-center bg-slate-100 text-slate-900 rounded p-2 text-center text-xs break-all font-mono select-all">
                  <QrCode className="w-28 h-28 text-slate-900 mb-2" />
                  <span className="text-[12px] text-slate-600 line-clamp-2">{qrString.slice(0, 36)}...</span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1.5 text-xs text-muted">
                <Clock className="w-3.5 h-3.5 text-warning-text" />
                <span>Code updates in: <strong className="text-warning-text">{qrCountdown}s</strong></span>
              </div>
              <p className="text-[12.5px] text-muted mt-2 max-w-xs">
                Scan with camera or mobile Chandak Workspace to mark presence. Check-ins after 5 minutes will be logged as Late.
              </p>
            </div>

            <button
              onClick={() => setIsQRModalOpen(false)}
              className="w-full py-2 text-xs font-semibold rounded bg-surface border border-border hover:bg-elevated text-foreground"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
