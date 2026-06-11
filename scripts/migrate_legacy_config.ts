import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runMigration() {
  console.log("Starting Migration: Legacy Email Config -> Enterprise Provider Engine...");

  // 1. Fetch Legacy Data
  const { data: legacyConfigs, error: fetchErr } = await supabase
    .from('system_email_config')
    .select('*')
    .limit(1);

  if (fetchErr) {
    if (fetchErr.code === '42P01') {
      console.log("Legacy table 'system_email_config' does not exist. Skipping migration.");
      return;
    }
    console.error("Failed to fetch legacy config:", fetchErr);
    return;
  }

  const legacy = legacyConfigs && legacyConfigs.length > 0 ? legacyConfigs[0] : null;

  if (!legacy) {
    console.log("No legacy configuration found to migrate.");
    return;
  }

  console.log("Found legacy configuration. Migrating as PRIMARY Gateway (Priority 1)...");

  // 2. Map to New Schema
  const providerName = legacy.provider_type === "RESEND" ? "Resend" : "SMTP";
  
  const configPayload = {
    host: legacy.smtp_host || "",
    port: legacy.smtp_port || 587,
    username: legacy.smtp_username || "",
    password: legacy.smtp_password_encrypted || "",
    encryption: legacy.encryption_type || "STARTTLS",
    sender_name: legacy.sender_name || "Enterprise Operations",
    sender_email: legacy.sender_email || ""
  };

  // 3. Upsert into Primary Slot
  const { data: existingPrimary } = await supabase
    .from('email_providers')
    .select('id')
    .eq('priority_level', 1)
    .single();

  if (existingPrimary) {
    const { error: updateErr } = await supabase
      .from('email_providers')
      .update({
        provider_name: providerName,
        is_active: true,
        config: configPayload
      })
      .eq('id', existingPrimary.id);

    if (updateErr) console.error("Failed to update existing primary provider:", updateErr);
    else console.log("Successfully migrated into existing Primary slot.");
  } else {
    const { error: insertErr } = await supabase
      .from('email_providers')
      .insert([{
        provider_name: providerName,
        priority_level: 1,
        is_active: true,
        config: configPayload
      }]);

    if (insertErr) console.error("Failed to insert new primary provider:", insertErr);
    else console.log("Successfully inserted migrated data as Primary slot.");
  }

  // 4. (Optional) Disable legacy table access or drop it. We will leave it for backwards compatibility.
  console.log("Migration complete. Legacy config remains for safety.");
}

runMigration().catch(console.error);
