import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/service_role';

export const dynamic = 'force-dynamic';

const MIME_MAP: Record<string, string> = {
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
  gz: 'application/gzip',
  // Engineering CAD & 3D Formats
  dwg: 'application/acad',
  dxf: 'application/dxf',
  step: 'application/step',
  stp: 'application/step',
  stl: 'model/stl',
  ifc: 'application/x-step',
  rvt: 'application/octet-stream'
};

function getMimeType(fileName?: string, providedMime?: string | null): string {
  // 1. Prioritize file extension if fileName is present
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext && MIME_MAP[ext]) {
      return MIME_MAP[ext];
    }
  }

  // 2. Validate provided MIME type (must contain '/' and not be generic octet-stream)
  if (providedMime && providedMime.includes('/') && !providedMime.includes('octet-stream')) {
    return providedMime;
  }

  return 'application/octet-stream';
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

    let attachment: { file_name: string; file_url: string; file_type?: string | null } | null = null;
    
    // Direct storage URL or query param resolution
    const directStorageUrl = searchParams.get('storage_url') || (id.startsWith('storage%3A') || id.startsWith('storage:') ? decodeURIComponent(id) : null);
    if (directStorageUrl && directStorageUrl.startsWith('storage:')) {
      attachment = {
        file_name: searchParams.get('file_name') || 'engineering_document',
        file_url: directStorageUrl,
        file_type: searchParams.get('file_type') || null
      };
    }

    // 1. Check unified attachments table first
    if (!attachment) {
      let { data: unifiedAtt } = await supabaseAdmin.from('attachments').select('*').eq('id', id).single();
      if (unifiedAtt && unifiedAtt.storage_path) {
        attachment = {
          file_name: unifiedAtt.original_file_name || unifiedAtt.file_name,
          file_url: `storage:${unifiedAtt.module_type === 'ticket' ? 'ticket-attachments' : unifiedAtt.module_type === 'chat' ? 'chat-attachments' : unifiedAtt.module_type === 'requirement' ? 'requirement-files' : unifiedAtt.module_type === 'task' ? 'ticket-attachments' : 'resolution-files'}:${unifiedAtt.storage_path}`,
          file_type: unifiedAtt.mime_type
        };
      }
    }

    if (!attachment) {
      let { data: taskAttachment } = await supabaseAdmin.from('task_attachments').select('*').eq('id', id).single();
      if (taskAttachment && taskAttachment.file_url) {
        attachment = taskAttachment;
      }
    }

    if (!attachment) {
      let { data: ticketAttachment } = await supabaseAdmin.from('ticket_attachments').select('*').eq('id', id).single();
      if (ticketAttachment && ticketAttachment.file_url) {
        attachment = ticketAttachment;
      }
    }

    if (!attachment) {
      let { data: vehDoc } = await supabaseAdmin.from('vehicle_documents').select('*').eq('id', id).maybeSingle();
      if (vehDoc && vehDoc.file_url) {
        attachment = {
          file_name: vehDoc.file_name || vehDoc.title || 'vehicle_document.pdf',
          file_url: vehDoc.file_url,
          file_type: vehDoc.file_type || null
        };
      }
    }

    if (!attachment) {
      let { data: drawingDoc } = await supabaseAdmin.from('design_drawings').select('*').eq('id', id).maybeSingle();
      if (drawingDoc && drawingDoc.file_url) {
        attachment = {
          file_name: drawingDoc.file_name || drawingDoc.title || `${drawingDoc.code || 'drawing'}.pdf`,
          file_url: drawingDoc.file_url,
          file_type: drawingDoc.file_type || null
        };
      }
    }

    if (!attachment) {
      try {
        let dmsDoc: any = null;
        // First check if id is a version id
        const { data: dmsVer } = await supabaseAdmin
          .from('dms_document_versions')
          .select('id, file_name, mime_type, storage_key, document_id')
          .eq('id', id)
          .maybeSingle();

        if (dmsVer) {
          dmsDoc = {
            id: dmsVer.id,
            title: dmsVer.file_name,
            original_file_name: dmsVer.file_name,
            mime_type: dmsVer.mime_type,
            storage_key: dmsVer.storage_key
          };
        } else {
          // Check if id is a root document id
          const { data: rootDoc } = await supabaseAdmin
            .from('dms_documents')
            .select('id, title, original_file_name, current_version_no')
            .eq('id', id)
            .maybeSingle();

          if (rootDoc) {
            const { data: latestVer } = await supabaseAdmin
              .from('dms_document_versions')
              .select('id, file_name, mime_type, storage_key')
              .eq('document_id', rootDoc.id)
              .order('version_no', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (latestVer) {
              dmsDoc = {
                id: rootDoc.id,
                title: rootDoc.title,
                original_file_name: rootDoc.original_file_name || latestVer.file_name,
                mime_type: latestVer.mime_type,
                storage_key: latestVer.storage_key
              };
            }
          }
        }

        if (dmsDoc && dmsDoc.storage_key) {
          attachment = {
            file_name: dmsDoc.original_file_name || dmsDoc.title || 'dms_document.pdf',
            file_url: dmsDoc.storage_key,
            file_type: dmsDoc.mime_type || null
          };
        }
      } catch (err) {
        console.warn('Error fetching DMS document in proxy-attachment:', err);
      }
    }

    if (!attachment) {
      // Check if ID matches an attachment inside service_records
      const { data: srvRecords } = await supabaseAdmin
        .from('service_records')
        .select('id, parts_replaced')
        .not('parts_replaced', 'is', null);

      if (srvRecords) {
        for (const sr of srvRecords) {
          const atts = sr.parts_replaced?.attachments;
          if (Array.isArray(atts)) {
            const match = atts.find((a: any) => a.id === id || a.file_name === id);
            if (match && match.file_url) {
              attachment = {
                file_name: match.file_name || 'service_document.pdf',
                file_url: match.file_url,
                file_type: match.file_type || null
              };
              break;
            }
          }
        }
      }
    }

    if (!attachment) {
      // Check if ID matches an attachment inside vehicle_parts
      const { data: partRecords } = await supabaseAdmin
        .from('vehicle_parts')
        .select('id, attachments')
        .not('attachments', 'is', null);

      if (partRecords) {
        for (const pr of partRecords) {
          const atts = pr.attachments;
          if (Array.isArray(atts)) {
            const match = atts.find((a: any) => a.id === id || a.file_name === id);
            if (match && match.file_url) {
              attachment = {
                file_name: match.file_name || 'part_document.pdf',
                file_url: match.file_url,
                file_type: match.file_type || null
              };
              break;
            }
          }
        }
      }
    }

    if (!attachment) {
      // Check if ID matches an insurance policy
      const { data: policyDoc } = await supabaseAdmin
        .from('insurance_policies')
        .select('id, policy_number, policy_document_url, insurer_name')
        .eq('id', id)
        .maybeSingle();

      if (policyDoc && policyDoc.policy_document_url) {
        attachment = {
          file_name: `Insurance_Policy_${policyDoc.policy_number || 'document'}.pdf`,
          file_url: policyDoc.policy_document_url,
          file_type: 'application/pdf'
        };
      }
    }

    if (!attachment) {
      // Check if ID matches a PUC certificate
      const { data: pucDoc } = await supabaseAdmin
        .from('puc_certificates')
        .select('id, certificate_number, document_url')
        .eq('id', id)
        .maybeSingle();

      if (pucDoc && pucDoc.document_url) {
        attachment = {
          file_name: `PUC_${pucDoc.certificate_number || 'certificate'}.pdf`,
          file_url: pucDoc.document_url,
          file_type: 'application/pdf'
        };
      }
    }

    if (!attachment) {
      // Check if ID matches a service entitlement voucher
      const { data: vseDoc } = await supabaseAdmin
        .from('vehicle_service_entitlements')
        .select('id, voucher_number, document_url')
        .eq('id', id)
        .maybeSingle();

      if (vseDoc && vseDoc.document_url) {
        attachment = {
          file_name: `Service_Voucher_${vseDoc.voucher_number || 'voucher'}.pdf`,
          file_url: vseDoc.document_url,
          file_type: 'application/pdf'
        };
      }
    }

    if (!attachment) {
      // Check if ID matches an attachment inside requirements
      const { data: reqWithAtts } = await supabaseAdmin
        .from('requirements')
        .select('id, attachments, custom_fields')
        .not('attachments', 'is', null);

      if (reqWithAtts) {
        for (const req of reqWithAtts) {
          const atts = Array.isArray(req.attachments) ? req.attachments : (Array.isArray(req.custom_fields?.attachments) ? req.custom_fields.attachments : []);
          const match = atts.find((a: any) => a.id === id || a.file_name === id || a.storage_path === id);
          if (match && (match.file_url || match.url || match.storage_path)) {
            attachment = {
              file_name: match.file_name || match.name || 'requirement_document.pdf',
              file_url: match.file_url || match.url || (match.storage_path ? `storage:requirement-files:${match.storage_path}` : ''),
              file_type: match.mime_type || match.file_type || null
            };
            break;
          }
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
        headers.set('Accept-Ranges', 'bytes');
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

