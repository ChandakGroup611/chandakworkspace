"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageCircle, ActivitySquare, Clock } from "lucide-react";

// Dynamically import heavy modules so they don't block initial SSR or JS bundle
const TaskRealtimeChat = dynamic(() => import("@/components/tasks/TaskRealtimeChat"), { 
  ssr: false, 
  loading: () => <div className="p-6 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-white/[0.02] animate-pulse h-96 flex items-center justify-center text-gray-400 text-xs font-bold">Loading Realtime Communications...</div> 
});

const TaskActivityTimeline = dynamic(() => import("@/components/tasks/TaskActivityTimeline"), { 
  loading: () => <div className="p-6 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-white/[0.02] animate-pulse h-96 flex items-center justify-center text-gray-400 text-xs font-bold">Loading Relational Timeline...</div> 
});

const TaskTimeLogs = dynamic(() => import("@/components/tasks/TaskTimeLogs"), { 
  loading: () => <div className="p-6 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-white/[0.02] animate-pulse h-96 flex items-center justify-center text-gray-400 text-xs font-bold">Loading Time Logs...</div> 
});

export default function TaskRightPanel({ taskId }: { taskId: string }) {
  const [activeTab, setActiveTab] = useState("none"); // Default to no heavy module loaded
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (activeTab !== "none" && panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setActiveTab("none");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeTab]);

  return (
    <div className="h-full" ref={panelRef}>
      <div className="h-full rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/80 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300 dark:hover:shadow-blue-500/20 dark:hover:border-blue-500/40">
        <Tabs defaultValue="none" onValueChange={setActiveTab} value={activeTab} className="flex flex-col h-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="chat" className="text-xs font-bold gap-1.5 px-1">
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs font-bold gap-1.5 px-1">
              <ActivitySquare className="h-3.5 w-3.5" />
              Audit
            </TabsTrigger>
            <TabsTrigger value="time" className="text-xs font-bold gap-1.5 px-1">
              <Clock className="h-3.5 w-3.5" />
              Time
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="none">
            <div className="text-center py-12 text-xs text-gray-500 font-bold border rounded-xl mt-4 dark:border-white/5">
              Select a tab to load heavy modules.
            </div>
          </TabsContent>
          <TabsContent value="chat" className="mt-4">
            {activeTab === "chat" && <TaskRealtimeChat taskId={taskId} />}
          </TabsContent>
          <TabsContent value="timeline" className="mt-4">
            {activeTab === "timeline" && <TaskActivityTimeline taskId={taskId} />}
          </TabsContent>
          <TabsContent value="time" className="mt-4">
            {activeTab === "time" && <TaskTimeLogs taskId={taskId} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
