"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Video,
  ArrowRight,
} from "lucide-react";
import { StatusBadge } from "@/components/meet/StatusBadge";
import { AppButton } from "@/components/ui/AppButton";

interface MeetCalendarClientProps {
  sessions: any[];
}

export default function MeetCalendarClient({ sessions }: MeetCalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(
    new Date().toISOString().split("T")[0]
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of month and days count
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay(); // 0=Sun, 1=Mon...

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleString("en-IN", { month: "long", year: "numeric" });

  // Map sessions to dates
  const sessionsByDate: Record<string, any[]> = {};
  for (const s of sessions) {
    const dStr = s.scheduled_start.split("T")[0];
    if (!sessionsByDate[dStr]) sessionsByDate[dStr] = [];
    sessionsByDate[dStr].push(s);
  }

  const selectedSessions = sessionsByDate[selectedDateStr] || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Grid (2 Cols) */}
      <div className="theme-card-structural p-5 lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-heading">{monthName}</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded border border-border hover:bg-sunken text-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                const now = new Date();
                setCurrentDate(now);
                setSelectedDateStr(now.toISOString().split("T")[0]);
              }}
              className="px-2.5 py-1 text-[12px] font-medium border border-border rounded hover:bg-sunken text-subtle"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded border border-border hover:bg-sunken text-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center font-semibold text-[11.5px] uppercase tracking-wider text-muted pb-2 border-b border-border">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells before first day */}
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-20 rounded bg-sunken/20 opacity-40" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const isSelected = dateStr === selectedDateStr;
            const daySessions = sessionsByDate[dateStr] || [];
            const isToday = dateStr === new Date().toISOString().split("T")[0];

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDateStr(dateStr)}
                className={`h-20 p-1.5 text-left rounded-lg border transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-background hover:bg-sunken/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[11.5px] font-medium ${
                      isToday
                        ? "bg-primary text-primary-foreground font-bold"
                        : "text-foreground"
                    }`}
                  >
                    {dayNum}
                  </span>
                  {daySessions.length > 0 && (
                    <span className="text-[10px] font-bold text-primary font-mono">
                      {daySessions.length} mtg
                    </span>
                  )}
                </div>

                <div className="space-y-0.5 max-h-12 overflow-hidden">
                  {daySessions.slice(0, 2).map((s) => (
                    <div
                      key={s.id}
                      className="truncate text-[10px] px-1 py-0.5 rounded font-medium text-white"
                      style={{ backgroundColor: s.meeting?.meeting_type?.color || "#3b82f6" }}
                    >
                      {s.meeting?.title}
                    </div>
                  ))}
                  {daySessions.length > 2 && (
                    <span className="text-[9.5px] text-muted">+{daySessions.length - 2} more</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda (1 Col) */}
      <div className="theme-card-structural p-5 space-y-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Selected Day Agenda
          </span>
          <h3 className="text-[15px] font-semibold text-heading mt-0.5">
            {new Date(selectedDateStr).toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </h3>
        </div>

        {selectedSessions.length === 0 ? (
          <div className="py-8 text-center text-muted">
            <Clock className="mx-auto h-7 w-7 text-muted mb-2" />
            <p className="text-[13px] font-medium text-foreground">No meetings scheduled</p>
            <p className="text-[11.5px] text-muted">Select another day or schedule a session</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedSessions.map((session) => (
              <div
                key={session.id}
                className="rounded-lg border border-border bg-background p-3.5 space-y-2 hover:border-border-active transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10.5px] font-bold text-primary">
                    {session.code}
                  </span>
                  <StatusBadge status={session.status} type="session" />
                </div>

                <h4 className="text-[13.5px] font-semibold text-heading">
                  {session.meeting?.title}
                </h4>

                <div className="text-[11.5px] text-muted space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>
                      {new Date(session.scheduled_start).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {session.room && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      <span>{session.room.name}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <Link href={`/meet/sessions/${session.id}`}>
                    <AppButton variant="outline" size="sm">
                      Workspace
                    </AppButton>
                  </Link>
                  <Link href={`/meet/live/${session.id}`}>
                    <AppButton variant="primary" size="sm" leftIcon={<Video className="h-3 w-3" />}>
                      Live
                    </AppButton>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
