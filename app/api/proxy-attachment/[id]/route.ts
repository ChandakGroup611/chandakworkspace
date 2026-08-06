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

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id) return new NextResponse('Missing ID', { status: 400 });

    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get('download') === '1' || searchParams.get('download') === 'true' || searchParams.get('action') === 'download';
    const isRaw = searchParams.get('raw') === '1';

    let attachment = null;
    
    // 1. Check unified attachments table first
    let { data: unifiedAtt } = await supabaseAdmin.from('attachments').select('*').eq('id', id).single();
    if (unifiedAtt && unifiedAtt.storage_path) {
      attachment = {
        file_name: unifiedAtt.original_file_name || unifiedAtt.file_name,
        file_url: `storage:${unifiedAtt.module_type === 'ticket' ? 'ticket-attachments' : unifiedAtt.module_type === 'chat' ? 'chat-attachments' : unifiedAtt.module_type === 'requirement' ? 'requirement-files' : unifiedAtt.module_type === 'task' ? 'ticket-attachments' : 'resolution-files'}:${unifiedAtt.storage_path}`,
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
    const ext = (cleanFileName.split('.').pop() || '').toLowerCase();
    const officeExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    const isOfficeDoc = officeExts.includes(ext);

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
        .createSignedUrl(path, 60 * 60 * 4); // 4 hours
        
      if (storageError || !signedUrl) {
         return new NextResponse('Error generating secure URL', { status: 500 });
      }
      fetchUrl = signedUrl.signedUrl;
    }

    // If it's an Office doc and the user clicked View (not Download and not raw), render the embedded web viewer
    if (isOfficeDoc && !isDownload && !isRaw) {
      const htmlViewer = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Document Viewer - ${escapeHtml(cleanFileName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #090d16; color: #f1f5f9; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    header { background: #111827; border-bottom: 1px solid #1f2937; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
    .title-group { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .badge { background: #3b82f6; color: #fff; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .filename { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #f8fafc; }
    .actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; text-decoration: none; transition: all 0.2s; cursor: pointer; border: 1px solid transparent; }
    .btn-primary { background: #2563eb; color: #fff; }
    .btn-primary:hover { background: #1d4ed8; transform: translateY(-1px); }
    .btn-secondary { background: #1e293b; color: #cbd5e1; border-color: #334155; }
    .btn-secondary:hover { background: #334155; color: #fff; }
    .viewer-container { flex: 1; position: relative; width: 100%; height: 100%; background: #030712; }
    iframe { width: 100%; height: 100%; border: none; background: #fff; }
    .loading-notice { position: absolute; top: 16px; left: 50%; transform: translateX(-50%); background: rgba(17, 24, 39, 0.9); border: 1px solid #374151; padding: 6px 14px; border-radius: 20px; font-size: 12px; color: #9ca3af; pointer-events: none; }
  </style>
</head>
<body>
  <header>
    <div class="title-group">
      <span class="badge">${escapeHtml(ext.toUpperCase())}</span>
      <span class="filename" title="${escapeHtml(cleanFileName)}">${escapeHtml(cleanFileName)}</span>
    </div>
    <div class="actions">
      <a href="https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fetchUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" title="Open in Microsoft Office Online">Office 365</a>
      <a href="https://docs.google.com/viewer?url=${encodeURIComponent(fetchUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" title="Open in Google Docs Viewer">Google Viewer</a>
      <a href="/api/proxy-attachment/${id}?download=1" class="btn btn-primary" download="${escapeHtml(cleanFileName)}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download File
      </a>
    </div>
  </header>
  <div class="viewer-container">
    <iframe src="https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fetchUrl)}" id="docFrame" allowfullscreen></iframe>
  </div>
  <script>
    const frame = document.getElementById('docFrame');
    let loaded = false;
    frame.onload = function() { loaded = true; };
    setTimeout(function() {
      if (!loaded) {
        frame.src = "https://docs.google.com/viewer?url=" + encodeURIComponent("${fetchUrl}") + "&embedded=true";
      }
    }, 4500);
  </script>
</body>
</html>`;

      return new NextResponse(htmlViewer, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=1800'
        }
      });
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

