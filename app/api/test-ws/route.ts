import { NextResponse } from 'next/server';
import { getVisibleWorkspaces } from '@/lib/repositories/workspaces';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Missing userId' });
  
  try {
    const data = await getVisibleWorkspaces(userId);
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
