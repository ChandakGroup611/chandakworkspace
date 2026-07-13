const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

// ==========================================
// 1. FILL IN YOUR 10+ USERS HERE
// Format: "old_email@gmail.com": "new_official_email@chandakgroup.com"
// ==========================================
const emailMapping = {
    "rohit@gmail.com": "rohit.gurav@chandakgroup.com",
    "vinayak@gmail.com": "vinayak.bhagane@chandakgroup.com",
    "sagarj@gmail.com": "sagar.jadhav@chandakgroup.com",
    "prashant@chandakgroup.com": "prashant@chandakgroup.com",
    "arun@gmail.com": "arun.narvekar@chandakgroup.com",
    "manmohan.vdv@gmail.com": "manmohan@chandakgroup.com",
    "komalp@chandak.com": "komal.panchal@chandakgroup.com",
    "wajidali@gmail.com": "wajid.ali@chandakgroup.com",
    "ankit@gmail.com": "ankit.shukla@chandakgroup.com",
    "miraz@gmail.com": "meraz.ahamad@chandakgroup.com",
    "anand.b@gmail.com": "anand.bhowad@chandakgroup.com",
    "adil@gmail.com": "adil.kazi@chandakgroup.com",
    "bhavesh@gmail.com": "bhavesh.k@chandakgroup.com",
    "sagarmohta81@gmail.com": "sagar.mohta@chandakgroup.com",
    "mohak@gmail.com": "mohak.joshi@chandakgroup.com",
    "anand@gmail.com": "anand@chandakgroup.com"
};

// ==========================================
// DB Connection Info
// ==========================================
// We use Postgres directly because Supabase Admin API sometimes blocks bulk email changes without email verification workflows.
const connectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function main() {
    console.log("Starting bulk email update for SSO migration...");
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    
    try {
        await client.connect();
        await client.query("BEGIN;"); // Start transaction

        const oldEmails = Object.keys(emailMapping);
        if (oldEmails.length === 0) {
            console.log("No emails to update. Please fill out the emailMapping object.");
            return;
        }

        let updatedAuth = 0;
        let updatedMaster = 0;

        for (const oldEmail of oldEmails) {
            const newEmail = emailMapping[oldEmail].toLowerCase().trim();
            const oldEmailLower = oldEmail.toLowerCase().trim();

            console.log(`Processing: ${oldEmailLower} -> ${newEmail}`);

            // 1. Update auth.users
            const authRes = await client.query(`
                UPDATE auth.users 
                SET email = $1, email_confirmed_at = NOW(), updated_at = NOW() 
                WHERE email = $2
            `, [newEmail, oldEmailLower]);
            
            if (authRes.rowCount > 0) {
                updatedAuth += authRes.rowCount;
            } else {
                console.log(`  [Warning] ${oldEmailLower} not found in auth.users`);
            }

            // 2. Update public.user_master
            const masterRes = await client.query(`
                UPDATE public.user_master 
                SET email = $1, updated_at = NOW() 
                WHERE email = $2
            `, [newEmail, oldEmailLower]);

            if (masterRes.rowCount > 0) {
                updatedMaster += masterRes.rowCount;
            } else {
                console.log(`  [Warning] ${oldEmailLower} not found in public.user_master`);
            }
        }

        await client.query("COMMIT;"); // Commit transaction
        console.log("\n==========================================");
        console.log("✅ SUCCESS: Bulk email update completed!");
        console.log(`Updated ${updatedAuth} records in auth.users`);
        console.log(`Updated ${updatedMaster} records in public.user_master`);
        console.log("These users can now safely log in with their @chandakgroup.com SSO and keep all their records.");
        console.log("==========================================");

    } catch (err) {
        await client.query("ROLLBACK;"); // Rollback on error
        console.error("❌ ERROR: Transaction failed. All changes reverted.");
        console.error(err.message);
    } finally {
        await client.end();
    }
}

main();
