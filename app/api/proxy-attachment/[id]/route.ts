import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/service_role';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id) return new NextResponse('Missing ID', { status: 400 });

    const { data: attachment, error } = await supabaseAdmin.from('task_attachments').select('*').eq('id', id).single();
    if (error || !attachment || !attachment.file_url) {
      return new NextResponse('Attachment Not Found', { status: 404 });
    }

    const fileResponse = await fetch(attachment.file_url);
    if (!fileResponse.ok) {
      return new NextResponse('Error fetching file from storage', { status: fileResponse.status });
    }

    const headers = new Headers();
    headers.set('Content-Type', fileResponse.headers.get('Content-Type') || 'application/octet-stream');
    headers.set('Content-Disposition', `inline; filename="${attachment.file_name}"`);

    // Stream the file back
    return new NextResponse(fileResponse.body, {
      status: 200,
      headers
    });
  } catch (e: any) {
    return new NextResponse(e.message || 'Internal Server Error', { status: 500 });
  }
}
