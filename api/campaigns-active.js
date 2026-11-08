module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.GIVEBUTTER_API_KEY ? process.env.GIVEBUTTER_API_KEY.trim() : null;

    if (apiKey) {
      const gbResponse = await fetch('https://api.givebutter.com/v1/campaigns', {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      const json = await gbResponse.json();
      const allCampaigns = json.data || json || [];

      const blockStageCampaigns = (Array.isArray(allCampaigns) ? allCampaigns : []).filter(c => {
        const title = (c.title || '').toLowerCase();
        const isStatusActive = (c.status === 'active' || c.status === 'ACTIVE');
        const isExcluded = title.includes('general donations') || 
                           title.includes('annual fund') || 
                           title.includes('spring fundraiser') || 
                           title.includes('master template');
        return isStatusActive && !isExcluded;
      });

      return res.status(200).json(blockStageCampaigns);
    }

    return res.status(200).json([
      {
        id: "wedgwood",
        campaign_id: "wedgwood",
        neighborhood_title: "Wedgwood Summer Block Party",
        champion_name: "Sarah M.",
        target_event_date: "July 15, 2026",
        amount_raised: 850,
        givebutter_url: "https://givebutter.com",
        description: "Bringing live acoustic soul and jazz to 35th Ave!"
      }
    ]);
  } catch (err) {
    console.error('Error fetching Givebutter campaigns:', err.message);
    return res.status(200).json([]);
  }
};
