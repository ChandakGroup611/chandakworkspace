const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  let url = process.env.DATABASE_URL;
  const match = url.match(/postgresql:\/\/(postgres\.[^:]+):([^@]+)@([^:]+):6543\/(.+)/);
  if (match) {
    const password = match[2];
    const projectRef = match[1].split('.')[1];
    url = `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`;
  }
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const sql = `
CREATE OR REPLACE FUNCTION public.check_user_permission(p_permission_code TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_base TEXT;
    v_has_permission BOOLEAN;
BEGIN
    -- 1. SUPER_ADMIN bypass
    IF public.is_super_admin() THEN
        RETURN TRUE;
    END IF;

    -- 2. Direct match
    SELECT EXISTS (
        SELECT 1 FROM public.user_permissions_snapshot 
        WHERE user_id = auth.uid() AND permission_code = p_permission_code
    ) INTO v_has_permission;

    IF v_has_permission THEN
        RETURN TRUE;
    END IF;

    -- 3. Inherited permissions
    IF p_permission_code LIKE '%\\_VIEW' ESCAPE '\\' THEN
        v_base := substring(p_permission_code from 1 for position('_VIEW' in p_permission_code) - 1);
        SELECT EXISTS (
            SELECT 1 FROM public.user_permissions_snapshot 
            WHERE user_id = auth.uid() AND permission_code IN (
                v_base || '_CREATE',
                v_base || '_UPDATE',
                v_base || '_DELETE',
                v_base || '_MANAGE'
            )
        ) INTO v_has_permission;
        RETURN v_has_permission;
    ELSIF p_permission_code LIKE '%\\_CREATE' ESCAPE '\\' THEN
        v_base := substring(p_permission_code from 1 for position('_CREATE' in p_permission_code) - 1);
        SELECT EXISTS (
            SELECT 1 FROM public.user_permissions_snapshot 
            WHERE user_id = auth.uid() AND permission_code = v_base || '_MANAGE'
        ) INTO v_has_permission;
        RETURN v_has_permission;
    ELSIF p_permission_code LIKE '%\\_UPDATE' ESCAPE '\\' THEN
        v_base := substring(p_permission_code from 1 for position('_UPDATE' in p_permission_code) - 1);
        SELECT EXISTS (
            SELECT 1 FROM public.user_permissions_snapshot 
            WHERE user_id = auth.uid() AND permission_code = v_base || '_MANAGE'
        ) INTO v_has_permission;
        RETURN v_has_permission;
    ELSIF p_permission_code LIKE '%\\_DELETE' ESCAPE '\\' THEN
        v_base := substring(p_permission_code from 1 for position('_DELETE' in p_permission_code) - 1);
        SELECT EXISTS (
            SELECT 1 FROM public.user_permissions_snapshot 
            WHERE user_id = auth.uid() AND permission_code = v_base || '_MANAGE'
        ) INTO v_has_permission;
        RETURN v_has_permission;
    END IF;

    RETURN FALSE;
END;
$$;
  `;
  try {
    await client.query(sql);
    console.log("Function updated successfully.");
  } catch (err) {
    console.error("Failed to update function:", err);
  } finally {
    await client.end();
  }
}

run();
