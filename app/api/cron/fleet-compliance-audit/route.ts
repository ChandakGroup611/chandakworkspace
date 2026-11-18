import { NextResponse } from 'next/server';
import { runFleetComplianceExpiryAuditAction } from '@/lib/actions/vehicle';

export const dynamic = 'force-dynamic';

function verifyCronAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: missing or invalid authorization header' },
      { status: 401 }
    );
  }

  try {
    const result = await runFleetComplianceExpiryAuditAction();
    return NextResponse.json({
      success: result.success,
      message: 'Fleet compliance statutory expiry audit completed.',
      auditedVehicles: result.auditedVehicles,
      expiriesDetected: result.expiriesDetected,
      notificationsQueued: result.notificationsQueued
    });
  } catch (err: any) {
    console.error('Fleet Compliance Audit Cron Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
