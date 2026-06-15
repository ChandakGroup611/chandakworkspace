import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
    dbUrl: process.env.DATABASE_URL ? 'SET' : 'NOT_SET'
  });
}
