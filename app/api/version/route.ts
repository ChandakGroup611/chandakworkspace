import { NextResponse } from 'next/server';

const SERVER_BOOT_TIME = new Date().toISOString();
const COMMIT_SHA = process.env.GIT_COMMIT || process.env.NEXT_PUBLIC_GIT_COMMIT || 'unknown';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
let SUPABASE_HOST = 'unknown';
try {
  if (SUPABASE_URL) SUPABASE_HOST = new URL(SUPABASE_URL).host;
} catch {}

export async function GET() {
  return NextResponse.json(
    {
      status: 'online',
      serverBootTime: SERVER_BOOT_TIME,
      version: '2.4.1',
      commit: COMMIT_SHA,
      supabaseHost: SUPABASE_HOST,
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
