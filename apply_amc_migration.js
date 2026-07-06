const fs = require('fs');
const { Client } = require('pg');

async function testConnection(url) {
    const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        
        const sqlPath = "d:\\adios\\supabase\\migrations\\20260624000000_software_amc_subscriptions.sql";
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        await client.query(sql);
        console.log("Successfully applied AMC migration using:", url);
        await client.end();
        return true;
    } catch (e) {
        console.log("Failed with:", url, e.message);
        try { await client.end(); } catch (err) {}
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
