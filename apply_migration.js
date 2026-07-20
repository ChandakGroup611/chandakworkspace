const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function testConnection(url) {
    const client = new Client({ connectionString: url });
    try {
        await client.connect();
        
        const sqlPath = process.argv[2] || "d:\\adios\\supabase\\migrations\\20260715000000_universal_sla_trackers.sql";
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        await client.query(sql);
        console.log("Successfully executed migration:", sqlPath);
        
        // Notify postgrest to reload schema cache
        await client.query("NOTIFY pgrst, 'reload schema'");
        console.log("Reloaded schema cache");

        await client.end();
        return true;
    } catch (e) {
        console.error("Connection failed for url: ", url, e.message);
        return false;
    }
}

async function main() {
    const urls = [
        process.env.DATABASE_URL // exact env var
    ];
    
    for (const url of urls) {
        if (await testConnection(url)) {
            break;
        }
    }
}

main();
