const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFlow() {
  const reqId = 'c59e1d64-433a-4900-a445-cc00da265c73';

  const reqAttachments = await supabaseAdmin
    .from('attachments')
    .select('*')
    .eq('module_type', 'requirement')
    .eq('record_id', reqId)
    .eq('is_deleted', false);

  let mappedAttachments = [];
  if (reqAttachments.data && reqAttachments.data.length > 0) {
    mappedAttachments = reqAttachments.data.map((att) => ({
      file_name: att.original_file_name || att.file_name,
      file_url: att.storage_path || att.file_name,
      file_type: att.mime_type,
      size: att.file_size
    }));
  }

  console.log("Req Attachments fetch result:", reqAttachments.data);
  console.log("Mapped Attachments:", mappedAttachments);
}

testFlow();
