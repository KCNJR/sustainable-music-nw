const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  let data = req.body;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch(e) { data = {}; }
  }

  const name = data.name || 'Neighbor';
  const email = data.email || '';
  const interest = data.interest || 'General Volunteering';
  const message = data.message || data.notes || '';

  const emailUser = (process.env.EMAIL_USER || process.env.SMTP_USER || 'info@sustainablemusicnw.org').trim();
  const emailPass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || 'eozypawagwvqtpgx').replace(/[^a-zA-Z0-9]/g, '').trim();
  const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const emailPort = parseInt(process.env.EMAIL_PORT || '587', 10);

  if (email && emailPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailPort === 465,
        auth: { user: emailUser, pass: emailPass },
        tls: { rejectUnauthorized: false }
      });

      // 1. User confirmation
      await transporter.sendMail({
        from: `"Sustainable Music Northwest" <${emailUser}>`,
        to: email,
        subject: "Thank you for getting involved with Sustainable Music NW!",
        html: `<h3>Thank you for reaching out, ${name}!</h3>
               <p>We received your note regarding: <strong>${interest}</strong>.</p>
               <p>A member of our team will follow up with you shortly.</p>`
      }).catch(err => console.error("User confirmation error:", err.message));

      // 2. Admin alert
      await transporter.sendMail({
        from: `"SMNW Inquiries" <${emailUser}>`,
        to: 'info@sustainablemusicnw.org',
        replyTo: email,
        subject: `[Volunteer / Board Inquiry] ${name} (${interest})`,
        html: `<p><strong>Name:</strong> ${name}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Interest:</strong> ${interest}</p>
               <p><strong>Message:</strong><br>${message}</p>`
      }).catch(err => console.error("Admin alert error:", err.message));
    } catch (err) {
      console.error("SMTP error:", err.message);
    }
  }

  return res.status(200).json({ success: true, message: "Inquiry received successfully." });
};
