import { NextResponse } from 'next/server';
import { runFleetComplianceExpiryAuditAction } from '@/lib/actions/vehicle';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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
