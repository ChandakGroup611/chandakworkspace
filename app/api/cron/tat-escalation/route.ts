import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/service_role';
import { logActivityEvent } from '@/lib/actions/tasks';

export const dynamic = 'force-dynamic'; // Static generation bypass

export async function GET(request: Request) {
  try {
    // Basic auth check if needed (e.g., verifying Vercel Cron Secret)
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new NextResponse('Unauthorized', { status: 401 });
    // }

    // 1. Fetch pending requirements that might be overdue
    // SLA is 7 days for requirements from creation if not closed or approved
    const { data: rawReqs, error: fetchErr } = await supabaseAdmin
      .from('requirements')
      .select('id, created_at, tat_status, approval_status, current_assignee_id, status:status_master!status_id(status_name, is_closed)')
      .neq('approval_status', 'Approved')
      .neq('tat_status', 'Overdue')
      .eq('is_deleted', false);

    if (fetchErr) throw fetchErr;

    const requirements = (rawReqs || []).filter(r => {
      const s = r.status as any;
      const isClosed = s?.is_closed === true || s?.status_name?.toLowerCase().includes('close');
      return !isClosed;
    });

    if (requirements.length === 0) {
      return NextResponse.json({ success: true, message: 'No requirements to escalate', processed: 0 });
    }

    let escalatedCount = 0;
    const now = new Date();

    for (const req of requirements) {
      const createdDate = new Date(req.created_at);
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const SLA_DAYS = 7; // Configurable SLA

      if (diffDays > SLA_DAYS) {
        // Mark as overdue
        const overdueDays = diffDays - SLA_DAYS;
        await supabaseAdmin
          .from('requirements')
          .update({ 
            tat_status: 'Overdue',
            overdue_days: overdueDays,
            updated_at: new Date().toISOString()
          })
          .eq('id', req.id);

        // Log the escalation
        await logActivityEvent(
          'REQUIREMENT', 
          req.id, 
          'ESCALATION_TRIGGERED', 
          { tat_status: req.tat_status }, 
          { tat_status: 'Overdue', overdue_days: overdueDays }, 
          'SYSTEM'
        );

        // Here we could trigger email notifications using a mail provider (Resend/SendGrid)
        // to req.current_assignee_id's manager.
        
        escalatedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Escalation engine run complete.`, 
      processed: requirements.length,
      escalated: escalatedCount
    });
  } catch (err: any) {
    console.error("TAT Escalation Cron Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
