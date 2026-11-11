
const nodemailer = require('nodemailer');

async function sendNewsletterWelcome(toEmail) {
  const emailUser = (process.env.EMAIL_USER || 'kevin@sustainablemusicnw.org').trim();
  const emailPass = (process.env.EMAIL_PASS || 'eozypawagwvqtpgx').replace(/[^a-zA-Z0-9]/g, '').trim();
  if (!toEmail || !emailPass) return;

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: emailUser, pass: emailPass }
  });

  await transporter.sendMail({
    from: '"Sustainable Music Northwest" <info@sustainablemusicnw.org>',
    to: toEmail,
    replyTo: 'info@sustainablemusicnw.org',
    subject: "Welcome to Sustainable Music Northwest!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; line-height: 1.6; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #1e1b18; padding: 20px; border-bottom: 4px solid #dca842;">
          <h2 style="color: #dca842; margin: 0;">Live music, back on your block.</h2>
        </div>
        <div style="padding: 24px;">
          <p>Thank you for subscribing to Sustainable Music Northwest!</p>
          <p>You'll be the first to hear about upcoming neighborhood block concerts, artist partnerships, and community initiatives across Seattle.</p>
        </div>
      </div>
    `
  }).catch(e => console.error("Newsletter email error:", e.message));
}

// Receives roster + mailing-list submissions and stores them in Vercel KV
// (Upstash Redis) via the REST API. No dependencies, plain fetch.

const URL_ = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

async function kv(cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  return r.json();
}

const clip = (s, n) => (s || '').toString().trim().slice(0, n);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }
  if (!URL_ || !TOKEN) { res.status(500).json({ error: 'store not configured' }); return; }

  let b = req.body;
  if (!b || typeof b === 'string') { try { b = JSON.parse(b || '{}'); } catch (e) { b = {}; } }

  const type = b.type === 'mailing' ? 'mailing' : 'roster';
  const email = clip(b.email, 200);
  if (!email || email.indexOf('@') < 0) { res.status(400).json({ error: 'email required' }); return; }

  const rec = type === 'mailing'
    ? { ts: Date.now(), email }
    : {
        ts: Date.now(), name: clip(b.name, 200), email,
        act: clip(b.act, 200), discipline: clip(b.discipline, 200),
        links: clip(b.links, 500), notes: clip(b.notes, 2000),
      };

  try {
    await kv(['RPUSH', 'smnw:' + type, JSON.stringify(rec)]);
    if (type === 'mailing') { await sendNewsletterWelcome(email); }
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'save failed' });
  }
};
