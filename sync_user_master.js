const { Client } = require('pg');

const oldConnectionString = 'postgresql://postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const newConnectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function main() {
    console.log('Syncing user_master details and user_roles from Old to New DB...');
    const oldClient = new Client({ connectionString: oldConnectionString, ssl: { rejectUnauthorized: false } });
    const newClient = new Client({ connectionString: newConnectionString, ssl: { rejectUnauthorized: false } });

    await oldClient.connect();
    await newClient.connect();

    await newClient.query("SET session_replication_role = replica;");

    // 1. Sync User Master Details (Updates)
    try {
        console.log("Fetching user_master from Old DB...");
        const oldUsersRes = await oldClient.query("SELECT * FROM public.user_master");
        let updated = 0;
        
        for (const user of oldUsersRes.rows) {
            const updateQuery = `
                UPDATE public.user_master
                SET 
                    profile_photo = $1,
                    department_id = $2,
                    designation_id = $3,
                    role_id = $4,
                    manager_id = $5,
                    user_code = $6,
                    is_active = $7,
                    last_login_at = $8,
                    last_active_at = $9
                WHERE id = $10
            `;
            const params = [
                user.profile_photo,
                user.department_id,
                user.designation_id,
                user.role_id,
                user.manager_id,
                user.user_code,
                user.is_active,
                user.last_login_at,
                user.last_active_at,
                user.id
            ];
            
            const res = await newClient.query(updateQuery, params);
            updated += res.rowCount;
        }
        console.log(`Successfully updated ${updated} users with correct profile_photo and details.`);
    } catch(e) {
        console.error("Error updating user_master:", e.message);
    }

    // 2. Sync User Roles
    try {
        console.log("Fetching user_roles from Old DB...");
        const oldRolesRes = await oldClient.query("SELECT * FROM public.user_roles");
        let insertedRoles = 0;
        
        for (const ur of oldRolesRes.rows) {
            const insertQuery = `
                INSERT INTO public.user_roles (id, user_id, role_id, created_at)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO NOTHING
            `;
            try {
                const res = await newClient.query(insertQuery, [ur.id, ur.user_id, ur.role_id, ur.created_at]);
                insertedRoles += res.rowCount;
            } catch(e) {}
        }
        console.log(`Successfully merged ${insertedRoles} missing user_roles.`);
    } catch(e) {
        console.error("Error syncing user_roles:", e.message);
    }

    await newClient.query("SET session_replication_role = origin;");
    await oldClient.end();
    await newClient.end();
    console.log("Sync complete!");
}

main().catch(console.error);
