const { Client } = require('pg');

async function testConnection(url) {
    const client = new Client({ connectionString: url });
    try {
        await client.connect();
        
        const sql = `
            UPDATE public.system_permissions
            SET code = REPLACE(code, 'COMPLIANCE_', 'TRASH_'),
                name = REPLACE(name, 'Compliance', 'Trash Data'),
                module_name = 'Trash Data',
                group_name = 'Data Retention'
            WHERE code LIKE 'COMPLIANCE_%';
        `;
        
        await client.query(sql);
        console.log("Successfully updated remaining IAM system permissions to TRASH_ using " + url);
        await client.end();
        return true;
    } catch (e) {
        console.error("Failed on " + url, e.message);
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
