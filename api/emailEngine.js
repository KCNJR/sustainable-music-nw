// emailEngine.js
const nodemailer = require('nodemailer');
const fs = require('fs');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587', 10),
    secure: (process.env.EMAIL_SECURE === 'true' || process.env.SMTP_SECURE === 'true'),
    auth: {
        user: process.env.EMAIL_USER || process.env.SMTP_USER,
        pass: process.env.EMAIL_PASS || process.env.SMTP_PASS
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

Courtesy Checklist: Hosting a Simple Block Party
While we take care of coordinating the musicians, instruments, and live sound equipment, setting up your neighborhood block party is managed directly by you and your neighbors. Here are common practices most Seattle blocks follow:
1. Get a Free SDOT Block Party Permit: If you are gathering on a residential street, the City of Seattle offers simple block party permits via the SDOT portal (apply online 14–30 days in advance).
2. Notify Immediate Neighbors: Circulate a quick note or flyer to let everyone on the block know the date and hours.
3. Closing Off Residential Streets: Use temporary barricades or visible traffic cones at both ends of the block during party hours. Keep them easy to move for resident driveway access and emergency vehicles.
4. Power for the Band: Musicians bring their own equipment. Make sure an accessible outdoor extension cord or outlet is available nearby!

100% Risk-Free Guarantee:
Campaigns require an $850 Tier 1 baseline to confirm the show. If your block does not reach $850 by the cutoff date, no event occurs and 100% of pledges are automatically refunded back to donors via Givebutter. Zero risk for you or your neighbors!

📸 Want a custom photo on your drive?
Simply reply to this email with a photo of your street, block party, or neighbors, and we'll format and add it directly to your Givebutter page!

Warmly,

Kevin
Founder / Director, Sustainable Music Northwest
info@sustainablemusicnw.org
https://sustainablemusicnw.org`,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 620px; margin: 0 auto; border: 1px solid #e0ded9; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
                <!-- Header -->
                <div style="background-color: #1e1b18; padding: 24px 32px; border-bottom: 4px solid #dca842;">
                    <h1 style="color: #dca842; margin: 0; font-size: 1.3rem; text-transform: uppercase; letter-spacing: 0.08em;">Sustainable Music NW</h1>
                    <p style="color: #a39c93; margin: 4px 0 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Block Stage Neighborhood Concert Program</p>
                </div>

                <!-- Body Content -->
                <div style="padding: 28px 32px;">
                    <p style="font-size: 1.05rem; font-weight: bold; margin-top: 0;">Hi ${championName},</p>

                    <p>Thank you so much for stepping up as a Champion to initiate a Block Stage concert drive for <strong>${blockTitle}</strong>! We are thrilled to partner with you to bring live, fair-wage music into your neighborhood living room.</p>

                    <!-- Important Links Box -->
                    <div style="background-color: #faf9f6; border-left: 4px solid #dca842; padding: 16px 20px; margin: 20px 0; border-radius: 0 6px 6px 0;">
                        <p style="margin: 0 0 8px 0; font-size: 0.95rem;"><strong>Important Campaign Links:</strong></p>
                        <p style="margin: 0 0 6px 0;">👉 <strong>Your Live Givebutter Drive:</strong> <a href="${givebutterUrl}" target="_blank" style="color: #0f766e; font-weight: bold; text-decoration: underline;">${givebutterUrl}</a></p>
                        <p style="margin: 0;">🌐 <strong>Our Main Block Stage Hub:</strong> <a href="https://sustainablemusicnw.org/blockstage" target="_blank" style="color: #0f766e; font-weight: bold; text-decoration: underline;">sustainablemusicnw.org/blockstage</a></p>
                    </div>

                    <p>📄 <strong>Your Print-Ready Flyer is Attached:</strong><br>
                    We have attached your customized 8.5" x 11" promotional flyer directly to this email. It includes dynamic micro-math household breakdowns and a custom QR code encoded straight to your Givebutter page. Print a few out to post on light poles or hand out to neighbors!</p>

                    <!-- Custom Photo Callout Box -->
                    <div style="background-color: #fffdf5; border: 1px dashed #dca842; border-left: 4px solid #dca842; padding: 14px 18px; margin: 20px 0; border-radius: 0 6px 6px 0;">
                        <p style="margin: 0 0 4px 0; font-weight: bold; color: #1e1b18; font-size: 0.92rem;">📸 Want a custom photo on your drive?</p>
                        <p style="margin: 0; font-size: 0.88rem; color: #58595B;">Simply reply to this email with a photo of your street, block party, or neighbors, and we'll format and add it directly to your Givebutter page!</p>
                    </div>

                    <!-- Courtesy Checklist -->
                    <div style="background-color: #f0f7f9; border-left: 4px solid #0f766e; padding: 18px 20px; margin: 24px 0; border-radius: 0 6px 6px 0; font-size: 0.9rem; color: #443e37;">
                        <h4 style="margin: 0 0 10px; color: #0f766e; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em;">Courtesy Checklist: Hosting a Simple Block Party</h4>
                        <p style="margin: 0 0 10px; font-size: 0.88rem; color: #58595B;">While we coordinate the musicians, instruments, and live sound equipment, setting up your neighborhood gathering is organized directly by you and your neighbors. Here are common practices most Seattle blocks follow:</p>
                        <ol style="margin: 0; padding-left: 20px; line-height: 1.6;">
                            <li style="margin-bottom: 6px;"><strong>Free SDOT Block Party Permit:</strong> If planning a residential street closure, the City of Seattle offers simple, free block party permits through SDOT (submitted online 14–30 days in advance by a resident of the block).</li>
                            <li style="margin-bottom: 6px;"><strong>Notify Immediate Neighbors:</strong> Circulate a quick note or flyer to let everyone on the block know the date and hours so folks can plan parking and access.</li>
                            <li style="margin-bottom: 6px;"><strong>Closing Off Residential Streets:</strong> Position temporary street closure barricades or visible traffic cones at both ends of the block during party hours. Keep them easy to slide aside for local resident driveway access and emergency vehicles.</li>
                            <li><strong>Power for the Band:</strong> Musicians bring their own equipment. Make sure an accessible outdoor extension cord or exterior wall outlet from a neighboring house or garage is identified nearby!</li>
                        </ol>
                    </div>

                    <h3 style="color: #1e1b18; font-size: 1.05rem; text-transform: uppercase; margin-bottom: 0.4rem;">Why We Do This</h3>
                    <p style="font-size: 0.9rem; color: #58595B; margin-top: 0;">At Sustainable Music Northwest, our mission is to decentralize the arts and pay professional musicians fair, union-scale wages. By pooling small pledges across a block, neighborhood concerts become effortless community achievements.</p>

                    <h3 style="color: #1e1b18; font-size: 1.05rem; text-transform: uppercase; margin-bottom: 0.4rem;">100% Risk-Free Guarantee</h3>
                    <p style="font-size: 0.9rem; color: #58595B; margin-top: 0;">Campaigns require an $850 Tier 1 baseline to confirm the show. If your block does not reach $850 by the cutoff date, no event occurs and <strong>100% of pledges are automatically refunded back to donors</strong> via Givebutter. Zero risk for you or your neighbors!</p>

                    <p style="margin-top: 1.5rem; font-size: 0.92rem; color: #58595B;">If you have any questions or need help sharing your campaign on Nextdoor or email listservs, please reach out to me directly.</p>

                    <!-- Signature -->
                    <div style="border-top: 2px solid #dca842; padding-top: 1rem; margin-top: 1.5rem;">
                        <p style="margin: 0; font-weight: bold; color: #1e1b18; font-size: 1.05rem;">Kevin</p>
                        <p style="margin: 0; color: #0f766e; font-weight: 600; font-size: 0.9rem;">Founder / Director, Sustainable Music Northwest</p>
                        <p style="margin: 0.3rem 0 0 0; font-size: 0.85rem; color: #58595B;">
                            ✉️ <a href="mailto:info@sustainablemusicnw.org" style="color: #0f766e; text-decoration: none;">info@sustainablemusicnw.org</a><br>
                            🌐 <a href="https://sustainablemusicnw.org" target="_blank" style="color: #0f766e; text-decoration: none;">sustainablemusicnw.org</a>
                        </p>
                    </div>
                </div>

                <!-- Footer Bar -->
                <div style="background-color: #ede8df; padding: 14px 20px; text-align: center; font-size: 0.78rem; color: #746c62;">
                    © 2026 Sustainable Music Northwest · 501(c)(3) Nonprofit Cultural Organization · Seattle, WA
                </div>
            </div>
        `,
        attachments
    };

    return await transporter.sendMail(mailOptions);
}

module.exports = { sendChampionWelcomeEmail };