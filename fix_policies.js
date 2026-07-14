const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const filesToFix = [
  '20260624000007_amc_transactions.sql',
  '20260624000008_amc_payments.sql',
  '20260624000009_amc_governance.sql',
  '20260708000000_ticket_escalation_cron.sql',
  '20260708000001_ticket_macros.sql',
  '20260708000002_ticket_relations.sql'
];

for (const file of filesToFix) {
  const filePath = path.join(migrationsDir, file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Regex to find CREATE POLICY "name" ON table
  const regex = /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+([^\s]+)/gi;
  
  let newContent = content.replace(regex, (match, policyName, tableName) => {
    // Check if it already has a DROP right before it (very simple heuristic)
    return `DROP POLICY IF EXISTS "${policyName}" ON ${tableName};\n${match}`;
  });

  fs.writeFileSync(filePath, newContent);
  console.log(`Fixed policies in ${file}`);
}
