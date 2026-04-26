const { Resend } = require('resend');

let resend = null;

function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'admin@relevacore.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'RelevaCore <onboarding@resend.dev>';

// ─── Send email via Resend ────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  const client = getResend();
  if (!client) {
    console.log('📧 [Email not configured] Would have sent:');
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log('   (Set RESEND_API_KEY in .env to enable real emails)');
    return;
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html
    });

    if (error) {
      console.error('Email send error:', error);
      return;
    }

    console.log(`✅ Email sent to ${to}: ${subject} (ID: ${data?.id})`);
  } catch (err) {
    console.error('Email service error:', err.message);
  }
}

// ─── Branded HTML template ────────────────────────────────────
function wrapTemplate(title, content) {
  return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b0c10; color: #e4e4e7; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1f1b3a, #0b0c10); padding: 30px 30px 20px; text-align: center; border-bottom: 1px solid rgba(168,85,247,0.2);">
        <h1 style="color: #c084fc; font-size: 24px; margin: 0;">⬡ RelevaCore</h1>
        <p style="color: #71717a; font-size: 12px; margin: 5px 0 0;">Brand Marketing Agency</p>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #f5f5f5; font-size: 20px; margin: 0 0 20px;">${title}</h2>
        ${content}
      </div>
      <div style="background: rgba(255,255,255,0.03); padding: 20px 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
        <p style="color: #52525b; font-size: 12px; margin: 0;">© 2025 RelevaCore — Automated notification</p>
      </div>
    </div>
  `;
}

function fieldRow(label, value) {
  if (!value) return '';
  return `
    <tr>
      <td style="padding: 8px 12px; color: #71717a; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.05); width: 120px; vertical-align: top;">${label}</td>
      <td style="padding: 8px 12px; color: #e4e4e7; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.05);">${value}</td>
    </tr>
  `;
}

// ─── Notification functions ───────────────────────────────────

async function sendLeadNotification(lead) {
  const content = `
    <p style="color: #a1a1aa; margin: 0 0 20px;">You have a new lead submission on RelevaCore.</p>
    <table style="width: 100%; border-collapse: collapse; background: rgba(255,255,255,0.03); border-radius: 12px; overflow: hidden;">
      ${fieldRow('Name', lead.name)}
      ${fieldRow('Email', `<a href="mailto:${lead.email}" style="color: #c084fc;">${lead.email}</a>`)}
      ${fieldRow('Phone', lead.phone)}
      ${fieldRow('Company', lead.company)}
      ${fieldRow('Service', lead.service)}
      ${fieldRow('Source', lead.source)}
      ${fieldRow('Message', lead.message)}
    </table>
    <div style="margin-top: 20px; text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'https://relevacore.onrender.com'}/admin/leads" style="display: inline-block; background: #a855f7; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View in Dashboard →</a>
    </div>
  `;

  await sendEmail({
    to: NOTIFICATION_EMAIL,
    subject: `🔔 New Lead: ${lead.name} — ${lead.service || 'General Inquiry'}`,
    html: wrapTemplate('New Lead Received', content)
  });
}

async function sendConsultationNotification(booking) {
  const content = `
    <p style="color: #a1a1aa; margin: 0 0 20px;">A new consultation has been booked.</p>
    <table style="width: 100%; border-collapse: collapse; background: rgba(255,255,255,0.03); border-radius: 12px; overflow: hidden;">
      ${fieldRow('Name', booking.name)}
      ${fieldRow('Email', `<a href="mailto:${booking.email}" style="color: #c084fc;">${booking.email}</a>`)}
      ${fieldRow('Date', booking.preferred_date)}
      ${fieldRow('Time', booking.preferred_time)}
      ${fieldRow('Topic', booking.topic)}
      ${fieldRow('Message', booking.message)}
    </table>
    <div style="margin-top: 20px; text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'https://relevacore.onrender.com'}/admin/consultations" style="display: inline-block; background: #a855f7; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View in Dashboard →</a>
    </div>
  `;

  await sendEmail({
    to: NOTIFICATION_EMAIL,
    subject: `📅 New Consultation: ${booking.name} — ${booking.topic || 'General'}`,
    html: wrapTemplate('New Consultation Booked', content)
  });
}

async function sendConsultationConfirmation(booking) {
  const content = `
    <p style="color: #a1a1aa; margin: 0 0 20px;">Hi ${booking.name},</p>
    <p style="color: #d4d4d8; margin: 0 0 20px;">Thanks for booking a consultation with RelevaCore! We've received your request and our team will confirm your slot shortly.</p>
    <table style="width: 100%; border-collapse: collapse; background: rgba(255,255,255,0.03); border-radius: 12px; overflow: hidden;">
      ${fieldRow('Date', booking.preferred_date || 'To be confirmed')}
      ${fieldRow('Time', booking.preferred_time || 'To be confirmed')}
      ${fieldRow('Topic', booking.topic || 'General')}
    </table>
    <p style="color: #a1a1aa; margin: 20px 0 0; font-size: 13px;">We'll send you a confirmation email with the meeting link within 24 hours.</p>
  `;

  await sendEmail({
    to: booking.email,
    subject: `✅ Consultation Request Received — RelevaCore`,
    html: wrapTemplate('Consultation Booked!', content)
  });
}

async function sendPricingNotification(inquiry) {
  const content = `
    <p style="color: #a1a1aa; margin: 0 0 20px;">A new pricing inquiry has come in.</p>
    <table style="width: 100%; border-collapse: collapse; background: rgba(255,255,255,0.03); border-radius: 12px; overflow: hidden;">
      ${fieldRow('Name', inquiry.name)}
      ${fieldRow('Email', `<a href="mailto:${inquiry.email}" style="color: #c084fc;">${inquiry.email}</a>`)}
      ${fieldRow('Plan', `<strong style="color: #c084fc;">${inquiry.plan}</strong>`)}
      ${fieldRow('Phone', inquiry.phone)}
      ${fieldRow('Company', inquiry.company)}
      ${fieldRow('Message', inquiry.message)}
    </table>
    <div style="margin-top: 20px; text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'https://relevacore.onrender.com'}/admin/leads" style="display: inline-block; background: #a855f7; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View in Dashboard →</a>
    </div>
  `;

  await sendEmail({
    to: NOTIFICATION_EMAIL,
    subject: `💰 Pricing Inquiry: ${inquiry.name} — ${inquiry.plan} Plan`,
    html: wrapTemplate('New Pricing Inquiry', content)
  });
}

module.exports = {
  sendEmail,
  sendLeadNotification,
  sendConsultationNotification,
  sendConsultationConfirmation,
  sendPricingNotification
};
