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
        const isStatusActive = (c.status === 'active' || c.status === 'ACTIVE' || !c.status);
        const isExcluded = title.includes('general donations') || 
                           title.includes('annual fund') || 
                           title.includes('spring fundraiser') || 
                           title.includes('master template');
        return isStatusActive && !isExcluded;
      }).map(c => ({
        id: String(c.id || c.code || ''),
        title: c.title || 'Neighborhood Block Concert',
        champion_name: c.champion || 'Community Host',
        target_event_date: c.event_date || 'Upcoming 2026',
        raised: parseFloat(c.raised || c.amount_raised || 0),
        goal: parseFloat(c.goal || 1640),
        url: c.url || (c.slug ? `https://givebutter.com/${c.slug}` : 'https://givebutter.com'),
        description: c.description || 'Pooling funds to bring fair-wage, live music to our block!'
      }));

      return res.status(200).json(blockStageCampaigns);
    }

    // Default mock active campaigns
    return res.status(200).json([
      {
        id: "wedgwood",
        title: "Wedgwood Summer Block Party",
        champion_name: "Sarah M.",
        target_event_date: "July 15, 2026",
        raised: 850,
        goal: 1640,
        url: "https://givebutter.com",
        description: "Base duo confirmed! Pushing to unlock the 4-piece quartet ($1,640) and 7-piece big band ($2,850)!"
      },
      {
        id: "highland_park",
        title: "Highland Park Lawn Gathering",
        champion_name: "Marcus T.",
        target_event_date: "August 22, 2026",
        raised: 2050,
        goal: 2850,
        url: "https://givebutter.com",
        description: "5-piece quintet unlocked! Now reaching for the full 7-piece big band headliner ($2,850)."
      }
    ]);
  } catch (err) {
    console.error('Error fetching Givebutter campaigns:', err.message);
    return res.status(200).json([]);
  }
};
