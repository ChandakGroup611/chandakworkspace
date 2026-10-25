"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Clock,
  Video,
  Users,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  Play,
  Square,
  ChevronRight,
  ShieldCheck,
  Check,
  ExternalLink,
  MessageSquare,
  CornerDownLeft,
} from "lucide-react";
import { StatusBadge } from "@/components/meet/StatusBadge";
import { QuickPointCapture } from "@/components/meet/QuickPointCapture";
import { CreateTaskModal } from "@/components/meet/CreateTaskModal";
import { EndSessionModal } from "@/components/meet/EndSessionModal";
import { AppButton } from "@/components/ui/AppButton";
import { updatePointStatus, updateSessionPointNotes } from "@/lib/actions/meet/points";
import { updateSessionAttendance, startSession } from "@/lib/actions/meet/sessions";
import { recordDecision } from "@/lib/actions/meet/decisions";
import { toast } from "react-toastify";
import type {
  MeetingSession,
  MeetingPoint,
  AgendaItem,
  SessionAttendee,
  PointStatus,
} from "@/types/meet";

interface LiveMeetingClientProps {
  session: MeetingSession;
  points: MeetingPoint[];
  agenda: AgendaItem[];
  attendees: SessionAttendee[];
  masters: {
    users: any[];
    categories: any[];
  };
}

export default function LiveMeetingClient({
  session,
  points: initialPoints,
  agenda: initialAgenda,
  attendees: initialAttendees,
  masters,
}: LiveMeetingClientProps) {
  const [points, setPoints] = useState<MeetingPoint[]>(initialPoints);
  const [agenda, setAgenda] = useState<AgendaItem[]>(initialAgenda);
  const [attendees, setAttendees] = useState<SessionAttendee[]>(initialAttendees);
  const [activeAgendaIdx, setActiveAgendaIdx] = useState(0);
  const [taskModalPoint, setTaskModalPoint] = useState<MeetingPoint | null>(null);
  const [endSessionOpen, setEndSessionOpen] = useState(false);
  const [quickDecisionText, setQuickDecisionText] = useState("");
  const [decisions, setDecisions] = useState<any[]>([]);

  // Agenda live stopwatch
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(session.status === "in_progress");

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning) {
      timer = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning]);

  const currentAgenda = agenda[activeAgendaIdx] || agenda[0];
  const plannedSecs = (currentAgenda?.planned_minutes || 15) * 60;
  const isOverTime = elapsedSeconds > plannedSecs;
  const isCriticalOverTime = elapsedSeconds > plannedSecs + 300;

  const handleStartSession = async () => {
    const res = await startSession(session.id);
    if (res.success) {
      setIsRunning(true);
      toast.success("Live session timer started");
    }
  };

  const handleNextAgenda = () => {
    if (activeAgendaIdx < agenda.length - 1) {
      setActiveAgendaIdx((i) => i + 1);
      setElapsedSeconds(0);
    }
  };

  const handleStatusChange = async (pointId: string, status: PointStatus) => {
    try {
      const res = await updatePointStatus({
        pointId,
        sessionId: session.id,
        status,
      });
      if (res.success && res.point) {
        setPoints((prev) =>
          prev.map((p) => (p.id === pointId ? { ...p, status: res.point.status } : p))
        );
        toast.success(`Point ${res.point.code} status: ${status}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handlePointCreated = (newPt: MeetingPoint) => {
    setPoints((prev) => [...prev, newPt]);
  };

  const handleToggleAttendance = async (attendeeId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "present" ? "absent" : currentStatus === "absent" ? "late" : "present";
    setAttendees((prev) =>
      prev.map((a) => (a.id === attendeeId ? { ...a, attendance: nextStatus as any } : a))
    );

    await updateSessionAttendance(session.id, [{ id: attendeeId, attendance: nextStatus }]);
  };

  const handleRecordQuickDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickDecisionText.trim()) return;

    const res = await recordDecision({
      sessionId: session.id,
      text: quickDecisionText.trim(),
    });

    if (res.success && res.decision) {
      setDecisions((prev) => [res.decision, ...prev]);
      setQuickDecisionText("");
      toast.success("Decision recorded");
    }
  };

  // Format mm:ss
  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const timerStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background">
      {/* Top Live Bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
            {session.code}
          </span>
          <h1 className="text-[14px] font-semibold text-heading line-clamp-1">
            {session.meeting?.title}
          </h1>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-[11.5px] font-medium text-success-text">Live Mode Active</span>
          </div>
        </div>

        {/* Stopwatch & Controls */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 font-mono text-[13px] font-bold px-3 py-1 rounded-md border ${
              isCriticalOverTime
                ? "bg-danger-soft text-danger-text border-danger-border animate-pulse"
                : isOverTime
                ? "bg-warning-soft text-warning-text border-warning-border"
                : "bg-sunken text-foreground border-border"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{timerStr}</span>
            <span className="text-[10px] text-muted font-normal">
              / {currentAgenda?.planned_minutes || 15}m
            </span>
          </div>

          {!isRunning && session.status !== "in_progress" && (
            <AppButton
              variant="secondary"
              size="sm"
              leftIcon={<Play className="h-3 w-3" />}
              onClick={handleStartSession}
            >
              Start Timer
            </AppButton>
          )}

          <AppButton
            variant="primary"
            size="sm"
            onClick={() => setEndSessionOpen(true)}
            className="bg-danger hover:bg-danger/90 text-white"
          >
            Conclude & Carry Forward
          </AppButton>
        </div>
      </header>

      {/* 3-Column Live Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden divide-x divide-border">
        {/* Left Panel: Agenda Run Sheet */}
        <div className="hidden md:flex w-64 flex-col bg-surface shrink-0 overflow-y-auto p-3.5 space-y-3">
          <div className="flex items-center justify-between text-[12px] font-semibold text-subtle">
            <span>Agenda Run Sheet</span>
            <span>{agenda.length} items</span>
          </div>

          <div className="space-y-2">
            {agenda.map((item, idx) => {
              const isActive = idx === activeAgendaIdx;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveAgendaIdx(idx);
                    setElapsedSeconds(0);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border text-[12px] transition-all ${
                    isActive
                      ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                      : "border-border bg-background text-foreground hover:bg-sunken"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-mono font-medium">0{idx + 1}</span>
                    <span className="text-muted">{item.planned_minutes} min</span>
                  </div>
                  <p className="line-clamp-2">{item.title}</p>
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <AppButton
              variant="outline"
              size="sm"
              onClick={handleNextAgenda}
              disabled={activeAgendaIdx >= agenda.length - 1}
              rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
              className="w-full text-[12px]"
            >
              Next Agenda Item
            </AppButton>
          </div>
        </div>

        {/* Center Panel: Points, Discussions & Quick Capture */}
        <div className="flex flex-1 flex-col min-w-0 bg-background overflow-hidden">
          {/* Scrollable Points List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Current Item Banner */}
            {currentAgenda && (
              <div className="rounded-lg border border-border bg-surface p-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Currently Discussing (Agenda {activeAgendaIdx + 1})
                </span>
                <h3 className="text-[14px] font-semibold text-heading mt-0.5">
                  {currentAgenda.title}
                </h3>
              </div>
            )}

            {/* Backup Points First (Carried Forward) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[12.5px] font-semibold text-subtle">
                <span className="flex items-center gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5 text-warning-text" />
                  Backup Points (Prioritized)
                </span>
                <span className="text-[11px] text-muted">Mandatory trail</span>
              </div>

              {points.map((pt) => {
                const isCarried = pt.is_backup || pt.carry_forward_count > 0;
                return (
                  <div
                    key={pt.id}
                    className={`rounded-lg border p-3.5 transition-all ${
                      isCarried
                        ? "border-warning-border/60 bg-surface shadow-xs"
                        : "border-border bg-surface"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[11px] font-bold text-primary">
                            {pt.code}
                          </span>
                          {isCarried && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-warning-soft px-1.5 py-0.5 text-[10.5px] font-medium text-warning-text">
                              <RotateCcw className="h-2.5 w-2.5" /> {pt.carry_forward_count}x carried
                            </span>
                          )}
                          <StatusBadge status={pt.status} />
                          <StatusBadge status={pt.priority} type="priority" />
                        </div>
                        <h4 className="text-[13.5px] font-semibold text-heading">{pt.title}</h4>
                      </div>

                      {/* One-Tap Status Toggles */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(pt.id, "in_progress")}
                          className={`rounded px-2 py-1 text-[11.5px] font-medium border transition-colors ${
                            pt.status === "in_progress"
                              ? "bg-warning-soft text-warning-text border-warning-border"
                              : "border-border bg-background hover:bg-sunken text-subtle"
                          }`}
                        >
                          In Progress
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(pt.id, "closed")}
                          className={`rounded px-2 py-1 text-[11.5px] font-medium border transition-colors ${
                            pt.status === "closed"
                              ? "bg-success-soft text-success-text border-success-border"
                              : "border-border bg-background hover:bg-sunken text-subtle"
                          }`}
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(pt.id, "on_hold")}
                          className={`rounded px-2 py-1 text-[11.5px] font-medium border transition-colors ${
                            pt.status === "on_hold"
                              ? "bg-sunken text-foreground border-border"
                              : "border-border bg-background hover:bg-sunken text-subtle"
                          }`}
                        >
                          Hold
                        </button>
                      </div>
                    </div>

                    {/* Metadata & Inline Action */}
                    <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[11.5px] text-muted">
                      <div className="flex items-center gap-3">
                        <span>Owner: <strong className="text-foreground">{pt.owner?.full_name || "Unassigned"}</strong></span>
                        <span>Due: <strong className="text-foreground">{pt.due_date}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTaskModalPoint(pt)}
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        <Plus className="h-3 w-3" /> Add Task
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Docked Quick Point Capture Bar */}
          <div className="shrink-0 border-t border-border bg-surface p-3">
            <QuickPointCapture
              meetingId={session.meeting_id}
              sessionId={session.id}
              users={masters.users}
              categories={masters.categories}
              onPointCreated={handlePointCreated}
            />
          </div>
        </div>

        {/* Right Panel: Attendance & Quick Decisions */}
        <div className="hidden lg:flex w-80 flex-col bg-surface shrink-0 overflow-y-auto p-4 space-y-5">
          {/* Live Attendance Checklist */}
          <div>
            <div className="flex items-center justify-between text-[12.5px] font-semibold text-subtle mb-2.5">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                Live Attendance ({attendees.length})
              </span>
              <span className="text-[11px] text-muted">Click to toggle</span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {attendees.map((a) => {
                const name = a.user?.full_name || a.guest_name || "Guest";
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleToggleAttendance(a.id, a.attendance)}
                    className="w-full flex items-center justify-between p-2 rounded-md border border-border bg-background hover:bg-sunken text-[12px] text-left transition-colors"
                  >
                    <span className="font-medium text-foreground line-clamp-1">{name}</span>
                    <span
                      className={`text-[11px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                        a.attendance === "present"
                          ? "bg-success-soft text-success-text"
                          : a.attendance === "late"
                          ? "bg-warning-soft text-warning-text"
                          : "bg-danger-soft text-danger-text"
                      }`}
                    >
                      {a.attendance}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Decisions Captured in Live Session */}
          <div className="space-y-2 border-t border-border pt-4">
            <div className="flex items-center justify-between text-[12.5px] font-semibold text-subtle">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Live Decisions ({decisions.length})
              </span>
            </div>

            <form onSubmit={handleRecordQuickDecision} className="space-y-1.5">
              <input
                type="text"
                value={quickDecisionText}
                onChange={(e) => setQuickDecisionText(e.target.value)}
                placeholder="Record decision: e.g. Approved budget..."
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={!quickDecisionText.trim()}
                className="w-full rounded bg-primary/10 py-1 text-[11.5px] font-medium text-primary hover:bg-primary/20 disabled:opacity-40 transition-colors"
              >
                Record Decision
              </button>
            </form>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pt-1">
              {decisions.map((dec) => (
                <div key={dec.id} className="p-2 rounded border border-border bg-background text-[11.5px]">
                  <span className="font-mono text-[10px] text-primary font-bold">{dec.code}</span>
                  <p className="mt-0.5 text-foreground font-medium">{dec.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Task Creation Modal */}
      {taskModalPoint && (
        <CreateTaskModal
          open={!!taskModalPoint}
          onOpenChange={(op) => !op && setTaskModalPoint(null)}
          pointId={taskModalPoint.id}
          pointCode={taskModalPoint.code}
          sessionId={session.id}
          users={masters.users}
        />
      )}

      {/* End Session & Carry Forward Modal */}
      <EndSessionModal
        open={endSessionOpen}
        onOpenChange={setEndSessionOpen}
        sessionId={session.id}
        sessionCode={session.code}
        points={points}
      />
    </div>
  );
}
