const { Client } = require('pg');
const fs = require('fs');

async function testConnection(url) {
    const client = new Client({ connectionString: url });
    try {
        await client.connect();
        
        const sqlPath = "d:\\adios\\supabase\\migrations\\20260624000005_amc_enterprise_fields.sql";
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        await client.query(sql);
        console.log("Successfully executed migration.");
        await client.end();
        return true;
    } catch (e) {
        console.error("Connection failed for url: ", url, e.message);
        return false;
    }
}

async function main() {
    const urls = [
        'postgresql://postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'
    ];
    
    for (const url of urls) {
        if (await testConnection(url)) {
            break;
        }
    }
}

main();
