const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const supabase = createClient('https://tkovzymkubxtpcgynkgd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrb3Z6eW1rdWJ4dHBjZ3lua2dkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk4MDYyMiwiZXhwIjoyMDk2NTU2NjIyfQ.UsBMx2jpsI5cJavw2cFqYQJZO8tN7YHWwzvb2LYJ5wY');

async function testDispatch() {
  const { data: queueItems } = await supabase.from('email_queue').select('*').eq('is_sent', false).limit(1);
  const { data: providers } = await supabase.from('email_providers').select('*').eq('is_active', true);
  
  const item = queueItems[0];
  const provider = providers[0];
  
  console.log('Sending item', item.id, 'via', provider.provider_name);
  
  try {
    let transportConfig = {
      host: provider.config.host,
      port: Number(provider.config.port),
      secure: Number(provider.config.port) === 465, 
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
    const senderEmail = provider.config.username || "no-reply@chandakgroup.com";
    
    await transporter.sendMail({
      from: `"Chandak Workspace" <${senderEmail}>`,
      to: item.recipient_email,
      subject: item.subject,
      text: item.body_template,
      html: item.body_template
    });
    console.log("SUCCESS");
  } catch (err) {
    console.error("FAILED:", err.message);
  }
}

testDispatch();
