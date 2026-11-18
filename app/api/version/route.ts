import { NextResponse } from 'next/server';

const SERVER_BOOT_TIME = new Date().toISOString();
const COMMIT_SHA = process.env.GIT_COMMIT || process.env.NEXT_PUBLIC_GIT_COMMIT || 'unknown';

export async function GET() {
  return NextResponse.json(
    {
      status: 'online',
      serverBootTime: SERVER_BOOT_TIME,
      version: '2.4.0',
      commit: COMMIT_SHA,
      timestamp: Date.now()
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache'
      }
    }
  );
}
