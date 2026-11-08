// emailEngine.js
const nodemailer = require('nodemailer');
const fs = require('fs');

const port = parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587', 10);
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: port,
    secure: port === 465, // false for 587 (STARTTLS), true for 465
    auth: {
        user: (process.env.EMAIL_USER || process.env.SMTP_USER || '').trim(),
        pass: (process.env.EMAIL_PASS || process.env.SMTP_PASS || '').replace(/\s+/g, '')
    }
});

async function sendChampionWelcomeEmail(campaignData, flyerAttachment) {
    const championName = campaignData.champion_name || 'Neighborhood Champion';
    const championEmail = campaignData.champion_email;
    const blockTitle = campaignData.neighborhood_title || 'Your Block Party';
    const givebutterUrl = campaignData.givebutter_url || 'https://givebutter.com';
    const eventDate = campaignData.target_event_date || 'Upcoming 2026';

    const attachments = [];
    if (Buffer.isBuffer(flyerAttachment)) {
        attachments.push({
            filename: `BlockStage-Flyer-${blockTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
            content: flyerAttachment
        });
    } else if (typeof flyerAttachment === 'string' && fs.existsSync(flyerAttachment)) {
        attachments.push({
            filename: `BlockStage-Flyer-${blockTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
            path: flyerAttachment
        });
    }

    const mailOptions = {
        from: '"Kevin / Sustainable Music Northwest" <info@sustainablemusicnw.org>',
        to: championEmail,
        replyTo: 'info@sustainablemusicnw.org',
        subject: `Your Block Stage Campaign is Live! — ${blockTitle}`,
        text: `Hi ${championName},

Thank you so much for starting a Block Stage campaign for ${blockTitle}! We are thrilled to partner with you to bring live, fair-wage music directly onto your street.

Your campaign dashboard & resources:
• Live Givebutter Drive: ${givebutterUrl}
• Main Block Stage Hub: https://sustainablemusicnw.org/blockstage
• Target Event Date: ${eventDate}

Your Print-Ready Flyer is Attached:
We have attached your customized 8.5" x 11" promotional flyer directly to this email with a custom QR code pointing straight to your Givebutter page. Print a few out to post on light poles or hand out to neighbors!

100% Risk-Free Guarantee:
Campaigns require an $850 Tier 1 baseline to confirm the show. If your block does not reach $850 by the cutoff date, no event occurs and 100% of pledges are automatically refunded back to donors via Givebutter.

Warmly,
Kevin
Founder / Director, Sustainable Music Northwest
info@sustainablemusicnw.org
https://sustainablemusicnw.org`,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 620px; margin: 0 auto; border: 1px solid #e0ded9; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #1e1b18; padding: 24px 32px; border-bottom: 4px solid #dca842;">
                    <h1 style="color: #dca842; margin: 0; font-size: 1.3rem; text-transform: uppercase; letter-spacing: 0.08em;">Sustainable Music NW</h1>
                    <p style="color: #a39c93; margin: 4px 0 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Block Stage Neighborhood Concert Program</p>
                </div>
                <div style="padding: 28px 32px;">
                    <p style="font-size: 1.05rem; font-weight: bold; margin-top: 0;">Hi ${championName},</p>
                    <p>Thank you so much for stepping up as a Champion to initiate a Block Stage concert drive for <strong>${blockTitle}</strong>!</p>
                    <div style="background-color: #faf9f6; border-left: 4px solid #dca842; padding: 16px 20px; margin: 20px 0; border-radius: 0 6px 6px 0;">
                        <p style="margin: 0 0 6px 0;">👉 <strong>Your Live Givebutter Drive:</strong> <a href="${givebutterUrl}" target="_blank" style="color: #0f766e; font-weight: bold; text-decoration: underline;">${givebutterUrl}</a></p>
                        <p style="margin: 0;">🌐 <strong>Our Main Block Stage Hub:</strong> <a href="https://sustainablemusicnw.org/blockstage" target="_blank" style="color: #0f766e; font-weight: bold; text-decoration: underline;">sustainablemusicnw.org/blockstage</a></p>
                    </div>
                    <p>📄 <strong>Your Print-Ready Flyer is Attached:</strong> We have attached your customized 8.5" x 11" promotional flyer with your custom QR code directly to this email.</p>
                </div>
                <div style="background-color: #ede8df; padding: 14px 20px; text-align: center; font-size: 0.78rem; color: #746c62;">
                    © 2026 Sustainable Music Northwest · Seattle, WA
                </div>
            </div>
        `,
        attachments
    };

    return await transporter.sendMail(mailOptions);
}

module.exports = { sendChampionWelcomeEmail };
