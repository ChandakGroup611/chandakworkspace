import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/service_role';

export async function POST(req: Request) {
  try {
    if (!supabase) {
      throw new Error("Supabase client not initialized. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are set.");
    }
    const payload = await req.json();

    // The payload comes from a Supabase DB Webhook on the `event_queue` table
    // It usually looks like: { type: 'INSERT', record: { ... } }
    if (payload.type !== 'INSERT') {
      return NextResponse.json({ message: 'Ignored non-insert event' });
    }

    const event = payload.record;

    if (!event || !event.id || event.status !== 'PENDING') {
      return NextResponse.json({ message: 'Ignored invalid or processed event' });
    }

    // 1. Mark as PROCESSING to prevent duplicate workers picking it up
    const { error: lockError } = await supabase
      .from('event_queue')
      .update({ status: 'PROCESSING' })
      .eq('id', event.id)
      .eq('status', 'PENDING');

    if (lockError) {
      // Could be a race condition, meaning another worker grabbed it. Idempotency check.
      return NextResponse.json({ message: 'Event already locked or processed' }, { status: 409 });
    }

    try {
      // 2. Perform the Heavy Fanout Logic
      if (event.event_type.startsWith('TASK_')) {
        // Fetch workspace members
        const { data: members, error: membersError } = await supabase
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', event.workspace_id)
          .eq('is_deleted', false);

        if (membersError) throw membersError;

        if (members && members.length > 0) {
          // Exclude the actor who triggered the event
          const targets = members.filter((m: any) => m.user_id !== event.actor_id);

          if (targets.length > 0) {
            // Bulk insert into notification_queue (this triggers realtime for individuals)
            const insertPayloads = targets.map((m: any) => ({
              entity_type: event.entity_type,
              entity_id: String(event.entity_id),
              module: 'tasks',
              action_type: event.event_type.toLowerCase(),
              actor: 'System', // Would fetch actual actor name if cached
              target_user_id: m.user_id,
              payload: event.payload,
              redirect_url: `/tasks/${event.entity_id}`,
              priority_level: 'MEDIUM',
              is_read: false
            }));

            const { error: insertError } = await supabase
              .from('notification_queue')
              .insert(insertPayloads);

            if (insertError) throw insertError;
          }
        }
      } else if (event.event_type === 'AMC_EXPIRATION_ALERT' || event.event_type === 'AMC_RENEWAL_AUTO_GENERATED') {
        const amcId = event.payload.amc_id;
        const targetUserId = event.payload.assigned_to;
        
        if (targetUserId) {
          const insertPayload = {
            entity_type: 'software_amc',
            entity_id: String(amcId),
            module: 'amc',
            action_type: event.event_type.toLowerCase(),
            actor: 'System',
            target_user_id: targetUserId,
            payload: event.payload,
            redirect_url: `/amc`,
            priority_level: event.event_type === 'AMC_RENEWAL_AUTO_GENERATED' ? 'HIGH' : 'MEDIUM',
            is_read: false
          };

          const { error: insertError } = await supabase
            .from('notification_queue')
            .insert([insertPayload]);

          if (insertError) throw insertError;
        }
      }

      // 3. Mark as COMPLETED
      const updatedPayload = typeof event.payload === 'object' && event.payload !== null 
        ? { ...event.payload, processed_at: new Date().toISOString() } 
        : { raw: event.payload, processed_at: new Date().toISOString() };

      await supabase
        .from('event_queue')
        .update({ 
          status: 'COMPLETED',
          payload: updatedPayload
        })
        .eq('id', event.id);

      return NextResponse.json({ success: true, message: `Event ${event.id} processed` });

    } catch (workerError: any) {
      // 4. Handle Retries / Dead Letter / Backoff
      const currentRetry = (event.payload?.retry_count || 0) + 1;
      const newStatus = currentRetry >= 5 ? 'FAILED' : 'PENDING'; // 5 max retries
      const failPayload = typeof event.payload === 'object' && event.payload !== null
        ? { ...event.payload, retry_count: currentRetry, failed_reason: workerError.message || 'Unknown error' }
        : { raw: event.payload, retry_count: currentRetry, failed_reason: workerError.message || 'Unknown error' };
      
      await supabase
        .from('event_queue')
        .update({ 
          status: newStatus,
          payload: failPayload
        })
        .eq('id', event.id);

      console.error(`[Event Worker] Failed processing ${event.id}:`, workerError);
      return NextResponse.json({ success: false, error: workerError.message }, { status: 500 });
    }

  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
