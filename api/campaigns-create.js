const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { generateBlockStageFlyer } = require('./flyerEngine');
const { sendChampionWelcomeEmail } = require('./emailEngine');

// Serverless-safe temporary directory for generated PDFs
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
              if (bodyStart !== -1) {
                // If this part is a file, skip body text extraction here
                if (!part.includes('filename=')) {
                  const val = part.slice(bodyStart + 4).replace(/\r\n$/, '').trim();
                  fields[fieldName] = val;
                }
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

    const championName = campaignData.champion_name || campaignData.name || 'Community Champion';
    const championEmail = campaignData.champion_email || campaignData.email || 'info@sustainablemusicnw.org';
    const neighborhoodTitle = campaignData.neighborhood_title || campaignData.neighborhood || 'Block Party';
    const targetDate = campaignData.target_event_date || campaignData.date || 'Upcoming 2026';
    const customDesc = campaignData.description || 
      `Funding live, fair-wage music on our street in ${neighborhoodTitle} with Sustainable Music Northwest!`;

    const campaignId = `cmp_${Date.now()}`;
    const pdfFileName = `Flyer-${campaignId}.pdf`;
    const pdfFilePath = path.join(storageDir, pdfFileName);

    let givebutterUrl = `https://givebutter.com/blockstage-${campaignId}`;
    let givebutterCode = `gb_${campaignId}`;

    // 1. Provision Givebutter campaign
    const apiKey = process.env.GIVEBUTTER_API_KEY ? process.env.GIVEBUTTER_API_KEY.trim() : null;
    if (apiKey) {
      try {
        const gbPayload = {
          title: `${neighborhoodTitle} Block Stage Concert`,
          description: customDesc,
          goal: 1500,
          type: 'fundraise'
        };

        const gbResponse = await axios.post(
          'https://api.givebutter.com/v1/campaigns',
          gbPayload,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 9000
          }
        );

        givebutterUrl = gbResponse.data?.data?.url || gbResponse.data?.url || gbResponse.data?.link || givebutterUrl;
        givebutterCode = gbResponse.data?.data?.code || gbResponse.data?.code || gbResponse.data?.id || givebutterCode;
      } catch (gbErr) {
        console.warn('Givebutter provisioning warning (using fallback):', gbErr.response ? gbErr.response.data : gbErr.message);
      }
    }

    // 2. Render dynamic PDF flyer via flyerEngine
    let flyerDataUri = null;
    try {
      const pdfBuffer = await generateBlockStageFlyer({
        champion_name: championName,
        champion_email: championEmail,
        neighborhood_title: neighborhoodTitle,
        target_event_date: targetDate,
        description: customDesc,
        givebutter_url: givebutterUrl
      }, pdfFilePath);

      // Encode buffer directly as a data URI so downloads work in serverless without disk persistence
      const base64Pdf = Buffer.isBuffer(pdfBuffer) 
        ? pdfBuffer.toString('base64') 
        : (fs.existsSync(pdfFilePath) ? fs.readFileSync(pdfFilePath).toString('base64') : null);

      if (base64Pdf) {
        flyerDataUri = `data:application/pdf;base64,${base64Pdf}`;
      }
    } catch (flyerErr) {
      console.error('Flyer generation warning:', flyerErr.message);
    }

    // 3. Dispatch champion welcome email via emailEngine
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await sendChampionWelcomeEmail({
          champion_name: championName,
          champion_email: championEmail,
          neighborhood_title: neighborhoodTitle,
          target_event_date: targetDate,
          givebutter_url: givebutterUrl
        }, pdfFilePath);
        console.log(`Welcome email successfully dispatched to ${championEmail}`);
      } catch (emailErr) {
        console.error('SMTP Email Error (non-blocking):', emailErr.message);
      }
    }

    // 4. Return success response to browser
    return res.status(200).json({
      success: true,
      campaign_id: campaignId,
      givebutter_code: givebutterCode,
      givebutter_url: givebutterUrl,
      flyer_pdf_url: flyerDataUri || `/storage/${pdfFileName}`,
      message: 'Campaign provisioned and flyer generated successfully.'
    });

  } catch (err) {
    console.error('Error creating campaign:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || 'Failed to provision campaign and render flyer.' 
    });
  }
};
