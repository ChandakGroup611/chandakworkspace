const fetch = require('node-fetch');

async function testEmail() {
  const url = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  console.log(`Sending test email trigger to ${url}/api/debug/test-email`);
  
  try {
    const response = await fetch(`${url}/api/debug/test-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to_email: 'test@example.com', // Change this to your test email
        subject: 'System Configuration Test',
        message: 'This is a test email triggered to verify SMTP configuration.'
      }),
    });
    
    const data = await response.json();
    console.log("Response:", data);
  } catch (err) {
    console.error("Error triggering test email:", err);
  }
}

testEmail();
