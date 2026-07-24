const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const query = `
    DROP TABLE IF EXISTS public.email_templates CASCADE;
    CREATE TABLE public.email_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        module VARCHAR(50) NOT NULL,
        event VARCHAR(50) NOT NULL,
        template_name VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        html_body TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        version INT DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
    );
    ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
    CREATE POLICY policy_email_templates_select ON public.email_templates FOR SELECT TO authenticated USING (public.is_super_admin() OR public.check_user_permission('SYSTEM_SETTINGS_VIEW'));
    CREATE POLICY policy_email_templates_modify ON public.email_templates FOR ALL TO authenticated USING (public.is_super_admin() OR public.check_user_permission('SYSTEM_SETTINGS_MANAGE'));
    NOTIFY pgrst, 'reload schema';
  `;
  const { data, error } = await supabase.rpc('query_db', { query_text: query });
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
