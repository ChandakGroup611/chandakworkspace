const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigration(url) {
    const client = new Client({ connectionString: url });
    try {
        await client.connect();
        
        const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20260621000002_workspace_hierarchy_cte.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        await client.query(sql);
        console.log("Successfully applied hierarchy CTE migration.");
        await client.end();
        return true;
    } catch (e) {
        console.error("Failed on url " + url, e.message);
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
        if (await applyMigration(url)) {
            break;
        }
    }
}

main();
