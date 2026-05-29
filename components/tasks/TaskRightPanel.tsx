"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageCircle, ActivitySquare } from "lucide-react";

// Dynamically import heavy modules so they don't block initial SSR or JS bundle
const TaskRealtimeChat = dynamic(() => import("@/components/tasks/TaskRealtimeChat"), { 
  ssr: false, 
  loading: () => <div className="p-6 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-white/[0.02] animate-pulse h-96 flex items-center justify-center text-gray-400 text-xs font-bold">Loading Realtime Communications...</div> 
});

const TaskActivityTimeline = dynamic(() => import("@/components/tasks/TaskActivityTimeline"), { 
  loading: () => <div className="p-6 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-white/[0.02] animate-pulse h-96 flex items-center justify-center text-gray-400 text-xs font-bold">Loading Relational Timeline...</div> 
});

export default function TaskRightPanel({ taskId }: { taskId: string }) {
  const [activeTab, setActiveTab] = useState("none"); // Default to no heavy module loaded

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
        <Tabs defaultValue="none" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="chat" className="text-xs font-bold gap-2">
              <MessageCircle className="h-4 w-4" />
              Realtime Chat
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs font-bold gap-2">
              <ActivitySquare className="h-4 w-4" />
              Audit Timeline
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
        </Tabs>
      </div>
    </div>
  );
}
