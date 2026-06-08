import { NextResponse } from 'next/server';
import { fetchWorkspaceDashboardData } from '@/lib/actions/workspaces';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const start = Date.now();
    
    const data = await fetchWorkspaceDashboardData(null);
    
    const execTime = Date.now() - start;
    const jsonString = JSON.stringify(data);
    const sizeKb = Buffer.byteLength(jsonString, 'utf8') / 1024;
    
    const summary = {
      executionTimeMs: execTime,
      totalSizeKb: sizeKb.toFixed(2),
      counts: {
        workspaces: data.workspaces?.length || 0,
        hierarchyRoots: data.masterHierarchy?.length || 0,
        tasks: data.prefetchTasks?.length || 0,
        stakeholders: data.prefetchStakeholders?.length || 0,
        users: data.allUsers?.length || 0,
      }
    };
    
    return NextResponse.json(summary);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
