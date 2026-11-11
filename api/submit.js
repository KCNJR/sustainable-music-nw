const nodemailer = require('nodemailer');

const URL_ = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

async function kv(cmd) {
  if (!URL_ || !TOKEN) return { result: null };
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  return r.json();
}

const clip = (s, n) => (s || '').toString().trim().slice(0, n);

async function dispatchEmail({ to, subject, html, text, replyTo }) {
  const emailUser = (process.env.EMAIL_USER || 'kevin@sustainablemusicnw.org').trim();
  const emailPass = (process.env.EMAIL_PASS || 'eozypawagwvqtpgx').replace(/[^a-zA-Z0-9]/g, '').trim();
  if (!to || !emailPass) return;

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: emailUser, pass: emailPass }
  });

  return await transporter.sendMail({
    from: '"Sustainable Music Northwest" <info@sustainablemusicnw.org>',
    to,
    replyTo: replyTo || 'info@sustainablemusicnw.org',
    subject,
    text,
    html
  });
}

const emailFooterHtml = `
  <div style="background-color: #faf9f6; border-top: 1px solid #e0ded9; padding: 24px 32px; text-align: center;">
    <p style="margin: 0 0 12px; font-size: 0.95rem; font-weight: 700; color: #1e1b18;">Connect With Sustainable Music Northwest</p>
    <div style="margin-bottom: 18px;">
      <a href="https://sustainablemusicnw.org" style="color: #0f766e; font-weight: 600; text-decoration: none; margin: 0 8px; font-size: 0.88rem;">Website</a> &bull;
      <a href="https://givebutter.com/sustainable-music-northwest" style="color: #0f766e; font-weight: 600; text-decoration: none; margin: 0 8px; font-size: 0.88rem;">Donate</a> &bull;
      <a href="https://instagram.com" target="_blank" style="color: #0f766e; font-weight: 600; text-decoration: none; margin: 0 8px; font-size: 0.88rem;">Instagram</a> &bull;
      <a href="https://facebook.com" target="_blank" style="color: #0f766e; font-weight: 600; text-decoration: none; margin: 0 8px; font-size: 0.88rem;">Facebook</a> &bull;
      <a href="https://youtube.com" target="_blank" style="color: #0f766e; font-weight: 600; text-decoration: none; margin: 0 8px; font-size: 0.88rem;">YouTube</a>
    </div>
    <p style="margin: 0; font-size: 0.78rem; color: #746c62; line-height: 1.5;">
      Sustainable Music Northwest is a 501(c)(3) nonprofit cultural organization.<br>
      © 2026 Sustainable Music Northwest · Seattle, WA
    </p>
  </div>
`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  let b = req.body;
  if (!b || typeof b === 'string') { try { b = JSON.parse(b || '{}'); } catch (e) { b = {}; } }

  const type = b.type === 'community' ? 'community' : (b.type === 'roster' ? 'roster' : 'mailing');
  const email = clip(b.email, 200);
  const name = clip(b.name || 'Neighbor', 200);

  if (!email || email.indexOf('@') < 0) return res.status(400).json({ error: 'email required' });

  if (type === 'mailing') {
    try { await kv(['RPUSH', 'smnw:mailing', JSON.stringify({ ts: Date.now(), email })]); } catch (e) {}

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 620px; margin: 0 auto; border: 1px solid #e0ded9; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #1e1b18; padding: 24px 32px; border-bottom: 4px solid #dca842;">
          <h1 style="color: #dca842; margin: 0; font-size: 1.3rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 800;">Sustainable Music NW</h1>
          <p style="color: #a39c93; margin: 4px 0 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Community Concerts · Fair Wages</p>
        </div>
        <div style="padding: 28px 32px;">
          <h2 style="color: #1e1b18; font-size: 1.3rem; margin-top: 0;">Live music, back on your block.</h2>
          <p>Thank you for subscribing to Sustainable Music Northwest! We're glad to have you with us.</p>
          <div style="background-color: #faf9f6; border-left: 4px solid #dca842; padding: 16px 20px; margin: 20px 0; border-radius: 0 6px 6px 0;">
            <p style="margin: 0 0 6px; font-weight: 700; color: #1e1b18;">👀 What to Watch For:</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 0.92rem; color: #443e37;">
              <li style="margin-bottom: 6px;"><strong>Upcoming Block Concerts:</strong> Free, all-ages neighborhood gatherings in parks, cul-de-sacs, and residential streets.</li>
              <li style="margin-bottom: 6px;"><strong>Block Stage Drives:</strong> Opportunities to chip in and unlock duos, quartets, and big bands on local blocks.</li>
              <li><strong>Artist Spotlights:</strong> Stories and sounds from Pacific Northwest musicians paid fair union-scale wages.</li>
            </ul>
          </div>
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 18px 20px; border-radius: 6px; margin: 24px 0;">
            <h4 style="margin: 0 0 6px; color: #15803d; font-size: 1rem;">Support the Mission</h4>
            <p style="margin: 0 0 12px; font-size: 0.9rem; color: #166534; line-height: 1.5;">
              Every dollar contributed helps sponsor neighborhood sound gear, permits, and fair compensation for local artists.
            </p>
            <a href="https://givebutter.com/sustainable-music-northwest" target="_blank" style="display: inline-block; background-color: #dca842; color: #1e1b18; font-weight: 700; font-size: 0.9rem; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Donate to Sustainable Music NW</a>
          </div>
          <p style="margin-top: 24px; font-size: 0.95rem;">
            Warmly,<br><strong>Kevin & The Sustainable Music NW Team</strong><br>
            <a href="mailto:info@sustainablemusicnw.org" style="color: #0f766e; text-decoration: none;">info@sustainablemusicnw.org</a>
          </p>
        </div>
        ${emailFooterHtml}
      </div>
    `;

    try {
      await dispatchEmail({ to: email, subject: "Welcome to Sustainable Music Northwest!", html });
    } catch (err) {
      console.error('Newsletter email error:', err.message);
    }
    return res.status(200).json({ success: true });
  }

  if (type === 'community') {
    const interest = clip(b.interest || b.subject || 'General Volunteering', 200);
    const message = clip(b.message || b.notes || '', 2000);
    try { await kv(['RPUSH', 'smnw:community', JSON.stringify({ ts: Date.now(), name, email, interest, message })]); } catch (e) {}

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 620px; margin: 0 auto; border: 1px solid #e0ded9; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #1e1b18; padding: 24px 32px; border-bottom: 4px solid #dca842;">
          <h1 style="color: #dca842; margin: 0; font-size: 1.3rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 800;">Sustainable Music NW</h1>
          <p style="color: #a39c93; margin: 4px 0 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Community · Volunteer · Action</p>
        </div>
        <div style="padding: 28px 32px;">
          <h2 style="color: #1e1b18; font-size: 1.25rem; margin-top: 0;">Thank you for stepping forward, ${name}!</h2>
          <p>We received your note regarding: <strong>${interest}</strong>.</p>
          <p>Community champions and volunteers make decentralized, fair-wage music possible. A member of our team will follow up with you shortly.</p>
          <div style="background-color: #faf9f6; border-left: 4px solid #dca842; padding: 16px 20px; margin: 20px 0; border-radius: 0 6px 6px 0;">
            <p style="margin: 0 0 6px; font-weight: 700; color: #1e1b18;">🎵 In the Meantime:</p>
            <p style="margin: 0 0 8px; font-size: 0.92rem; color: #443e37;">Check out how neighborhoods across Seattle are pooling funds to bring bands directly to their blocks:</p>
            <p style="margin: 0;"><a href="https://sustainablemusicnw.org/blockstage" target="_blank" style="color: #0f766e; font-weight: 700; text-decoration: underline;">Explore the Block Stage Hub</a></p>
          </div>
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 18px 20px; border-radius: 6px; margin: 24px 0;">
            <h4 style="margin: 0 0 6px; color: #15803d; font-size: 1rem;">Support Our Work</h4>
            <p style="margin: 0 0 12px; font-size: 0.9rem; color: #166534; line-height: 1.5;">Help fund neighborhood sound kits and support fair wages for working artists.</p>
            <a href="https://givebutter.com/sustainable-music-northwest" target="_blank" style="display: inline-block; background-color: #dca842; color: #1e1b18; font-weight: 700; font-size: 0.9rem; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Donate via Givebutter</a>
          </div>
          <p style="margin-top: 24px; font-size: 0.95rem;">
            Warmly,<br><strong>Kevin & The Sustainable Music NW Team</strong><br>
            <a href="mailto:info@sustainablemusicnw.org" style="color: #0f766e; text-decoration: none;">info@sustainablemusicnw.org</a>
          </p>
        </div>
        ${emailFooterHtml}
      </div>
    `;

    try {
      await dispatchEmail({ to: email, subject: "Thank you for getting involved with Sustainable Music NW!", html });
      await dispatchEmail({
        to: 'info@sustainablemusicnw.org',
        replyTo: email,
        subject: `[Volunteer / Board Inquiry] ${name} (${interest})`,
        html: `<h3>New Community Inquiry</h3><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Interest:</strong> ${interest}</p><p><strong>Message:</strong><br>${message.replace(/\n/g, '<br>')}</p>`
      });
    } catch (err) {
      console.error('Community inquiry email error:', err.message);
    }
    return res.status(200).json({ success: true });
  }

  return res.status(200).json({ success: true });
};
