import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/service_role';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id) return new NextResponse('Missing ID', { status: 400 });

    let attachment = null;
    let { data: taskAttachment } = await supabaseAdmin.from('task_attachments').select('*').eq('id', id).single();
    
    if (taskAttachment && taskAttachment.file_url) {
      attachment = taskAttachment;
    } else {
      let { data: ticketAttachment } = await supabaseAdmin.from('ticket_attachments').select('*').eq('id', id).single();
      if (ticketAttachment && ticketAttachment.file_url) {
        attachment = ticketAttachment;
      }
    }

    if (!attachment) {
      return new NextResponse('Attachment Not Found', { status: 404 });
    }

    let fetchUrl = attachment.file_url;
    
    if (fetchUrl.startsWith('storage:')) {
      // Format: storage:bucketName:path
      const parts = fetchUrl.replace('storage:', '').split(':');
      const bucket = parts[0];
      const path = parts.slice(1).join(':');
      
      const { data: signedUrl, error: storageError } = await supabaseAdmin
        .storage
        .from(bucket)
        .createSignedUrl(path, 60);
        
      if (storageError || !signedUrl) {
         return new NextResponse('Error generating secure URL', { status: 500 });
      }
      fetchUrl = signedUrl.signedUrl;
    }

    const fileResponse = await fetch(fetchUrl);
    if (!fileResponse.ok) {
      return new NextResponse('Error fetching file from storage', { status: fileResponse.status });
    }

    const headers = new Headers();
    headers.set('Content-Type', attachment.file_type || fileResponse.headers.get('Content-Type') || 'application/octet-stream');
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
