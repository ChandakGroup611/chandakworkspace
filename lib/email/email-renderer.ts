/**
 * Dynamic HTML Email Template Engine & Renderer
 * Chandak Group Corporate Design Standard
 * 
 * Guarantees responsive, accessible, beautifully formatted HTML emails for all
 * existing and future notification triggers, supporting arbitrary dynamic fields.
 */

export interface EmailDetailField {
  label: string;
  value: string | number | boolean | null | undefined;
}

export interface EmailCardOptions {
  title: string;
  description?: string;
  details?: Record<string, any> | EmailDetailField[];
  actionUrl?: string;
  actionText?: string;
  footerText?: string;
  badge?: {
    text: string;
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  };
}

// Internal fields that should NOT be displayed in dynamic detail callouts
const EXCLUDED_KEYS = new Set([
  'id',
  'entity_id',
  'triggering_user_id',
  'creator_id',
  'user_id',
  'recipient_id',
  'recipient_email',
  'recipient_name',
  'password',
  'token',
  'link',
  'url',
  'redirect_url',
  '_disableemail',
  '_disableinapp',
  'is_sent',
  'created_at',
  'updated_at',
  'is_deleted',
  'deleted_at'
]);

// Friendly human-readable label mapper
const FIELD_LABEL_MAP: Record<string, string> = {
  task_name: 'Task',
  task_title: 'Task',
  ticket_no: 'Ticket #',
  ticket_code: 'Ticket #',
  ticket_title: 'Ticket Title',
  req_code: 'Requirement #',
  req_name: 'Requirement',
  req_title: 'Requirement',
  workspace_name: 'Workspace',
  workspace_code: 'Workspace Code',
  sub_workspace_name: 'Sub-Workspace',
  parent_workspace_name: 'Parent Workspace',
  assigned_to: 'Assigned To',
  assigned_user: 'Assigned To',
  creator_name: 'Created By',
  created_by: 'Created By',
  updated_by: 'Updated By',
  approver_name: 'Approver',
  requester_name: 'Requester',
  due_date: 'Due Date',
  end_date: 'End Date',
  start_date: 'Start Date',
  priority: 'Priority',
  status: 'Status',
  approval_status: 'Approval Status',
  role: 'Role',
  department: 'Department',
  category: 'Category',
  subcategory: 'Subcategory',
  version: 'Version',
  remarks: 'Remarks',
  comment: 'Comment',
  note: 'Note',
  reason: 'Reason'
};

/**
 * Formats arbitrary keys into clean labels (e.g. 'workspace_name' -> 'Workspace Name')
 */
export function formatFieldLabel(key: string): string {
  const lowerKey = key.toLowerCase();
  if (FIELD_LABEL_MAP[lowerKey]) {
    return FIELD_LABEL_MAP[lowerKey];
  }

  // Convert snake_case or camelCase to Capitalized Words
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_\-.]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Converts dynamic input details into an array of clean { label, value } pairs
 */
export function normalizeDetailFields(
  details?: Record<string, any> | EmailDetailField[]
): EmailDetailField[] {
  if (!details) return [];

  if (Array.isArray(details)) {
    return details
      .filter(f => f && f.label && f.value !== undefined && f.value !== null && String(f.value).trim() !== '')
      .map(f => ({
        label: f.label,
        value: String(f.value).trim()
      }));
  }

  const fields: EmailDetailField[] = [];
  for (const [key, value] of Object.entries(details)) {
    const lowerKey = key.toLowerCase();
    if (EXCLUDED_KEYS.has(lowerKey)) continue;
    if (value === undefined || value === null || value === '') continue;

    // Handle nested objects/arrays gracefully
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        if (value.length === 0) continue;
        fields.push({
          label: formatFieldLabel(key),
          value: value.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ')
        });
      } else {
        // Flat inner properties if simple
        if (value.name || value.full_name || value.title || value.code) {
          fields.push({
            label: formatFieldLabel(key),
            value: String(value.full_name || value.name || value.title || value.code)
          });
        }
      }
      continue;
    }

    fields.push({
      label: formatFieldLabel(key),
      value: String(value).trim()
    });
  }

  return fields;
}

/**
 * Determines default action button text based on context or title
 */
export function inferActionText(title: string, actionUrl?: string): string {
  const t = (title || '').toLowerCase();
  const url = (actionUrl || '').toLowerCase();

  if (t.includes('workspace') || url.includes('workspace')) return 'View Workspace';
  if (t.includes('ticket') || url.includes('ticket')) return 'View Ticket';
  if (t.includes('requirement') || url.includes('requirement')) {
    if (t.includes('approval') || t.includes('approve')) return 'Review & Approve';
    if (t.includes('sign-off') || t.includes('signoff')) return 'Review & Sign-Off';
    return 'View Requirement';
  }
  if (t.includes('task') || url.includes('task')) return 'View Task';
  if (t.includes('approval') || t.includes('approve')) return 'Review & Approve';
  if (t.includes('course') || t.includes('learning')) return 'View Course';
  if (t.includes('sla')) return 'View SLA Details';
  if (t.includes('mention') || t.includes('remark') || t.includes('comment')) return 'View Discussion';

  return 'View Details';
}

/**
 * Builds a pixel-perfect, responsive HTML email card matching Chandak Group aesthetics
 */
export function buildEmailCardHtml(options: EmailCardOptions): string {
  const {
    title,
    description,
    details,
    actionUrl,
    actionText,
    footerText,
    badge
  } = options;

  const normalizedFields = normalizeDetailFields(details);
  const finalActionText = actionText || inferActionText(title, actionUrl);

  // Build key-value fields HTML inside the blue callout container
  let fieldsHtml = '';
  if (normalizedFields.length > 0) {
    fieldsHtml = `
      <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
        ${normalizedFields.map(f => `
          <p style="margin: 6px 0; font-size: 14px; line-height: 1.5; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <strong style="color: #0f172a; font-weight: 600;">${escapeHtml(f.label)}:</strong> ${escapeHtml(String(f.value))}
          </p>
        `).join('')}
      </div>
    `;
  }

  // Build CTA Button HTML
  let actionButtonHtml = '';
  if (actionUrl && actionUrl.trim()) {
    actionButtonHtml = `
      <div style="margin-top: 24px; margin-bottom: 8px;">
        <a href="${escapeHtml(actionUrl)}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center; mso-padding-alt: 0;">
          <!--[if mso]><i style="letter-spacing: 24px; mso-font-width: -100%; mso-text-raise: 20pt">&nbsp;</i><![endif]-->
          <span style="mso-text-raise: 10pt; color: #ffffff;">${escapeHtml(finalActionText)}</span>
          <!--[if mso]><i style="letter-spacing: 24px; mso-font-width: -100%">&nbsp;</i><![endif]-->
        </a>
      </div>
    `;
  }

  // Description / Intro paragraph
  let descriptionHtml = '';
  if (description && description.trim()) {
    descriptionHtml = `
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        ${escapeHtml(description)}
      </p>
    `;
  }

  // Optional badge
  let badgeHtml = '';
  if (badge && badge.text) {
    const badgeColors = {
      primary: 'background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;',
      success: 'background-color: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;',
      warning: 'background-color: #fffbeb; color: #b45309; border: 1px solid #fde68a;',
      danger: 'background-color: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;',
      neutral: 'background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;'
    };
    const style = badgeColors[badge.variant || 'primary'];
    badgeHtml = `
      <div style="margin-bottom: 12px;">
        <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; ${style}">
          ${escapeHtml(badge.text)}
        </span>
      </div>
    `;
  }

  // Optional footer note
  let footerHtml = '';
  if (footerText && footerText.trim()) {
    footerHtml = `
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8;">
        ${escapeHtml(footerText)}
      </div>
    `;
  }

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; box-sizing: border-box;">
  ${badgeHtml}
  <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700; line-height: 1.3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    ${escapeHtml(title)}
  </h2>
  ${descriptionHtml}
  ${fieldsHtml}
  ${actionButtonHtml}
  ${footerHtml}
</div>
`.trim();
}

/**
 * Intelligently converts any raw plain-text notification string into a rich, styled HTML card
 */
export function convertPlainTextToHtmlCard(options: {
  title: string;
  text?: string;
  defaultActionText?: string;
}): string {
  const { title, text = '', defaultActionText } = options;

  if (!text || !text.trim()) {
    return buildEmailCardHtml({
      title: title || 'Notification',
      actionText: defaultActionText
    });
  }

  // Extract explicit Link: https://...
  let actionUrl = '';
  let cleanedText = text;

  const linkRegex = /(?:Link:\s*|URL:\s*|^|\s)(https?:\/\/[^\s"'<>]+)/i;
  const linkMatch = cleanedText.match(linkRegex);
  if (linkMatch && linkMatch[1]) {
    actionUrl = linkMatch[1].trim();
    // Remove the link line from text
    cleanedText = cleanedText.replace(/(?:Link:\s*|URL:\s*)\s*https?:\/\/[^\s"'<>]+/gi, '').trim();
  }

  // Check if text has structured colon key-value patterns (e.g. "Task: foo\nStatus: bar")
  const lines = cleanedText.split('\n').map(l => l.trim()).filter(Boolean);
  const detectedDetails: Record<string, string> = {};
  const narrativeLines: string[] = [];

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && colonIdx < 30 && !line.startsWith('http')) {
      const key = line.substring(0, colonIdx).trim();
      const val = line.substring(colonIdx + 1).trim();
      if (key && val && !key.toLowerCase().includes('dear') && !key.toLowerCase().includes('hello')) {
        detectedDetails[key] = val;
        continue;
      }
    }
    narrativeLines.push(line);
  }

  const description = narrativeLines.join('\n\n');

  return buildEmailCardHtml({
    title: title || 'System Notification',
    description: description || undefined,
    details: Object.keys(detectedDetails).length > 0 ? detectedDetails : undefined,
    actionUrl: actionUrl || undefined,
    actionText: defaultActionText
  });
}

/**
 * Escapes HTML characters to prevent XSS in email bodies
 */
function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
