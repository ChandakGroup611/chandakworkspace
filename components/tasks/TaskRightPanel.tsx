"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageCircle, ActivitySquare, Clock } from "lucide-react";

// Dynamically import heavy modules so they don't block initial SSR or JS bundle
const TaskRealtimeChat = dynamic(() => import("@/components/tasks/TaskRealtimeChat"), { 
  ssr: false, 
  loading: () => <div className="p-6 rounded-xl border-border/50 bg-surface/50 dark:border-border dark:theme-card-structural /[0.02] animate-pulse h-96 flex items-center justify-center text-muted text-xs font-bold">Loading Realtime Communications...</div> 
});

const TaskActivityTimeline = dynamic(() => import("@/components/tasks/TaskActivityTimeline"), { 
  loading: () => <div className="p-6 rounded-xl border-border/50 bg-surface/50 dark:border-border dark:theme-card-structural /[0.02] animate-pulse h-96 flex items-center justify-center text-muted text-xs font-bold">Loading Relational Timeline...</div> 
});

const TaskTimeLogs = dynamic(() => import("@/components/tasks/TaskTimeLogs"), { 
  loading: () => <div className="p-6 rounded-xl border-border/50 bg-surface/50 dark:border-border dark:theme-card-structural /[0.02] animate-pulse h-96 flex items-center justify-center text-muted text-xs font-bold">Loading Time Logs...</div> 
});

export default function TaskRightPanel({ taskId, onUpdate }: { taskId: string; onUpdate?: () => void }) {
  const [activeTab, setActiveTab] = useState("chat");
  const panelRef = useRef<HTMLDivElement>(null);

  return (
    <div className="h-full min-h-0" ref={panelRef}>
      <div className="h-full min-h-0 flex flex-col rounded-2xl p-4 theme-card-structural border-transparent transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:border-theme-btn-primary/30 dark:hover:shadow-blue-500/20 dark:hover:border-theme-btn-primary/40">
        <Tabs defaultValue="chat" onValueChange={setActiveTab} value={activeTab} className="flex flex-col h-full min-h-0">
          <TabsList className="grid grid-cols-3 theme-card-structural /50 /50 dark: dark:bg-[#0B0F19] rounded-xl p-1 shrink-0">
            <TabsTrigger 
              value="chat" 
              className="text-xs font-semibold py-1.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm flex items-center justify-center gap-1.5 transition-all text-muted hover:text-foreground"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Chat</span>
            </TabsTrigger>
            <TabsTrigger 
              value="timeline" 
              className="text-xs font-semibold py-1.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm flex items-center justify-center gap-1.5 transition-all text-muted hover:text-foreground"
            >
              <ActivitySquare className="w-3.5 h-3.5" />
              <span>History</span>
            </TabsTrigger>
            <TabsTrigger 
              value="time" 
              className="text-xs font-semibold py-1.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm flex items-center justify-center gap-1.5 transition-all text-muted hover:text-foreground"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Logs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2">
            {activeTab === "chat" && <TaskRealtimeChat taskId={taskId} />}
          </TabsContent>
          <TabsContent value="timeline" className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2">
            {activeTab === "timeline" && <TaskActivityTimeline taskId={taskId} />}
          </TabsContent>
          <TabsContent value="time" className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2">
            {activeTab === "time" && <TaskTimeLogs taskId={taskId} onLogAdded={onUpdate} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
