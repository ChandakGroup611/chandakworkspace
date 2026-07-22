import { NextResponse } from 'next/server';
import { getTaskDetails } from '@/lib/actions/tasks';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || '90e4b60e-c5fc-4970-a237-56c20f053e58';
  
  try {
    const task = await getTaskDetails(id);
    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, stack: error.stack });
  }
}
