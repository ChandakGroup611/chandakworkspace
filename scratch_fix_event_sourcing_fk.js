const { Client } = require('pg');

async function testConnection(url) {
    console.log("Testing:", url);
    const client = new Client({ connectionString: url });
    try {
        await client.connect();
        console.log("Connected!");
        
        const sql = `
            CREATE OR REPLACE FUNCTION public.prevent_event_updates()
            RETURNS TRIGGER AS $$
            BEGIN
                IF OLD.actor_id IS NOT NULL AND NEW.actor_id IS NULL AND 
                   OLD.id = NEW.id AND 
                   (OLD.tenant_id = NEW.tenant_id OR (OLD.tenant_id IS NULL AND NEW.tenant_id IS NULL)) AND 
                   OLD.event_type = NEW.event_type AND 
                   OLD.entity_id = NEW.entity_id AND 
                   OLD.payload = NEW.payload THEN
                    RETURN NEW;
                END IF;

                RAISE EXCEPTION 'Updates to system_domain_events are strictly prohibited (Immutable Event Sourcing)';
            END;
            $$ LANGUAGE plpgsql;
        `;
        
        await client.query(sql);
        console.log("Successfully updated trigger.");
        await client.end();
        return true;
    } catch (e) {
        console.error("Failed:", e.message);
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
