require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Fetching queue items...");
  const { data: queueItems, error: queueError } = await supabaseAdmin
      .from("email_queue")
      .select("*")
      .eq("is_sent", false)
      .order("created_at", { ascending: true })
      .limit(10);

  if (queueError) { console.error(queueError); return; }
  console.log(`Found ${queueItems.length} items`);

  if (queueItems.length === 0) return;

  const { data: providers } = await supabaseAdmin
    .from("email_providers")
    .select("*")
    .order("priority_level", { ascending: true })
    .order("created_at", { ascending: false });

  if (!providers || providers.length === 0) {
    console.error("No providers!");
    return;
  }

  const ids = queueItems.map(i => i.id);
  console.log("Marking processing...");
  // ... let's not mark processing, just test dispatchEmail logic

  for (const item of queueItems) {
    console.log("Processing item", item.id);
    let delivered = false;
    for (const provider of providers) {
      if (provider.is_active === false) continue;
      try {
        console.log(`Trying provider ${provider.provider_name}...`);
        
        let transportConfig = {
          host: provider.config.host,
          port: Number(provider.config.port),
          secure: Number(provider.config.port) === 465, // usually true for 465, false for 587
        };

        if (provider.config.username) {
          transportConfig.auth = {
            user: provider.config.username,
            pass: provider.config.password,
          };
        } else {
          transportConfig.tls = { rejectUnauthorized: false };
        }

        const transporter = nodemailer.createTransport(transportConfig);
        const senderEmail = provider.config.username || "no-reply@enterprise.com";
        const smtpFrom = provider.config.smtp_from || senderEmail;
        const senderName = provider.config.sender_name || "Chandak Workspace";

        const hasHtml = item.html_body || (item.body_template && (item.body_template.includes('<p>') || item.body_template.includes('<div') || item.body_template.includes('<html')));
        const textContent = hasHtml && !item.html_body ? "Please view this email in an HTML-compatible client." : (item.body_template || "You have a new notification.");
        const htmlContent = item.html_body || (hasHtml ? item.body_template : undefined);

        await transporter.sendMail({
          from: `"${senderName}" <${smtpFrom}>`,
          to: item.recipient_email,
          subject: item.subject || "System Notification",
          text: textContent,
          html: htmlContent
        });

        console.log("Delivered successfully!");
        delivered = true;
        break;
      } catch (e) {
        console.error("Provider failed:", e.message);
      }
    }
  }
}
run();
