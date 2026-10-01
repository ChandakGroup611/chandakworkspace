import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cwd: process.cwd(),
    node_version: process.version,
    git_commit: '0f72cd02',
    build_version: '2026.10.01-module-api-v1',
    uptime: process.uptime()
  });
}
