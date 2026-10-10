import { NextResponse } from 'next/server';

const SERVER_BOOT_TIME = new Date().toISOString();

export async function GET() {
  return NextResponse.json(
    {
      status: 'online',
      serverBootTime: SERVER_BOOT_TIME,
      version: '2.4.0',
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
