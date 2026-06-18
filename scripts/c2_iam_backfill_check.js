require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runBackfillCheck() {
  const connectionString = process.env.DATABASE_URL;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    console.log("Connected to DB.");

    // 1. Get all available permissions
    const permRes = await client.query("SELECT code FROM public.permissions_master WHERE is_deleted = false");
    const allPerms = permRes.rows.map(r => r.code);

    // 2. Get all SUPER_ADMIN users
    const adminRes = await client.query(`
      SELECT um.id, um.email 
      FROM public.user_master um
      JOIN public.roles r ON um.role_id = r.id
      WHERE r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN') AND um.is_deleted = false
    `);
    const admins = adminRes.rows;

    let totalMissing = 0;
    const gaps = [];

    // 3. For each admin, compare expected vs snapshot
    for (const admin of admins) {
      const snapRes = await client.query(
        "SELECT permission_code FROM public.user_permissions_snapshot WHERE user_id = $1",
        [admin.id]
      );
      const snapshotPerms = new Set(snapRes.rows.map(r => r.permission_code));
      
      const missing = allPerms.filter(p => !snapshotPerms.has(p));
      const orphan = [...snapshotPerms].filter(p => !allPerms.includes(p));

      if (missing.length > 0) totalMissing += missing.length;

      gaps.push({
        user_id: admin.id,
        email: admin.email,
        missing_count: missing.length,
        orphan_count: orphan.length,
        missing_permissions: missing,
        orphan_permissions: orphan
      });
    }

    console.log(JSON.stringify(gaps, null, 2));

    const reportContent = `# SUPER_ADMIN_PERMISSION_GAP_REPORT\n\n` +
      `**Total Missing Permissions Across All Admins:** ${totalMissing}\n\n` +
      gaps.map(g => `### Admin: ${g.email} (${g.user_id})\n- **Missing:** ${g.missing_count}\n- **Orphans:** ${g.orphan_count}\n` +
      (g.missing_count > 0 ? `- **Missing List:** ${g.missing_permissions.join(', ')}\n` : '')).join('\n');

    fs.writeFileSync(path.join(process.cwd(), 'SUPER_ADMIN_PERMISSION_GAP_REPORT.md'), reportContent);
    console.log("Report generated at SUPER_ADMIN_PERMISSION_GAP_REPORT.md");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

runBackfillCheck();
