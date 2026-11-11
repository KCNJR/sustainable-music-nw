const http = require('http');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// 1. Read .env file directly
let env = {};
if (fs.existsSync(path.join(ROOT, '.env'))) {
  const lines = fs.readFileSync(path.join(ROOT, '.env'), 'utf-8').split('\n');
  lines.forEach(l => {
    const p = l.split('=');
    if (p[0] && p[1]) env[p[0].trim()] = p.slice(1).join('=').trim();
  });
}

const EMAIL_USER = (env.EMAIL_USER || process.env.EMAIL_USER || 'info@sustainablemusicnw.org').trim();
const EMAIL_PASS = (env.EMAIL_PASS || process.env.EMAIL_PASS || '').replace(/[^a-zA-Z0-9]/g, '').trim();
const EMAIL_HOST = env.EMAIL_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(env.EMAIL_PORT || process.env.EMAIL_PORT || '587', 10);
const GB_KEY = (env.GIVEBUTTER_API_KEY || process.env.GIVEBUTTER_API_KEY || '').trim();

const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_PORT === 465,
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  tls: { rejectUnauthorized: false }
});

// PDF Flyer Buffer Generator with Template Graphic
function generateFlyerBuffer(data) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 0 });
      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      const possibleTemplates = [
        path.join(ROOT, 'templates', 'New Template Block Stage.jpg'),
        path.join(ROOT, 'api', 'campaigns', 'templates', 'New Template Block Stage.jpg'),
        path.join(ROOT, 'New Template Block Stage.jpg')
      ];
      let tPath = possibleTemplates.find(p => fs.existsSync(p));
      if (tPath) {
        doc.image(tPath, 0, 0, { width: 612, height: 792 });
      } else {
        doc.rect(0, 0, 612, 792).fill('#F8F7F4');
      }

      const rawText = data.neighborhood_title ? data.neighborhood_title.trim() : 'OUR BLOCK';
      const neighborhoodText = `${rawText.toUpperCase()}!`;
      let fontSize = 22;
      let yPos = 182;
      if (neighborhoodText.length <= 25) { fontSize = 30; yPos = 186; }
      else if (neighborhoodText.length > 55) { fontSize = 14; yPos = 176; }

      doc.fillColor('#182723')
         .font('Helvetica-Bold')
         .fontSize(fontSize)
         .text(neighborhoodText, 43.2, yPos, { width: 521.28, align: 'center' });

      doc.fillColor('#182723')
         .font('Helvetica-Bold')
         .fontSize(20)
         .text(data.target_event_date || 'Upcoming 2026', 233.5, 247, { width: 194.9, align: 'left' });

      doc.fillColor('#E85E2F')
         .font('Helvetica')
         .fontSize(16)
         .text(data.champion_name || 'Neighborhood Champion', 44.4, 702, { width: 191.3, align: 'center' });

      doc.fillColor('#E85E2F')
         .font('Helvetica')
         .fontSize(16)
         .text(data.champion_email || 'info@sustainablemusicnw.org', 256.1, 702, { width: 191.3, align: 'center' });

      const qrBuf = await QRCode.toBuffer(data.givebutter_url || 'https://sustainablemusicnw.org/blockstage', {
        width: 300,
        margin: 1,
        color: { dark: '#132736', light: '#FFFFFF' }
      });
      doc.image(qrBuf, 468.1, 632.7, { width: 104.4, height: 104.4 });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

const mimeTypes = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.pdf': 'application/pdf'
};

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.writeHead(200); return res.end(); }

  const urlPath = req.url.split('?')[0];

  // ==========================================
  // GET /api/campaigns/active (GIVEBUTTER API)
  // ==========================================
  if (req.method === 'GET' && urlPath === '/api/campaigns/active') {
    res.setHeader('Content-Type', 'application/json');

    if (!GB_KEY) {
      console.warn('[Givebutter] No GIVEBUTTER_API_KEY found in .env');
      res.writeHead(200);
      return res.end(JSON.stringify([]));
    }

    try {
      console.log('[Givebutter] Querying https://api.givebutter.com/v1/campaigns...');
      const gbResponse = await fetch('https://api.givebutter.com/v1/campaigns', {
        headers: {
          'Authorization': `Bearer ${GB_KEY}`,
          'Accept': 'application/json'
        }
      });

      const json = await gbResponse.json();
      const allCampaigns = json.data || json || [];

      const blockStageCampaigns = (Array.isArray(allCampaigns) ? allCampaigns : []).filter(c => {
        const title = (c.title || '').toLowerCase();
        const isStatusActive = (c.status === 'active' || c.status === 'ACTIVE' || !c.status);
        const isExcluded = title.includes('general donations') ||
                           title.includes('annual fund') ||
                           title.includes('spring fundraiser') ||
                           title.includes('master template') ||
                           title.includes('template');
        return isStatusActive && !isExcluded;
      }).map(c => ({
        id: String(c.id || c.code || ''),
        title: c.title || 'Neighborhood Block Concert',
        champion_name: c.champion || 'Community Champion',
        target_event_date: c.event_date || 'Upcoming 2026',
        raised: parseFloat(c.raised || c.amount_raised || 0),
        goal: parseFloat(c.goal || 1640),
        url: c.url || (c.slug ? `https://givebutter.com/${c.slug}` : 'https://givebutter.com'),
        description: c.description || 'Pooling funds to bring live music to our block!'
      }));

      console.log(`✔ [Givebutter] Found ${blockStageCampaigns.length} active Block Stage campaign(s).`);
      res.writeHead(200);
      return res.end(JSON.stringify(blockStageCampaigns));
    } catch (err) {
      console.error('❌ [Givebutter Error]:', err.message);
      res.writeHead(200);
      return res.end(JSON.stringify([]));
    }
  }

  // ==========================================
  // POST ENDPOINTS
  // ==========================================
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      let data = {};
      try { data = JSON.parse(body || '{}'); } catch(e) {}

      // 1. Mailing List Signup
      if (urlPath === '/api/submit' || urlPath === '/api/newsletter-signup') {
        const email = data.email;
        if (email && EMAIL_PASS) {
          transporter.sendMail({
            from: `"Sustainable Music Northwest" <${EMAIL_USER}>`,
            to: email,
            subject: "Welcome to Sustainable Music Northwest!",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; line-height: 1.6; color: #1e293b;">
                <h2 style="color: #dca842;">Live music, back on your block.</h2>
                <p>Thank you for subscribing to Sustainable Music Northwest!</p>
              </div>
            `
          }).catch(err => console.error('Newsletter Email Error:', err.message));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      }

      // 2. Get Involved Form
      if (urlPath === '/api/get-involved') {
        const { name, email, interest, message } = data;
        if (email && EMAIL_PASS) {
          await transporter.sendMail({
            from: `"Sustainable Music Northwest" <${EMAIL_USER}>`,
            to: email,
            subject: "Thank you for getting involved with Sustainable Music NW!",
            html: `<h3>Thank you for reaching out, ${name || 'Neighbor'}!</h3><p>We received your note regarding: ${interest || 'General'}.</p>`
          }).catch(() => {});

          await transporter.sendMail({
            from: `"SMNW Inquiries" <${EMAIL_USER}>`,
            to: 'info@sustainablemusicnw.org',
            replyTo: email,
            subject: `[Volunteer / Board Inquiry] ${name || 'New Submission'} (${interest})`,
            html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Interest:</strong> ${interest}</p><p><strong>Message:</strong> ${message}</p>`
          }).catch(() => {});
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      }

      // 3. Campaign Booking: Create Live in Givebutter, Generate Flyer & Send Branded Email
      if (urlPath === '/api/campaigns/create') {
        const champ_name = data.champion_name || 'Neighborhood Champion';
        const champ_email = data.champion_email;
        const neighborhood = data.neighborhood_title || 'Your Block Party';
        const date = data.target_event_date || 'Upcoming 2026';
        const customDesc = data.description || `Funding live music in ${neighborhood} with Sustainable Music Northwest!`;

        let givebutterUrl = `https://givebutter.com/blockstage-${Date.now().toString().slice(-6)}`;
        let givebutterCode = `gb_${Date.now()}`;

        // Live Givebutter POST
        if (GB_KEY) {
          try {
            console.log(`[Givebutter] Creating new campaign for "${neighborhood}"...`);
            const gbRes = await fetch('https://api.givebutter.com/v1/campaigns', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${GB_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                title: `${neighborhood} Block Stage Concert`,
                description: customDesc,
                goal: 1640,
                type: 'fundraise'
              })
            });

            const gbData = await gbRes.json();
            if (gbData && (gbData.url || (gbData.data && gbData.data.url))) {
              givebutterUrl = gbData.url || (gbData.data && gbData.data.url);
              givebutterCode = gbData.code || (gbData.data && gbData.data.code);
              console.log(`✔ [Givebutter SUCCESS] Live campaign created: ${givebutterUrl}`);
            } else {
              console.warn('[Givebutter] Response warning:', JSON.stringify(gbData));
            }
          } catch (gbErr) {
            console.error('❌ [Givebutter Create Error]:', gbErr.message);
          }
        }

        // Generate Flyer Buffer
        let flyerBuffer = null;
        try {
          flyerBuffer = await generateFlyerBuffer({
            neighborhood_title: neighborhood,
            target_event_date: date,
            champion_name: champ_name,
            champion_email: champ_email,
            givebutter_url: givebutterUrl
          });
        } catch (e) {
          console.error('Flyer generation error:', e.message);
        }

        // Send Full Branded Welcome Email
        if (champ_email && EMAIL_PASS) {
          console.log(`[SMTP] Sending full welcome email to: ${champ_email}`);
          transporter.sendMail({
            from: `"Kevin / Sustainable Music Northwest" <${EMAIL_USER}>`,
            to: champ_email,
            replyTo: 'info@sustainablemusicnw.org',
            subject: `Your Block Stage Campaign is Live! — ${neighborhood}`,
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0ded9; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #1e1b18; padding: 20px; border-bottom: 4px solid #dca842;">
                  <h1 style="color: #dca842; margin: 0; font-size: 1.3rem;">SUSTAINABLE MUSIC NW</h1>
                  <p style="color: #a39c93; margin: 4px 0 0; font-size: 0.85rem;">BLOCK STAGE NEIGHBORHOOD CONCERT PROGRAM</p>
                </div>
                <div style="padding: 24px;">
                  <p><strong>Hi ${champ_name},</strong></p>
                  <p>Thank you so much for stepping up as a Champion to initiate a Block Stage concert drive for <strong>${neighborhood}</strong>!</p>
                  <div style="background-color: #faf9f6; border-left: 4px solid #dca842; padding: 14px; margin: 18px 0;">
                    <p style="margin: 0 0 6px 0;">👉 <strong>Your Live Givebutter Drive:</strong> <a href="${givebutterUrl}" target="_blank" style="color: #0f766e; font-weight: bold;">${givebutterUrl}</a></p>
                    <p style="margin: 0;">🌐 <strong>Our Main Block Stage Hub:</strong> <a href="https://sustainablemusicnw.org/blockstage" target="_blank" style="color: #0f766e;">sustainablemusicnw.org/blockstage</a></p>
                  </div>
                  <p>📄 <strong>Your Print-Ready Flyer is Attached:</strong> It includes your custom QR code.</p>
                </div>
              </div>
            `,
            attachments: flyerBuffer ? [
              {
                filename: `BlockStage-Flyer-${neighborhood.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
                content: flyerBuffer
              }
            ] : []
          }).then(i => console.log('✔ [SMTP] Welcome email delivered to:', champ_email))
            .catch(err => console.error('SMTP Error:', err.message));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          flyer_pdf_url: flyerBuffer ? `data:application/pdf;base64,${flyerBuffer.toString('base64')}` : null,
          givebutter_url: givebutterUrl
        }));
      }

      res.writeHead(404);
      res.end();
    });
    return;
  }

  // ==========================================
  // STATIC ASSETS SERVING
  // ==========================================
  let filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) filePath = path.join(ROOT, 'index.html');
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 SMNW Server running on http://localhost:${PORT}`);
  console.log(`🔑 Givebutter Key Detected: ${GB_KEY ? 'YES (' + GB_KEY.slice(0, 6) + '...)' : 'NO (Check .env)'}`);
  console.log(`=================================================\n`);
});
