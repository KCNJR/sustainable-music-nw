const fs = require('fs');
const path = require('path');
const os = require('os');
const { generateBlockStageFlyer } = require('../../lib/flyerEngine');
const { sendChampionWelcomeEmail } = require('../../lib/emailEngine');

function parseBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    req.on('end', () => {
      let data = {};
      const ctype = req.headers['content-type'] || '';
      if (ctype.includes('application/json')) {
        try { data = JSON.parse(raw); } catch(e) {}
      } else if (ctype.includes('multipart/form-data')) {
        const boundary = (ctype.match(/boundary=(?:"([^"]+)"|([^;]+))/i) || [])[1] || '';
        if (boundary) {
          raw.split('--' + boundary).forEach(part => {
            const m = part.match(/name="([^"]+)"/);
            if (m && !part.includes('filename=')) {
              const start = part.indexOf('\r\n\r\n');
              if (start !== -1) data[m[1]] = part.slice(start + 4).replace(/\r\n$/, '').trim();
            }
          });
        }
      }
      if (req.body && typeof req.body === 'object') Object.assign(data, req.body);
      resolve(data);
    });
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const data = await parseBody(req);
    const championName = data.champion_name || data.name || 'Neighborhood Champion';
    const championEmail = data.champion_email || data.email || '';
    const neighborhoodTitle = data.neighborhood_title || data.neighborhood || 'Our Block Party';
    const targetDate = data.target_event_date || data.date || 'Upcoming 2026';
    const description = data.description || `Funding live, fair-wage music on our street in ${neighborhoodTitle} with Sustainable Music Northwest!`;

    const campaignId = `cmp_${Date.now()}`;
    let givebutterUrl = `https://givebutter.com/blockstage-${campaignId}`;
    let givebutterCode = `gb_${campaignId}`;

    const apiKey = (process.env.GIVEBUTTER_API_KEY || '').trim();
    if (apiKey) {
      try {
        const gbRes = await fetch('https://api.givebutter.com/v1/campaigns', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            title: `${neighborhoodTitle} Block Stage Concert`,
            description,
            goal: 1640,
            type: 'fundraise'
          })
        });
        const gbData = await gbRes.json();
        const obj = gbData.data || gbData;
        if (obj && (obj.url || obj.slug)) {
          givebutterUrl = obj.url || `https://givebutter.com/${obj.slug}`;
          givebutterCode = obj.code || obj.id || givebutterCode;
        }
      } catch (gbErr) {
        console.warn('Givebutter provisioning warning:', gbErr.message);
      }
    }

    // Generate PDF flyer
    const pdfPath = path.join(os.tmpdir(), `Flyer-${campaignId}.pdf`);
    let pdfBuffer = null;
    let flyerDataUri = null;
    try {
      pdfBuffer = await generateBlockStageFlyer({
        champion_name: championName,
        champion_email: championEmail,
        neighborhood_title: neighborhoodTitle,
        target_event_date: targetDate,
        description,
        givebutter_url: givebutterUrl
      }, pdfPath);

      if (Buffer.isBuffer(pdfBuffer)) {
        flyerDataUri = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
      } else if (fs.existsSync(pdfPath)) {
        pdfBuffer = fs.readFileSync(pdfPath);
        flyerDataUri = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
      }
    } catch (flyerErr) {
      console.warn('Flyer generation warning:', flyerErr.message);
    }

    // Dispatch welcome email
    const emailUser = (process.env.EMAIL_USER || 'kevin@sustainablemusicnw.org').trim();
    const emailPass = (process.env.EMAIL_PASS || 'eozypawagwvqtpgx').replace(/[^a-zA-Z0-9]/g, '').trim();

    if (championEmail && emailPass) {
      try {
        await sendChampionWelcomeEmail({
          champion_name: championName,
          champion_email: championEmail,
          neighborhood_title: neighborhoodTitle,
          target_event_date: targetDate,
          givebutter_url: givebutterUrl
        }, pdfBuffer || pdfPath);
        console.log(`Welcome email dispatched to ${championEmail}`);
      } catch (emailErr) {
        console.error('SMTP Email Error in Serverless:', emailErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      campaign_id: campaignId,
      givebutter_code: givebutterCode,
      givebutter_url: givebutterUrl,
      flyer_pdf_url: flyerDataUri || null,
      message: 'Campaign created successfully.'
    });

  } catch (err) {
    console.error('Campaign creation error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Error creating campaign' });
  }
};
