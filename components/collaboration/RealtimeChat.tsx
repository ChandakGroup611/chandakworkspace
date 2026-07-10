"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { performanceGovernor, DegradationStage } from '@/utils/performance/PerformanceGovernanceEngine';

export function RealtimeChat({ recordId, moduleType }: { recordId: string, moduleType: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const supabase = createClient();

  const [degradationStage, setDegradationStage] = useState<DegradationStage>(DegradationStage.STAGE_0_NORMAL);

  useEffect(() => {
    const unsubscribe = performanceGovernor.subscribeToStageChanges((stage) => {
      setDegradationStage(stage);
    });
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    // If Stage 3+, we completely pause realtime listen
    if (degradationStage >= DegradationStage.STAGE_3_SEVERE) return;

    // 1. Fetch initial activity events (Audit logs & chats combined)
    async function loadHistory() {
      const { data } = await supabase
        .from('activity_events')
        .select('*, performed_by(full_name, profile_photo)')
        .eq('record_id', recordId)
        .eq('module_type', moduleType)
        .order('performed_at', { ascending: true });
      if (data) setMessages(data);
    }
    loadHistory();

    // 2. Realtime listener for optimistic UI updates (Debounced/Scoped)
    const channel = supabase.channel(`realtime_${moduleType}_${recordId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'activity_events',
        filter: `record_id=eq.${recordId}`
      }, payload => {
        // Optimistically add to UI if it's a new event
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recordId, moduleType, supabase, degradationStage]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const content = input.trim();
    setInput("");

    // Call server action or direct insert (if RLS allows)
    // Assuming we insert directly for optimistic speed
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('activity_events').insert({
      module_type: moduleType,
      record_id: recordId,
      event_type: 'CHAT',
      new_value: { content },
      performed_by: user.id
    });
  }

  return (
    <div className="flex flex-col h-full relative">
      {degradationStage >= DegradationStage.STAGE_1_MILD && (
        <div className="bg-amber-900/30 text-amber-500 text-[10px] uppercase font-bold py-1 px-3 text-center border-b border-amber-500/20">
          Governance: Presence & Typing Indicators Paused
        </div>
      )}
      {degradationStage >= DegradationStage.STAGE_3_SEVERE && (
        <div className="bg-red-900/30 text-red-500 text-[10px] uppercase font-bold py-1 px-3 text-center border-b border-red-500/20">
          Governance: Live Chat Stream Paused. Force Refresh to load new.
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
        {messages.map((msg, i) => {
          const isChat = msg.event_type === 'CHAT' || msg.event_type === 'COMMENT';
          return (
            <div key={msg.id || i} className={`text-sm ${isChat ? 'bg-indigo-900/30 border-accent/30' : 'bg-gray-800/40 border-gray-600/30'} border rounded-xl p-3 max-w-[85%] ${isChat ? 'self-end' : 'self-start'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-xs text-gray-300">
                  {msg.performed_by?.full_name || 'System User'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(msg.performed_at).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-gray-200">
                {isChat ? msg.new_value?.content : (
                  <span className="text-gray-400 italic">
                    Changed {msg.event_type} from {JSON.stringify(msg.old_value)} to {JSON.stringify(msg.new_value)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <form onSubmit={handleSend} className="p-3 bg-gray-900 border-t border-white/5 flex gap-2">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message or @mention someone..."
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-accent"
        />
        <button type="submit" className="bg-accent hover:bg-accent-secondary text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          Send
        </button>
      </form>
    </div>
  );
}
