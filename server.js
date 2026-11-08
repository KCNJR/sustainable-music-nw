// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const fs = require('fs');
const axios = require('axios');
const multer = require('multer');
const { generateBlockStageFlyer } = require('./flyerEngine');
const { sendChampionWelcomeEmail } = require('./emailEngine');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer memory storage so multipart/form-data fields parse cleanly
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Safe temporary directory for PDF generation
const storageDir = process.env.VERCEL ? os.tmpdir() : path.join(__dirname, 'storage');
if (!fs.existsSync(storageDir)) {
    try {
        fs.mkdirSync(storageDir, { recursive: true });
    } catch (e) {
        // Safe fallback in read-only environments
    }
}
app.use('/storage', express.static(storageDir));

const getApiKey = () => {
    const rawKey = process.env.GIVEBUTTER_API_KEY;
    return rawKey ? rawKey.replace(/['"]/g, '').trim() : null;
};

// GET /api/campaigns/active
app.get('/api/campaigns/active', async (req, res) => {
    const apiKey = getApiKey();

    if (!apiKey) {
        console.warn('GIVEBUTTER_API_KEY is not defined. Serving default active campaigns.');
        return res.json([
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
    }

    try {
        const gbResponse = await axios.get('https://api.givebutter.com/v1/campaigns', {
            headers: {
                'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }, timeout: 9000 });  const rawData = gbResponse.data; const allCampaigns = Array.isArray(rawData) ? rawData : (rawData.data \vert{}\vert{} []);  const blockStageCampaigns = allCampaigns .filter(c => { const title = (c.title \vert{}\vert{} '').toLowerCase(); const isStatusActive = (c.status === 'active' \vert{}\vert{} c.status === 'ACTIVE' \vert{}\vert{} !c.status); const isExcluded = title.includes('general donations') \vert{}\vert{} title.includes('annual fund') \vert{}\vert{} title.includes('spring fundraiser') \vert{}\vert{} title.includes('master template') \vert{}\vert{} title.includes('template'); return isStatusActive && !isExcluded; }) .map(c => ({ id: String(c.id \vert{}\vert{} c.code \vert{}\vert{} ''), code: c.code \vert{}\vert{} String(c.id \vert{}\vert{} ''), title: c.title \vert{}\vert{} 'Neighborhood Block Concert', champion_name: c.champion \vert{}\vert{} 'Community Host', target_event_date: c.event_date \vert{}\vert{} 'Upcoming 2026', raised: parseFloat(c.raised \vert{}\vert{} c.amount_raised \vert{}\vert{} 0), goal: parseFloat(c.goal \vert{}\vert{} 1640), url: c.url \vert{}\vert{} (c.slug ? `https://givebutter.com/${c.slug}` : 'https://givebutter.com'),
                description: c.description || 'Pooling funds to bring fair-wage, live music to our block!'
            }));

        return res.json(blockStageCampaigns);
    } catch (err) {
        console.error('Error fetching Givebutter campaigns:', err.response ? err.response.data : err.message);
        return res.json([]);
    }
});

// POST /api/campaigns/create
app.post('/api/campaigns/create', upload.single('campaign_photo'), async (req, res) => {
    try {
        const {
            champion_name,
            champion_email,
            neighborhood_title,
            venue_type,
            target_event_date,
            genre_preference,
            micro_pledge_target,
            description
        } = req.body;

        if (!champion_name || !champion_email || !neighborhood_title) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }

        const campaignId = `cmp_${Date.now()}`; let givebutterUrl = `https://givebutter.com/blockstage-${campaignId}`;
        let givebutterCode = `gb_${campaignId}`;  const apiKey = getApiKey(); if (apiKey) { try { const gbPayload = { title: `${neighborhood_title} Block Stage Concert`,
                    description: description || `Live neighborhood concert organized by ${champion_name}.`,
                    goal: 1640,
                    type: 'fundraise'
                };

                const gbResponse = await axios.post(
                    'https://api.givebutter.com/v1/campaigns',
                    gbPayload,
                    {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }, timeout: 9000 } );  const gbData = gbResponse.data.data \vert{}\vert{} gbResponse.data; if (gbData) { givebutterUrl = gbData.url \vert{}\vert{} (gbData.slug ? `https://givebutter.com/${gbData.slug}` : givebutterUrl);
                    givebutterCode = gbData.code || gbData.id || givebutterCode;
                }
            } catch (gbErr) {
                console.warn('Givebutter provisioning warning (using fallback link):', gbErr.response ? gbErr.response.data : gbErr.message);
            }
        }

        const campaignRecord = {
            id: campaignId,
            champion_name,
            champion_email,
            neighborhood_title,
            venue_type,
            target_event_date,
            genre_preference,
            micro_pledge_target: micro_pledge_target || 100,
            givebutter_url: givebutterUrl
        };

        const safeSlug = (neighborhood_title || 'BlockStage').replace(/[^a-zA-Z0-9]/g, '_');
        const pdfFileName = `BlockStage-Flyer-${safeSlug}.pdf`; const tempPdfPath = path.join(storageDir, pdfFileName);  const pdfBuffer = await generateBlockStageFlyer(campaignRecord, tempPdfPath); const flyerDataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

        if ((process.env.EMAIL_USER || process.env.SMTP_USER) && champion_email) {
            try {
                console.log(`Sending welcome email to ${champion_email}...`);
                await sendChampionWelcomeEmail(campaignRecord, pdfBuffer);
                console.log(`Welcome email successfully sent to ${champion_email}`);
            } catch (emailErr) {
                console.error('Nodemailer dispatch error:', emailErr.message);
            }
        } else {
            console.warn('EMAIL_USER is not configured. Email skipped.');
        }

        return res.json({
            success: true,
            campaign_id: campaignId,
            givebutter_code: givebutterCode,
            givebutter_url: givebutterUrl,
            flyer_data_url: flyerDataUrl,
            flyer_pdf_url: flyerDataUrl
        });

    } catch (err) {
        console.error('Error in /api/campaigns/create:', err);
        return res.status(500).json({ success: false, message: err.message || 'Internal server error.' });
    }
});

// Express 5 wildcard fallback
app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Block Stage server listening at http://localhost:${PORT}`);
    });
}

module.exports = app;
