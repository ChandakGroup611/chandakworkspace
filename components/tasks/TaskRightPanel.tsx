"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageCircle, ActivitySquare, Clock } from "lucide-react";

// Dynamically import heavy modules so they don't block initial SSR or JS bundle
const TaskRealtimeChat = dynamic(() => import("@/components/tasks/TaskRealtimeChat"), { 
  ssr: false, 
  loading: () => <div className="p-6 rounded-xl border-gray-100 bg-gray-50/50 dark:border-white/5 dark:theme-card-structural /[0.02] animate-pulse h-96 flex items-center justify-center text-gray-400 text-xs font-bold">Loading Realtime Communications...</div> 
});

const TaskActivityTimeline = dynamic(() => import("@/components/tasks/TaskActivityTimeline"), { 
  loading: () => <div className="p-6 rounded-xl border-gray-100 bg-gray-50/50 dark:border-white/5 dark:theme-card-structural /[0.02] animate-pulse h-96 flex items-center justify-center text-gray-400 text-xs font-bold">Loading Relational Timeline...</div> 
});

const TaskTimeLogs = dynamic(() => import("@/components/tasks/TaskTimeLogs"), { 
  loading: () => <div className="p-6 rounded-xl border-gray-100 bg-gray-50/50 dark:border-white/5 dark:theme-card-structural /[0.02] animate-pulse h-96 flex items-center justify-center text-gray-400 text-xs font-bold">Loading Time Logs...</div> 
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
      <div className="h-full min-h-0 flex flex-col rounded-2xl p-4 theme-card-structural border-transparent transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:border-accent/30 dark:hover:shadow-blue-500/20 dark:hover:border-accent/40">
        <Tabs defaultValue="none" onValueChange={setActiveTab} value={activeTab} className="flex flex-col h-full min-h-0">
          
          <TabsList className="w-full flex flex-wrap gap-2 bg-transparent p-0 h-auto">
            <TabsTrigger value="tags" className="py-2 px-3 text-xs font-bold rounded-xl border border-gray-200 data-[state=active]:bg-accent data-[state=active]:text-white">Tags</TabsTrigger>
            <TabsTrigger value="links" className="py-2 px-3 text-xs font-bold rounded-xl border border-gray-200 data-[state=active]:bg-accent data-[state=active]:text-white">Links</TabsTrigger>
            <TabsTrigger value="checklist" className="py-2 px-3 text-xs font-bold rounded-xl border border-gray-200 data-[state=active]:bg-accent data-[state=active]:text-white">Checklist</TabsTrigger>
            <TabsTrigger value="attachment" className="py-2 px-3 text-xs font-bold rounded-xl border border-gray-200 data-[state=active]:bg-accent data-[state=active]:text-white">Attachment</TabsTrigger>
            <TabsTrigger value="chat" className="py-2 px-3 text-xs font-bold rounded-xl border border-gray-200 data-[state=active]:bg-accent data-[state=active]:text-white">
              Chat
            </TabsTrigger>
            <TabsTrigger value="timeline" className="py-2 px-3 text-xs font-bold rounded-xl border border-gray-200 data-[state=active]:bg-accent data-[state=active]:text-white">
              Audit
            </TabsTrigger>
            <TabsTrigger value="time" className="py-2 px-3 text-xs font-bold rounded-xl border border-gray-200 data-[state=active]:bg-accent data-[state=active]:text-white">
              Time
            </TabsTrigger>
          </TabsList>

          
          <TabsContent value="none" className="m-0">
            <div className="text-center py-4 text-xs text-gray-500 font-bold rounded-xl mt-4 dark:border-white/5 bg-gray-50/50 dark:theme-card-structural /[0.02]">
              Select a tab to view task Logs
            </div>
          </TabsContent>
          
          <TabsContent value="tags" className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2">
            <div className="text-center py-8 text-sm text-gray-500 font-bold border border-dashed border-gray-200 rounded-xl">Tags integration coming soon</div>
          </TabsContent>
          <TabsContent value="links" className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2">
            <div className="text-center py-8 text-sm text-gray-500 font-bold border border-dashed border-gray-200 rounded-xl">Links integration coming soon</div>
          </TabsContent>
          <TabsContent value="checklist" className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2">
            <div className="text-center py-8 text-sm text-gray-500 font-bold border border-dashed border-gray-200 rounded-xl">Checklist integration coming soon</div>
          </TabsContent>
          <TabsContent value="attachment" className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2">
            <div className="text-center py-8 text-sm text-gray-500 font-bold border border-dashed border-gray-200 rounded-xl">Attachments integration coming soon</div>
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
