import { NextResponse } from 'next/server';
import { handleMentions, markMentionsReadForTask } from '@/lib/actions/notifications';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { _action } = body;

    if (_action === 'mark_read') {
      const { taskId } = body;
      if (!taskId) return NextResponse.json({ ok: false, error: 'missing_taskId' }, { status: 400 });
      await markMentionsReadForTask(taskId);
      return NextResponse.json({ ok: true });
    }

    const { taskId, ticketId, messageId, mentionedUserIds, isAll, senderId, entityType } = body;
    const resolvedId = taskId || ticketId;
    const resolvedType = entityType || (ticketId ? 'ticket' : 'task');

    if (!resolvedId || !messageId || !senderId) return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });

    await handleMentions(resolvedId, messageId, mentionedUserIds, isAll, senderId, resolvedType);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Mentions route error', e);
    return NextResponse.json({ ok: false, error: e.message || 'unknown' }, { status: 500 });
  }
}
