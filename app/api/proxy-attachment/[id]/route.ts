import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/service_role';

export const dynamic = 'force-dynamic';

function getMimeType(fileName?: string, providedMime?: string | null): string {
  if (providedMime && providedMime !== 'application/octet-stream' && !providedMime.includes('octet-stream')) {
    return providedMime;
  }
  if (!fileName) return 'application/octet-stream';

  const ext = fileName.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    tiff: 'image/tiff',
    tif: 'image/tiff',
    // Documents
    pdf: 'application/pdf',
    txt: 'text/plain; charset=utf-8',
    csv: 'text/csv; charset=utf-8',
    log: 'text/plain; charset=utf-8',
    json: 'application/json',
    xml: 'application/xml',
    html: 'text/html; charset=utf-8',
    htm: 'text/html; charset=utf-8',
    md: 'text/markdown; charset=utf-8',
    // Office
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Audio / Video
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogv: 'video/ogg',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip'
  };

  return (ext && mimeMap[ext]) || providedMime || 'application/octet-stream';
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id) return new NextResponse('Missing ID', { status: 400 });

    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get('download') === '1' || searchParams.get('download') === 'true' || searchParams.get('action') === 'download';

    let attachment = null;
    
    // 1. Check unified attachments table first
    let { data: unifiedAtt } = await supabaseAdmin.from('attachments').select('*').eq('id', id).single();
    if (unifiedAtt && unifiedAtt.storage_path) {
      attachment = {
        file_name: unifiedAtt.original_file_name || unifiedAtt.file_name,
        file_url: `storage:${unifiedAtt.module_type === 'ticket' ? 'ticket-attachments' : unifiedAtt.module_type === 'chat' ? 'chat-attachments' : unifiedAtt.module_type === 'requirement' ? 'requirement-files' : 'resolution-files'}:${unifiedAtt.storage_path}`,
        file_type: unifiedAtt.mime_type
      };
    } else {
      let { data: taskAttachment } = await supabaseAdmin.from('task_attachments').select('*').eq('id', id).single();
      
      if (taskAttachment && taskAttachment.file_url) {
        attachment = taskAttachment;
      } else {
        let { data: ticketAttachment } = await supabaseAdmin.from('ticket_attachments').select('*').eq('id', id).single();
        if (ticketAttachment && ticketAttachment.file_url) {
          attachment = ticketAttachment;
        }
      }
    }
    
    if (!attachment) {
      return new NextResponse('Attachment Not Found', { status: 404 });
    }

    const cleanFileName = (attachment.file_name || 'attachment').replace(/[\r\n"]/g, '_');
    const safeEncodedFileName = encodeURIComponent(cleanFileName);
    const dispositionType = isDownload ? 'attachment' : 'inline';

    let fetchUrl = attachment.file_url;
    
    // Handle base64 Data URLs
    if (fetchUrl.startsWith('data:')) {
      const commaIdx = fetchUrl.indexOf(',');
      if (commaIdx !== -1) {
        const meta = fetchUrl.slice(0, commaIdx);
        const base64Data = fetchUrl.slice(commaIdx + 1);
        const mimeMatch = meta.match(/data:([^;]+)/);
        const detectedMime = mimeMatch ? mimeMatch[1] : null;
        const buffer = Buffer.from(base64Data, 'base64');
        const resolvedMime = getMimeType(attachment.file_name, attachment.file_type || detectedMime);

        const headers = new Headers();
        headers.set('Content-Type', resolvedMime);
        headers.set('Content-Disposition', `${dispositionType}; filename="${cleanFileName}"; filename*=UTF-8''${safeEncodedFileName}`);
        headers.set('Content-Length', buffer.length.toString());
        headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');

        return new NextResponse(buffer, {
          status: 200,
          headers
        });
      }
    }

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

    const resolvedMime = getMimeType(attachment.file_name, attachment.file_type || fileResponse.headers.get('Content-Type'));

    const headers = new Headers();
    headers.set('Content-Type', resolvedMime);
    headers.set('Content-Disposition', `${dispositionType}; filename="${cleanFileName}"; filename*=UTF-8''${safeEncodedFileName}`);
    headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');

    // Stream the file back
    return new NextResponse(fileResponse.body, {
      status: 200,
      headers
    });
  } catch (e: any) {
    return new NextResponse(e.message || 'Internal Server Error', { status: 500 });
  }
}
