import { NextResponse } from 'next/server';
import { fetchWorkspaceDashboardData } from '@/lib/actions/workspaces';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await fetchWorkspaceDashboardData();
    return NextResponse.json({ success: true, workspacesCount: data.workspaces.length });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message, 
      stack: error.stack 
    });
  }
}
