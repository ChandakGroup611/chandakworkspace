import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cwd: process.cwd(),
    node_version: process.version,
    git_commit: '7268250d',
    build_version: '2026.09.30-quotation-matrix-v3',
    uptime: process.uptime()
  });
}
