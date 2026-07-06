const { Client } = require('pg');

async function testConnection(url) {
    const client = new Client({ connectionString: url });
    try {
        await client.connect();
        
        const sql = `
            ALTER TABLE public.task_chat_messages 
            ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
        `;
        
        await client.query(sql);
        console.log("Successfully added attachments column to task_chat_messages.");
        await client.end();
        return true;
    } catch (e) {
        console.error("Connection failed for url: ", url, e.message);
        return false;
    }
}

async function main() {
    const urls = [
        'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
        'postgresql://postgres:Chandak_Workspace@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
        'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
        'postgresql://postgres:Chandak_Workspace@aws-0-ap-south-1.pooler.supabase.com:5432/postgres'
    ];
    
    for (const url of urls) {
        if (await testConnection(url)) {
            break;
        }
    }
}

main();
