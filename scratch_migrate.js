const { Client } = require('pg');
require('dotenv').config({path: '.env.local'});
const client = new Client({ 
    connectionString: 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true', 
    ssl: { rejectUnauthorized: false } 
});
async function run() { 
    try { 
        await client.connect(); 
        console.log('Connected!'); 
        const sql = `
CREATE TABLE IF NOT EXISTS public.master_cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_name TEXT NOT NULL,
    city_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(state_name, city_name)
);
ALTER TABLE public.master_cities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.master_cities;
CREATE POLICY "Enable read access for all users" ON public.master_cities FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.master_cities;
CREATE POLICY "Enable insert access for all users" ON public.master_cities FOR INSERT WITH CHECK (true);
NOTIFY pgrst, 'reload schema';
        `;
        await client.query(sql); 
        console.log('Table created!'); 
        await client.end(); 
    } catch(e) { 
        console.error('Failed:', e.message); 
    } 
}
run();
