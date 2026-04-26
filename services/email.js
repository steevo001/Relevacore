const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️  Email not configured (SMTP_USER/SMTP_PASS missing). Emails will be logged to console.');
      return null;
    }

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, html }) {
  const transport = getTransporter();

  if (!transport) {
    console.log('📧 [EMAIL LOG]');
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body: ${html.substring(0, 200)}...`);
    return { logged: true };
  }

  try {
    const result = await transport.sendMail({
      from: `"RelevaCore" <${process.env.EMAIL_FROM || 'noreply@relevacore.com'}>`,
      to,
      subject,
      html
    });
    return result;
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

async function sendLeadNotification(lead) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@relevacore.com';
  return sendEmail({
    to: adminEmail,
    subject: `🚀 New Lead: ${lead.name} — ${lead.source || 'Website'}`,
    html: `
      <div style="font-family: 'Inter', sans-serif; background: #0b0c10; color: #e4e4e7; padding: 2rem; border-radius: 16px;">
        <h2 style="color: #c084fc; margin-bottom: 1rem;">New Lead Received</h2>
        <table style="color: #d4d4d8; font-size: 14px; border-collapse: collapse;">
          <tr><td style="padding: 6px 12px; color: #a1a1aa;">Name</td><td style="padding: 6px 12px;">${lead.name}</td></tr>
          <tr><td style="padding: 6px 12px; color: #a1a1aa;">Email</td><td style="padding: 6px 12px;">${lead.email}</td></tr>
          ${lead.phone ? `<tr><td style="padding: 6px 12px; color: #a1a1aa;">Phone</td><td style="padding: 6px 12px;">${lead.phone}</td></tr>` : ''}
          ${lead.company ? `<tr><td style="padding: 6px 12px; color: #a1a1aa;">Company</td><td style="padding: 6px 12px;">${lead.company}</td></tr>` : ''}
          ${lead.service ? `<tr><td style="padding: 6px 12px; color: #a1a1aa;">Service</td><td style="padding: 6px 12px;">${lead.service}</td></tr>` : ''}
          ${lead.message ? `<tr><td style="padding: 6px 12px; color: #a1a1aa;">Message</td><td style="padding: 6px 12px;">${lead.message}</td></tr>` : ''}
        </table>
        <p style="margin-top: 1.5rem; color: #71717a; font-size: 12px;">Source: ${lead.source || 'Website'} | ${new Date().toLocaleString()}</p>
      </div>
    `
  });
}

async function sendConsultationConfirmation(booking) {
  return sendEmail({
    to: booking.email,
    subject: '✅ Consultation Booked — RelevaCore',
    html: `
      <div style="font-family: 'Inter', sans-serif; background: #0b0c10; color: #e4e4e7; padding: 2rem; border-radius: 16px;">
        <h2 style="color: #c084fc;">Your Consultation is Booked!</h2>
        <p style="color: #d4d4d8;">Hi ${booking.name},</p>
        <p style="color: #a1a1aa;">Thank you for booking a free consultation with RelevaCore. Here are your details:</p>
        <div style="background: rgba(168,85,247,0.1); padding: 1rem; border-radius: 12px; margin: 1rem 0;">
          <p style="color: #d4d4d8;"><strong>Date:</strong> ${booking.preferred_date || 'TBD'}</p>
          <p style="color: #d4d4d8;"><strong>Time:</strong> ${booking.preferred_time || 'TBD'}</p>
          ${booking.topic ? `<p style="color: #d4d4d8;"><strong>Topic:</strong> ${booking.topic}</p>` : ''}
        </div>
        <p style="color: #a1a1aa;">We'll confirm the exact time shortly. If you need to reschedule, reply to this email.</p>
        <p style="color: #71717a; font-size: 12px; margin-top: 1.5rem;">— The RelevaCore Team</p>
      </div>
    `
  });
}

async function sendConsultationNotification(booking) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@relevacore.com';
  return sendEmail({
    to: adminEmail,
    subject: `📅 New Consultation Booking: ${booking.name}`,
    html: `
      <div style="font-family: 'Inter', sans-serif; background: #0b0c10; color: #e4e4e7; padding: 2rem; border-radius: 16px;">
        <h2 style="color: #c084fc;">New Consultation Request</h2>
        <table style="color: #d4d4d8; font-size: 14px; border-collapse: collapse;">
          <tr><td style="padding: 6px 12px; color: #a1a1aa;">Name</td><td style="padding: 6px 12px;">${booking.name}</td></tr>
          <tr><td style="padding: 6px 12px; color: #a1a1aa;">Email</td><td style="padding: 6px 12px;">${booking.email}</td></tr>
          <tr><td style="padding: 6px 12px; color: #a1a1aa;">Date</td><td style="padding: 6px 12px;">${booking.preferred_date || 'TBD'}</td></tr>
          <tr><td style="padding: 6px 12px; color: #a1a1aa;">Time</td><td style="padding: 6px 12px;">${booking.preferred_time || 'TBD'}</td></tr>
          ${booking.topic ? `<tr><td style="padding: 6px 12px; color: #a1a1aa;">Topic</td><td style="padding: 6px 12px;">${booking.topic}</td></tr>` : ''}
          ${booking.message ? `<tr><td style="padding: 6px 12px; color: #a1a1aa;">Message</td><td style="padding: 6px 12px;">${booking.message}</td></tr>` : ''}
        </table>
      </div>
    `
  });
}

module.exports = {
  sendEmail,
  sendLeadNotification,
  sendConsultationConfirmation,
  sendConsultationNotification
};
