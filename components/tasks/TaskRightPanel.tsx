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
    <div className="h-full min-h-0" ref={panelRef}>
      <div className="h-full min-h-0 flex flex-col rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/80 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300 dark:hover:shadow-blue-500/20 dark:hover:border-blue-500/40">
        <Tabs defaultValue="none" onValueChange={setActiveTab} value={activeTab} className="flex flex-col h-full min-h-0">
          <TabsList className="w-full grid grid-cols-3 shrink-0 gap-2 bg-transparent p-0 h-auto">
            <TabsTrigger 
              value="chat" 
              className="py-2.5 text-xs font-bold gap-1.5 px-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=active]:shadow-md dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white dark:data-[state=active]:border-blue-600 transition-all"
            >
              <MessageCircle className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger 
              value="timeline" 
              className="py-2.5 text-xs font-bold gap-1.5 px-2 rounded-xl border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-purple-600 data-[state=active]:shadow-md dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20 dark:data-[state=active]:bg-purple-600 dark:data-[state=active]:text-white dark:data-[state=active]:border-purple-600 transition-all"
            >
              <ActivitySquare className="h-4 w-4" />
              Audit
            </TabsTrigger>
            <TabsTrigger 
              value="time" 
              className="py-2.5 text-xs font-bold gap-1.5 px-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:border-emerald-600 data-[state=active]:shadow-md dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 dark:data-[state=active]:bg-emerald-600 dark:data-[state=active]:text-white dark:data-[state=active]:border-emerald-600 transition-all"
            >
              <Clock className="h-4 w-4" />
              Time
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="none" className="m-0">
            <div className="text-center py-4 text-xs text-gray-500 font-bold border rounded-xl mt-4 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
              Select a tab to view task Logs
            </div>
          </TabsContent>
          <TabsContent value="chat" className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2">
            {activeTab === "chat" && <TaskRealtimeChat taskId={taskId} />}
          </TabsContent>
          <TabsContent value="timeline" className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2">
            {activeTab === "timeline" && <TaskActivityTimeline taskId={taskId} />}
          </TabsContent>
          <TabsContent value="time" className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2">
            {activeTab === "time" && <TaskTimeLogs taskId={taskId} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
