const nodemailer = require('nodemailer');

async function run() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: {
      user: 'it.support@chandakgroup.com',
      pass: 'Ch@nd@k408#'
    },
    debug: true,
    logger: true
  });

  try {
    const info = await transporter.sendMail({
      from: '\"Chandak Workspace\" <it.support@chandakgroup.com>',
      to: 'wajid.ali@chandakgroup.com',
      subject: 'System Notification Test',
      text: 'This is a test email to verify SMTP delivery logs.',
      html: '<p>This is a test email to verify SMTP delivery logs.</p>'
    });
    console.log('Message sent: %s', info.messageId);
    console.log('Response:', info.response);
  } catch (e) {
    console.error('Error sending:', e);
  }
}

run();
