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
  Settings,
  Sparkles,
  X,
  Loader2,
} from "lucide-react";
import { StatusBadge } from "@/components/meet/StatusBadge";
import { QuickPointCapture } from "@/components/meet/QuickPointCapture";
import { CreateTaskModal } from "@/components/meet/CreateTaskModal";
import { EndSessionModal } from "@/components/meet/EndSessionModal";
import RunningNotesCard from "@/components/meet/RunningNotesCard";
import { sanitizeTeamsUrl } from "@/lib/integrations/microsoft-teams";
import DraggableLiveNotesWidget from "@/components/meet/DraggableLiveNotesWidget";
import { AppButton } from "@/components/ui/AppButton";
import { updatePointStatus, updateSessionPointNotes } from "@/lib/actions/meet/points";
import { updateSessionAttendance, startSession, updateSessionVideoLink } from "@/lib/actions/meet/sessions";
import { recordDecision } from "@/lib/actions/meet/decisions";
import { toast } from "react-toastify";
import { createClient } from "@/utils/supabase/client";
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
  const [focusedPointId, setFocusedPointId] = useState<string | null>(initialPoints[0]?.id || null);
  const [onlinePresence, setOnlinePresence] = useState<{ user_id: string; full_name?: string }[]>([]);
  const focusedPoint = points.find((p) => p.id === focusedPointId) || points[0] || null;

  const [videoLink, setVideoLink] = useState(
    session.video_link || session.meeting?.video_link || ""
  );
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoLinkInput, setVideoLinkInput] = useState(
    session.video_link || session.meeting?.video_link || ""
  );
  const [savingVideoLink, setSavingVideoLink] = useState(false);

  const handleSaveVideoLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVideoLink(true);
    try {
      const res = await updateSessionVideoLink({
        sessionId: session.id,
        videoLink: videoLinkInput,
      });
      if (res.success) {
        setVideoLink(videoLinkInput.trim());
        setShowVideoModal(false);
        toast.success("Video call link updated successfully!");
      } else {
        toast.error(res.error || "Failed to update video link");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update video link");
    } finally {
      setSavingVideoLink(false);
    }
  };

  const supabaseRef = useRef(createClient());

  // Supabase Realtime Live Collaboration & Presence
  useEffect(() => {
    const supabase = supabaseRef.current;
    const channelName = `meet-live-${session.id}`;

    const channel = supabase.channel(channelName, {
      config: { presence: { key: session.id } },
    });

    // 1. Presence tracking
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: any[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.user_id) users.push(p);
          });
        });
        setOnlinePresence(users);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        const names = newPresences.map((p: any) => p.full_name || "Delegate").join(", ");
        toast.info(`${names} joined the Live Session`, { autoClose: 2000 });
      });

    // 2. Broadcast events for synchronized slide/agenda changes & quick alerts
    channel.on("broadcast", { event: "agenda_change" }, ({ payload }) => {
      if (typeof payload?.activeIdx === "number") {
        setActiveAgendaIdx(payload.activeIdx);
        setElapsedSeconds(0);
      }
    });

    channel.on("broadcast", { event: "decision_added" }, ({ payload }) => {
      if (payload?.decision) {
        setDecisions((prev) => [payload.decision, ...prev.filter((d) => d.id !== payload.decision.id)]);
      }
    });

    // 3. Postgres changes: Point updates
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "meet_points",
      },
      (payload) => {
        if (payload.eventType === "UPDATE") {
          setPoints((prev) =>
            prev.map((pt) => (pt.id === payload.new.id ? { ...pt, ...payload.new } : pt))
          );
        } else if (payload.eventType === "INSERT") {
          if (payload.new.origin_session_id === session.id || payload.new.current_session_id === session.id) {
            setPoints((prev) => {
              if (prev.some((p) => p.id === payload.new.id)) return prev;
              return [...prev, payload.new as MeetingPoint];
            });
          }
        }
      }
    );

    // 4. Postgres changes: Attendance updates
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "meet_session_attendees",
        filter: `session_id=eq.${session.id}`,
      },
      (payload) => {
        setAttendees((prev) =>
          prev.map((att) =>
            att.id === payload.new.id || att.user_id === payload.new.user_id
              ? { ...att, ...payload.new }
              : att
          )
        );
      }
    );

    // Track self in presence
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
        if (user) {
          await channel.track({
            user_id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Delegate",
            online_at: new Date().toISOString(),
          });
        }
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.id]);

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
      const nextIdx = activeAgendaIdx + 1;
      setActiveAgendaIdx(nextIdx);
      setElapsedSeconds(0);
      supabaseRef.current.channel(`meet-live-${session.id}`).send({
        type: "broadcast",
        event: "agenda_change",
        payload: { activeIdx: nextIdx },
      });
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
      supabaseRef.current.channel(`meet-live-${session.id}`).send({
        type: "broadcast",
        event: "decision_added",
        payload: { decision: res.decision },
      });
    }
  };

  const [tab, setTab] = useState<"points" | "notes" | "decisions" | "people">("points");

  // Whole-meeting clock (from when it was started)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  const startedAt = (session as any).actual_start ? new Date((session as any).actual_start).getTime() : null;
  const meetingMins = startedAt ? Math.max(0, Math.floor((now - startedAt) / 60000)) : null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const daysLate = (due?: string | null) => {
    if (!due) return 0;
    const d = Math.floor((new Date(todayStr).getTime() - new Date(due.slice(0, 10)).getTime()) / 86400000);
    return d > 0 ? d : 0;
  };
  const isCarried = (pt: MeetingPoint) => pt.is_backup || (pt.carry_forward_count || 0) > 0 || (pt.origin_session_id && pt.origin_session_id !== session.id);
  const carriedPoints = points.filter((p) => isCarried(p));
  const todayPoints = points.filter((p) => !isCarried(p));
  const presentCount = attendees.filter((a) => a.attendance === "present" || a.attendance === "late").length;

  // Format mm:ss
  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const timerStr = `${mins}:${String(secs).padStart(2, "0")}`;

  const teamsHref = videoLink
    ? sanitizeTeamsUrl(videoLink, (attendees || []).map((a) => (a as any).user?.email || a.guest_email).filter(Boolean), session.meeting?.title) || videoLink
    : null;

  const generateLink = async () => {
    try {
      const { generateTeamsMeetingLink } = await import("@/lib/integrations/microsoft-teams");
      const attendeeEmails = (attendees || []).map((a) => (a as any).user?.email || a.guest_email).filter(Boolean) as string[];
      const autoLink = await generateTeamsMeetingLink({
        title: session.meeting?.title || "Meeting",
        meetingCode: session.code,
        scheduledStart: session.scheduled_start,
        scheduledEnd: session.scheduled_end,
        organizerId: session.meeting?.organizer_id,
        organizerEmail: (session.meeting?.organizer as any)?.email,
        attendeeEmails,
        callType: "meeting",
      });
      await updateSessionVideoLink({ sessionId: session.id, videoLink: autoLink });
      setVideoLink(autoLink);
      toast.success("Teams link created");
    } catch (e: any) {
      toast.error(e.message || "Couldn't create the Teams link");
    }
  };

  const statusBtn = (active: boolean, tone: "success" | "warning" | "neutral") =>
    `inline-flex h-8 items-center rounded-md border px-3 text-[12.5px] font-semibold transition-colors ${
      active
        ? tone === "success"
          ? "border-success-border bg-success-soft text-success-text"
          : tone === "warning"
          ? "border-warning-border bg-warning-soft text-warning-text"
          : "border-border bg-sunken text-foreground"
        : "border-border bg-background text-subtle hover:bg-surface-hover"
    }`;

  const PointCard = ({ pt }: { pt: MeetingPoint }) => {
    const late = pt.status !== "closed" ? daysLate(pt.due_date) : 0;
    return (
      <li className={`rounded-xl border bg-surface p-4 ${focusedPoint?.id === pt.id ? "border-primary" : "border-border"}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="text-[14.5px] font-semibold text-heading">
              <button
                type="button"
                onClick={() => setFocusedPointId(pt.id)}
                aria-pressed={focusedPoint?.id === pt.id}
                title="Pick this point for notes and tasks"
                className="rounded text-left hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {pt.title}
              </button>
              {focusedPoint?.id === pt.id && (
                <span className="ml-2 inline-flex rounded-full bg-accent-soft px-2 py-0.5 align-middle text-[11.5px] font-semibold text-accent-soft-text">Notes go here</span>
              )}
            </h4>
            <p className="mt-1 text-[12.5px] text-subtle">
              <span className="font-mono text-muted">{pt.code}</span> · {pt.owner?.full_name || "No owner"}
              {pt.due_date ? ` · due ${new Date(pt.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
              {(pt.carry_forward_count || 0) > 0 ? ` · carried ${pt.carry_forward_count}×` : ""}
            </p>
          </div>
          {late > 0 && <span className="shrink-0 rounded-full bg-danger-soft px-2.5 py-0.5 text-[12px] font-semibold text-danger-text">late {late} d</span>}
          {pt.status === "closed" && <span className="shrink-0 rounded-full bg-success-soft px-2.5 py-0.5 text-[12px] font-semibold text-success-text">Done</span>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => handleStatusChange(pt.id, "closed")} className={statusBtn(pt.status === "closed", "success")}>
            <Check className="mr-1 h-3.5 w-3.5" aria-hidden /> Done
          </button>
          <button type="button" onClick={() => handleStatusChange(pt.id, "in_progress")} className={statusBtn(pt.status === "in_progress", "warning")}>
            Still open
          </button>
          <button type="button" onClick={() => handleStatusChange(pt.id, "on_hold")} className={statusBtn(pt.status === "on_hold", "neutral")}>
            On hold
          </button>
          <Link href={`/meet/points/${pt.id}`} target="_blank" className="inline-flex h-8 items-center rounded-md px-2 text-[12.5px] font-semibold text-subtle hover:text-foreground">
            New date
          </Link>
          <button type="button" onClick={() => setTaskModalPoint(pt)} className="ml-auto inline-flex h-8 items-center gap-1 text-[12.5px] font-semibold text-primary hover:underline">
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add task
          </button>
        </div>
      </li>
    );
  };

  // Agenda and attendance: right-hand panel on desktop, "Agenda & people" tab on smaller screens
  const sidePanel = (
    <>
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Agenda</h2>
          <ol className="space-y-1.5">
            {agenda.map((item, idx) => {
              const active = idx === activeAgendaIdx;
              const done = idx < activeAgendaIdx;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAgendaIdx(idx);
                      setElapsedSeconds(0);
                    }}
                    aria-current={active ? "step" : undefined}
                    className={`flex w-full items-start gap-2 rounded-lg p-2.5 text-left text-[13px] ${
                      active ? "bg-accent-soft font-semibold text-accent-soft-text" : done ? "text-muted line-through decoration-muted/50" : "text-foreground hover:bg-surface-hover"
                    }`}
                  >
                    <span className="w-4 shrink-0 font-mono">{idx + 1}</span>
                    <span className="min-w-0 flex-1">{item.title}</span>
                    <span className="shrink-0 text-[12px] font-normal">
                      {active ? `${mins} / ${item.planned_minutes}` : item.planned_minutes} min
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <AppButton
            variant="outline"
            size="sm"
            onClick={handleNextAgenda}
            disabled={activeAgendaIdx >= agenda.length - 1}
            rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
            className="mt-2 w-full"
          >
            Next item
          </AppButton>

          <h2 className="mb-2 mt-6 flex items-center justify-between text-[12px] font-semibold uppercase tracking-wide text-muted">
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" aria-hidden /> People ({attendees.length})</span>
            <span className="font-normal normal-case tracking-normal">tap to change</span>
          </h2>
          <ul className="space-y-1">
            {attendees.map((a) => {
              const name = a.user?.full_name || a.guest_name || "Guest";
              const online = onlinePresence.some((p) => p.user_id === a.user_id);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => handleToggleAttendance(a.id, a.attendance)}
                    className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left hover:bg-surface-hover"
                  >
                    <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-bold text-accent-soft-text">
                      {name.split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                      {online && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-success" aria-label="on this page" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-foreground">{name}</span>
                    <span
                      className={`shrink-0 text-[12px] font-semibold ${
                        a.attendance === "present" ? "text-success-text" : a.attendance === "late" ? "text-warning-text" : "text-danger-text"
                      }`}
                    >
                      {a.attendance === "present" ? "Present" : a.attendance === "late" ? "Late" : "Absent"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
    </>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background">
      {/* Top bar */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[12px] font-semibold text-success-text">
            <span className="h-2 w-2 animate-pulse rounded-full bg-success" aria-hidden /> In the meeting
          </p>
          <h1 className="truncate text-[17px] font-bold text-heading">{session.meeting?.title}</h1>
          <p className="text-[12.5px] text-subtle">
            {session.code}
            {meetingMins !== null ? ` · ${meetingMins} min elapsed` : ""} · {presentCount} of {attendees.length} here
            {onlinePresence.length > 0 ? ` · ${onlinePresence.length} on this page` : ""}
          </p>
        </div>

        {currentAgenda && (
          <div className="order-3 w-full min-w-0 sm:order-none sm:w-auto sm:flex-1 sm:px-4">
            <p className="truncate text-[13px] text-subtle">
              Agenda {activeAgendaIdx + 1} of {agenda.length}: <strong className="text-foreground">{currentAgenda.title}</strong>
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
                <div
                  className={`h-full rounded-full ${isCriticalOverTime ? "bg-danger" : isOverTime ? "bg-warning" : "bg-primary"}`}
                  style={{ width: `${Math.min(100, (elapsedSeconds / plannedSecs) * 100)}%` }}
                />
              </div>
              <span className={`shrink-0 font-mono text-[12.5px] ${isOverTime ? "font-bold text-warning-text" : "text-subtle"}`}>
                {timerStr} of {currentAgenda.planned_minutes || 15} min
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {teamsHref ? (
            <>
              <a
                href={teamsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#4B53BC] px-3.5 text-[13px] font-semibold text-white hover:bg-[#3C4299]"
              >
                <Video className="h-4 w-4" aria-hidden /> Open Teams <ExternalLink className="h-3 w-3 opacity-80" aria-hidden />
              </a>
              <button
                type="button"
                onClick={() => {
                  setVideoLinkInput(videoLink);
                  setShowVideoModal(true);
                }}
                aria-label="Change the video link"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground"
              >
                <Settings className="h-4 w-4" aria-hidden />
              </button>
            </>
          ) : (
            <button type="button" onClick={generateLink} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[13px] font-semibold text-foreground hover:bg-surface-hover">
              <Video className="h-4 w-4 text-primary" aria-hidden /> Create Teams link
            </button>
          )}
          {!isRunning && session.status !== "in_progress" && (
            <AppButton variant="secondary" size="sm" leftIcon={<Play className="h-3 w-3" />} onClick={handleStartSession}>
              Start
            </AppButton>
          )}
          <AppButton variant="primary" size="sm" onClick={() => setEndSessionOpen(true)} className="bg-danger text-white hover:bg-danger/90">
            End meeting
          </AppButton>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-border bg-surface px-4 pt-3">
            <div className="mb-3">
              <QuickPointCapture
                meetingId={session.meeting_id}
                sessionId={session.id}
                users={masters.users}
                categories={masters.categories}
                onPointCreated={handlePointCreated}
              />
            </div>
            <nav role="tablist" aria-label="Meeting sections" className="flex gap-1 overflow-x-auto">
              {([
                { id: "points", label: `Points (${points.length})` },
                { id: "notes", label: "Notes" },
                { id: "decisions", label: `Decisions (${decisions.length})` },
                { id: "people", label: "Agenda & people" },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 pb-2.5 text-[13.5px] font-semibold ${t.id === "people" ? "lg:hidden " : ""}${
                    tab === t.id ? "border-primary text-foreground" : "border-transparent text-subtle hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {tab === "points" && (
              <div className="space-y-5">
                <section aria-labelledby="carried-h">
                  <h3 id="carried-h" className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-subtle">
                    <RotateCcw className="h-3.5 w-3.5 text-warning-text" aria-hidden /> Carried from last time ({carriedPoints.length})
                  </h3>
                  {carriedPoints.length === 0 ? (
                    <p className="text-[13.5px] text-muted">Nothing carried forward.</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {carriedPoints.map((pt) => (
                        <PointCard key={pt.id} pt={pt} />
                      ))}
                    </ul>
                  )}
                </section>
                <section aria-labelledby="today-h">
                  <h3 id="today-h" className="mb-2 text-[13px] font-semibold text-subtle">Raised today ({todayPoints.length})</h3>
                  {todayPoints.length === 0 ? (
                    <p className="text-[13.5px] text-muted">Type a point in the box above and press Enter.</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {todayPoints.map((pt) => (
                        <PointCard key={pt.id} pt={pt} />
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}

            {tab === "notes" && (
              <RunningNotesCard
                sessionId={session.id}
                focusedPointId={focusedPoint?.id}
                focusedPointCode={focusedPoint?.code}
                onOpenConvert={() => {
                  if (focusedPoint) setTaskModalPoint(focusedPoint);
                }}
              />
            )}

            {tab === "people" && <div className="max-w-xl lg:hidden">{sidePanel}</div>}

            {tab === "decisions" && (
              <div className="max-w-2xl space-y-3">
                <form onSubmit={handleRecordQuickDecision} className="flex gap-2">
                  <input
                    type="text"
                    value={quickDecisionText}
                    onChange={(e) => setQuickDecisionText(e.target.value)}
                    placeholder="What was decided?"
                    aria-label="New decision"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!quickDecisionText.trim()}
                    className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-[14px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                  >
                    Record
                  </button>
                </form>
                {decisions.length === 0 ? (
                  <p className="text-[13.5px] text-muted">No decisions recorded in this meeting yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {decisions.map((dec) => (
                      <li key={dec.id} className="rounded-lg border border-border bg-surface p-3">
                        <span className="font-mono text-[11.5px] text-muted">{dec.code}</span>
                        <p className="mt-0.5 text-[14px] font-medium text-foreground">{dec.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: agenda + attendance */}
        <aside className="hidden w-80 shrink-0 flex-col overflow-y-auto border-l border-border bg-surface p-4 lg:flex">
          {sidePanel}
        </aside>
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

      {/* Set/Edit Video Call Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <Video className="h-4 w-4 text-emerald-500" />
                <span>Configure Video Call Link</span>
              </div>
              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="p-1 text-muted hover:text-foreground rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVideoLink} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Video Conference URL (Microsoft Teams / Google Meet / In-Portal)
                </label>
                <input
                  type="url"
                  value={videoLinkInput}
                  onChange={(e) => setVideoLinkInput(e.target.value)}
                  placeholder="https://teams.microsoft.com/... or https://meet.google.com/..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const roomName = `session-${session.code.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`;
                    setVideoLinkInput(`https://chandakgroup.tech/meet/live?room=${roomName}`);
                  }}
                  className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Generate In-Portal Room Link</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingVideoLink}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  {savingVideoLink && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Video Link</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Draggable High-Visibility Floating Live Notes Action Widget */}
      <DraggableLiveNotesWidget
        sessionId={session.id}
        focusedPointId={focusedPoint?.id}
        focusedPointCode={focusedPoint?.code}
        onOpenConvert={(block) => {
          if (focusedPoint) setTaskModalPoint(focusedPoint);
        }}
      />
    </div>
  );
}
