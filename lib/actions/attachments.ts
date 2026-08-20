"use server";

import { createClient as createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/service_role";

const BLOCKED_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".sh", ".vbs", ".js", ".scr", 
  ".msi", ".dll", ".com", ".pif", ".jar", ".apk", ".bin", ".wsf"
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function resolveMimeFromExtension(fileName: string, clientMime?: string): string {
  if (clientMime && clientMime !== 'application/octet-stream' && clientMime !== '') {
    return clientMime;
  }
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    csv: 'text/csv',
    txt: 'text/plain',
    log: 'text/plain',
    json: 'application/json',
    xml: 'application/xml',
    html: 'text/html',
    htm: 'text/html',
    md: 'text/markdown',
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
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav'
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * Validates file security parameters
 */
function validateFileSecurity(fileName: string, mimeType: string, fileSize: number) {
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error("File exceeds maximum allowed size (100MB).");
  }

  const lowerName = fileName.toLowerCase();
  for (const ext of BLOCKED_EXTENSIONS) {
    if (lowerName.endsWith(ext)) {
      throw new Error(`Executable/script files (${ext}) are strictly prohibited for security.`);
    }
  }
}

/**
 * Prepares an upload request, registers in DB, and returns a signed upload URL
 */
export async function initializeAttachmentUpload(payload: {
  module_type: 'ticket' | 'chat' | 'resolution' | 'requirement' | 'task';
  record_id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthenticated.");

  const sanitizedMime = resolveMimeFromExtension(payload.file_name, payload.mime_type);
  validateFileSecurity(payload.file_name, sanitizedMime, payload.file_size);

  const bucketName = payload.module_type === 'chat' ? 'chat-attachments' 
                   : payload.module_type === 'resolution' ? 'resolution-files' 
                   : payload.module_type === 'requirement' ? 'requirement-files'
                   : 'ticket-attachments';

  // Generate unique storage path
  const cleanName = payload.file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${payload.record_id}/${Date.now()}_${cleanName}`;

  // Insert DB record using Service Role to ensure it succeeds safely
  const { data: attachmentRecord, error: dbError } = await supabaseAdmin
    .from('attachments')
    .insert({
      module_type: payload.module_type,
      record_id: payload.record_id,
      file_name: storagePath,
      original_file_name: payload.file_name,
      mime_type: sanitizedMime,
      file_size: payload.file_size,
      storage_path: storagePath,
      uploaded_by: user.id
    })
    .select()
    .single();

  if (dbError) {
    console.error("DB Error initializing attachment:", dbError);
    throw new Error(`Failed to register attachment: ${dbError.message}`);
  }

  // Generate signed upload URL using Service Role
  const { data: signedUploadUrl, error: storageError } = await supabaseAdmin
    .storage
    .from(bucketName)
    .createSignedUploadUrl(storagePath);

  if (storageError) {
    console.error("Storage Error generating upload URL:", storageError);
    await supabaseAdmin.from('attachments').delete().eq('id', attachmentRecord.id);
    throw new Error(`Failed to generate upload URL: ${storageError.message}`);
  }

  return {
    attachment_id: attachmentRecord.id,
    signed_url: signedUploadUrl.signedUrl,
    token: signedUploadUrl.token,
    path: storagePath
  };
}

/**
 * Generates a signed download URL for an existing attachment
 */
export async function getAttachmentDownloadUrl(attachmentId: string, forceDownload: boolean = false) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthenticated.");

  const { data: attachment, error: fetchError } = await supabaseAdmin
    .from('attachments')
    .select('*')
    .eq('id', attachmentId)
    .eq('is_deleted', false)
    .single();

  if (fetchError || !attachment) {
    // Check fallback in legacy tables
    const { data: taskAtt } = await supabaseAdmin.from('task_attachments').select('*').eq('id', attachmentId).single();
    if (taskAtt) {
      const proxyUrl = forceDownload 
        ? `/api/proxy-attachment/${attachmentId}?download=1` 
        : `/api/proxy-attachment/${attachmentId}`;
      return {
        signedUrl: proxyUrl,
        proxyUrl,
        directSignedUrl: taskAtt.file_url || proxyUrl,
        fileName: taskAtt.file_name,
        mimeType: taskAtt.file_type || resolveMimeFromExtension(taskAtt.file_name)
      };
    }

    const { data: ticketAtt } = await supabaseAdmin.from('ticket_attachments').select('*').eq('id', attachmentId).single();
    if (ticketAtt) {
      const proxyUrl = forceDownload 
        ? `/api/proxy-attachment/${attachmentId}?download=1` 
        : `/api/proxy-attachment/${attachmentId}`;
      return {
        signedUrl: proxyUrl,
        proxyUrl,
        directSignedUrl: ticketAtt.file_url || proxyUrl,
        fileName: ticketAtt.file_name,
        mimeType: ticketAtt.file_type || resolveMimeFromExtension(ticketAtt.file_name)
      };
    }

    throw new Error("Attachment not found or deleted.");
  }

  const bucketName = attachment.module_type === 'chat' ? 'chat-attachments' 
                   : attachment.module_type === 'resolution' ? 'resolution-files' 
                   : attachment.module_type === 'requirement' ? 'requirement-files'
                   : 'ticket-attachments';

  const options = forceDownload ? { download: attachment.original_file_name || attachment.file_name } : undefined;

  const { data: signedUrl } = await supabaseAdmin
    .storage
    .from(bucketName)
    .createSignedUrl(attachment.storage_path, 60 * 60, options);

  const proxyUrl = forceDownload 
    ? `/api/proxy-attachment/${attachmentId}?download=1` 
    : `/api/proxy-attachment/${attachmentId}`;

  return { 
    signedUrl: proxyUrl,
    proxyUrl,
    directSignedUrl: signedUrl?.signedUrl || proxyUrl,
    fileName: attachment.original_file_name || attachment.file_name,
    mimeType: attachment.mime_type
  };
}

/**
 * Fetches attachments for a given module and record, bypassing RLS and supporting dual IDs (UUID & Code).
 */
export async function fetchAttachments(moduleType: string, recordId: string, _timestamp?: number) {
  if (!recordId) return [];

  const candidateIds = new Set<string>([recordId]);

  try {
    if (moduleType === 'ticket') {
      const { data: t } = await supabaseAdmin
        .from('tickets')
        .select('id, code')
        .or(`id.eq.${recordId},code.eq.${recordId}`)
        .limit(1)
        .maybeSingle();
      if (t && t.id) candidateIds.add(t.id);
    } else if (moduleType === 'requirement') {
      const { data: r } = await supabaseAdmin
        .from('requirements')
        .select('id, code')
        .or(`id.eq.${recordId},code.eq.${recordId}`)
        .limit(1)
        .maybeSingle();
      if (r && r.id) candidateIds.add(r.id);
    } else if (moduleType === 'task') {
      const { data: tk } = await supabaseAdmin
        .from('tasks')
        .select('id, task_code')
        .or(`id.eq.${recordId},task_code.eq.${recordId}`)
        .limit(1)
        .maybeSingle();
      if (tk && tk.id) candidateIds.add(tk.id);
    }
  } catch (e) {
    console.error("[Attachments] Candidate ID resolution:", e);
  }

  // Filter out any non-UUID values from candidateIds to prevent Postgres 22P02 errors
  const isValidUUID = (uuid: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
  const idsArray = Array.from(candidateIds).filter(isValidUUID);

  const { data: unifiedData } = await supabaseAdmin
    .from('attachments')
    .select('*')
    .eq('module_type', moduleType)
    .in('record_id', idsArray)
    .eq('is_deleted', false)
    .order('uploaded_at', { ascending: false });

  let results: any[] = unifiedData ? [...unifiedData] : [];

  // Module-specific fallback for tickets and tasks
  if (moduleType === 'ticket') {
    const { data: ticketAtts } = await supabaseAdmin
      .from('ticket_attachments')
      .select('*')
      .in('ticket_id', idsArray);
    if (ticketAtts && ticketAtts.length > 0) {
      ticketAtts.forEach(ta => {
        if (!results.some(r => r.id === ta.id || r.file_name === ta.file_name)) {
          results.push({
            id: ta.id,
            module_type: 'ticket',
            record_id: ta.ticket_id,
            file_name: ta.file_name,
            original_file_name: ta.file_name,
            mime_type: ta.file_type || resolveMimeFromExtension(ta.file_name),
            file_size: ta.file_size || 0,
            storage_path: ta.file_url,
            uploaded_at: ta.created_at
          });
        }
      });
    }
  } else if (moduleType === 'task') {
    const { data: taskAtts } = await supabaseAdmin
      .from('task_attachments')
      .select('*')
      .in('task_id', idsArray);
    if (taskAtts && taskAtts.length > 0) {
      taskAtts.forEach(ta => {
        if (!results.some(r => r.id === ta.id || r.file_name === ta.file_name)) {
          results.push({
            id: ta.id,
            module_type: 'task',
            record_id: ta.task_id,
            file_name: ta.file_name,
            original_file_name: ta.file_name,
            mime_type: ta.file_type || resolveMimeFromExtension(ta.file_name),
            file_size: ta.file_size || 0,
            storage_path: ta.file_url,
            uploaded_at: ta.created_at
          });
        }
      });
    }
  }

  return results;
}
