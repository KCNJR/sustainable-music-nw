const fs = require('fs');
const path = require('path');
const os = require('os');
const { generateBlockStageFlyer } = require('./flyerEngine');
const { sendChampionWelcomeEmail } = require('./emailEngine');

const storageDir = os.tmpdir();

function parseMultipartOrJson(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    req.on('end', () => {
      const contentType = req.headers['content-type'] || '';
      const fields = {};

      if (contentType.includes('application/json')) {
        try { Object.assign(fields, JSON.parse(raw)); } catch(e) {}
      } else if (contentType.includes('multipart/form-data')) {
        const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
        const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]) : null;
        if (boundary) {
          const parts = raw.split('--' + boundary);
          for (const part of parts) {
            const nameMatch = part.match(/name="([^"]+)"/);
            if (nameMatch) {
              const fieldName = nameMatch[1];
              const bodyStart = part.indexOf('\r\n\r\n');
              if (bodyStart !== -1 && !part.includes('filename=')) {
                fields[fieldName] = part.slice(bodyStart + 4).replace(/\r\n$/, '').trim();
              }
            }
          }
        }
      } else if (req.body && typeof req.body === 'object') {
        Object.assign(fields, req.body);
      }
      resolve(fields);
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
    const campaignData = await parseMultipartOrJson(req);

    const championName = campaignData.champion_name || campaignData.name || 'Neighborhood Champion';
    const championEmail = campaignData.champion_email || campaignData.email || 'info@sustainablemusicnw.org';
    const neighborhoodTitle = campaignData.neighborhood_title || campaignData.neighborhood || 'Our Block Party';
    const targetDate = campaignData.target_event_date || campaignData.date || 'Upcoming 2026';
    const customDesc = campaignData.description || 
      `Funding live, fair-wage music on our street in ${neighborhoodTitle} with Sustainable Music Northwest!`;

    const campaignId = `cmp_${Date.now()}`;
    const pdfFileName = `Flyer-${campaignId}.pdf`;
    const pdfFilePath = path.join(storageDir, pdfFileName);

    let givebutterUrl = `https://givebutter.com/blockstage-${campaignId}`;
    let givebutterCode = `gb_${campaignId}`;

    const apiKey = process.env.GIVEBUTTER_API_KEY ? process.env.GIVEBUTTER_API_KEY.trim() : null;
    if (apiKey) {
      try {
        const gbPayload = {
          title: `${neighborhoodTitle} Block Stage Concert`,
          description: customDesc,
          goal: 1640,
          type: 'fundraise'
        };

        const gbResponse = await fetch('https://api.givebutter.com/v1/campaigns', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(gbPayload)
        });

        const gbData = await gbResponse.json();
        const dataObj = gbData.data || gbData;
        if (dataObj) {
          givebutterUrl = dataObj.url || (dataObj.slug ? `https://givebutter.com/${dataObj.slug}` : givebutterUrl);
          givebutterCode = dataObj.code || dataObj.id || givebutterCode;
        }
      } catch (gbErr) {
        console.warn('Givebutter provisioning warning:', gbErr.message);
      }
    }

    let flyerDataUri = null;
    let pdfBuffer = null;
    try {
      pdfBuffer = await generateBlockStageFlyer({
        champion_name: championName,
        champion_email: championEmail,
        neighborhood_title: neighborhoodTitle,
        target_event_date: targetDate,
        description: customDesc,
        givebutter_url: givebutterUrl
      }, pdfFilePath);

      if (Buffer.isBuffer(pdfBuffer)) {
        flyerDataUri = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
      } else if (fs.existsSync(pdfFilePath)) {
        flyerDataUri = `data:application/pdf;base64,${fs.readFileSync(pdfFilePath).toString('base64')}`;
      }
    } catch (flyerErr) {
      console.error('Flyer generation warning:', flyerErr.message);
    }

    // Await email dispatch directly so Vercel keeps the function running
    const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
    const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

    if (emailUser && emailPass && championEmail) {
      try {
        const flyerAttachment = Buffer.isBuffer(pdfBuffer) 
          ? pdfBuffer 
          : (flyerDataUri ? Buffer.from(flyerDataUri.split(',')[1], 'base64') : pdfFilePath);

        console.log(`Dispatching welcome email to ${championEmail}...`);
        await sendChampionWelcomeEmail({
          champion_name: championName,
          champion_email: championEmail,
          neighborhood_title: neighborhoodTitle,
          target_event_date: targetDate,
          givebutter_url: givebutterUrl
        }, flyerAttachment);
        console.log(`Email successfully delivered to ${championEmail}`);
      } catch (emailErr) {
        console.error('SMTP Email Error in Serverless:', emailErr.message);
      }
    } else {
      console.warn('EMAIL_USER or EMAIL_PASS not found. Email skipped.');
    }

    return res.status(200).json({
      success: true,
      campaign_id: campaignId,
      givebutter_code: givebutterCode,
      givebutter_url: givebutterUrl,
      flyer_pdf_url: flyerDataUri || `/storage/${pdfFileName}`,
      flyer_data_url: flyerDataUri,
      message: 'Campaign provisioned successfully.'
    });

  } catch (err) {
    console.error('Error creating campaign:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || 'Failed to provision campaign.' 
    });
  }
};
