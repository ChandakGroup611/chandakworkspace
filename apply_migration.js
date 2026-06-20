const { Client } = require('pg');

async function testConnection(url) {
    const client = new Client({ connectionString: url });
    try {
        await client.connect();
        
        const sql = `
            UPDATE public.system_permissions
            SET code = 'TRASH_VIEW',
                name = 'View Trash Data',
                module_name = 'Trash Data',
                group_name = 'Data Retention'
            WHERE code = 'COMPLIANCE_VIEW';
        `;
        
        await client.query(sql);
        console.log("Successfully updated IAM system permissions.");
        await client.end();
        return true;
    } catch (e) {
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
