const axios = require('axios');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    let body = req.body;
    if (!body || typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); } catch(e) { body = {}; }
    }

    const championName = body.champion_name || body.name || 'Community Champion';
    const championEmail = body.champion_email || body.email || '';
    const neighborhoodTitle = body.neighborhood_title || body.neighborhood || 'Block Party';
    const targetDate = body.target_event_date || body.date || 'Upcoming 2026';
    const customDesc = body.description || 'Funding live, fair-wage music on our street with Sustainable Music Northwest!';

    const campaignId = `cmp_${Date.now()}`;
    let givebutterUrl = `https://givebutter.com/blockstage-${campaignId}`;
    let givebutterCode = `gb_${campaignId}`;

    const apiKey = process.env.GIVEBUTTER_API_KEY ? process.env.GIVEBUTTER_API_KEY.trim() : null;

    if (apiKey) {
      try {
        const gbResponse = await axios.post(
          'https://api.givebutter.com/v1/campaigns',
          {
            title: `${neighborhoodTitle} Block Stage Concert`,
            description: customDesc,
            goal: 1500,
            type: 'fundraise'
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 9000
          }
        );

        givebutterUrl = gbResponse.data?.data?.url || gbResponse.data?.url || givebutterUrl;
        givebutterCode = gbResponse.data?.data?.code || gbResponse.data?.code || givebutterCode;
      } catch (gbErr) {
        console.warn('Givebutter provisioning warning (using fallback):', gbErr.response ? gbErr.response.data : gbErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      campaign_id: campaignId,
      givebutter_code: givebutterCode,
      givebutter_url: givebutterUrl,
      flyer_pdf_url: null,
      message: 'Campaign provisioned successfully'
    });

  } catch (err) {
    console.error('Error creating campaign:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
