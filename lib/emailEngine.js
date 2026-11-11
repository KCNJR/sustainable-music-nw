const nodemailer = require('nodemailer');
const fs = require('fs');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: true, // Port 587 uses STARTTLS
    auth: {
        user: (process.env.EMAIL_USER || 'kevin@sustainablemusicnw.org').trim(),
        pass: (process.env.EMAIL_PASS || 'eozypawagwvqtpgx').replace(/[^a-zA-Z0-9]/g, '').trim(), '').trim()
    },
    tls: {
        rejectUnauthorized: false
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
        subject: `Your Block Stage Campaign is Live! ${blockTitle}`,
        text: `SUSTAINABLE MUSIC NW\nBLOCK STAGE NEIGHBORHOOD CONCERT PROGRAM\n\nHi ${championName},\n\nThank you so much for stepping up as a Champion to initiate a Block Stage concert drive for ${blockTitle}! We are thrilled to partner with you to bring live, fair-wage music into your neighborhood living room.\n\nImportant Campaign Links:\n• Your Live Givebutter Drive: ${givebutterUrl}\n• Our Main Block Stage Hub: https://sustainablemusicnw.org/blockstage\n• Target Event Date: ${eventDate}\n\nYour Print-Ready Flyer is Attached:\nWe have attached your customized 8.5" x 11" promotional flyer directly to this email. It includes dynamic micro-math household breakdowns and a custom QR code encoded straight to your Givebutter page. Print a few out to post on light poles or hand out to neighbors!\n\nWant a custom photo on your drive?\nSimply reply to this email with a photo of your street, block party, or neighbors, and we'll format and add it directly to your Givebutter page!\n\nCOURTESY CHECKLIST: HOSTING A SIMPLE BLOCK PARTY\nWhile we coordinate the musicians, instruments, and live sound equipment, setting up your neighborhood gathering is organized directly by you and your neighbors. Here are common practices most Seattle blocks follow:\n1. Free SDOT Block Party Permit: If planning a residential street closure, the City of Seattle offers simple, free block party permits through SDOT (submitted online 14–30 days in advance by a resident of the block).\n2. Notify Immediate Neighbors: Circulate a quick note or flyer to let everyone on the block know the date and hours so folks can plan parking and access.\n3. Closing Off Residential Streets: Position temporary street closure barricades or visible traffic cones at both ends of the block during party hours. Keep them easy to slide aside for local resident driveway access and emergency vehicles.\n4. Power for the Band: Musicians bring their own equipment. Make sure an accessible outdoor extension cord or exterior wall outlet from a neighboring house or garage is identified nearby!\n\nWHY WE DO THIS\nAt Sustainable Music Northwest, our mission is to decentralize the arts and pay professional musicians fair, union-scale wages. By pooling small pledges across a block, neighborhood concerts become effortless community achievements.\n\n100% RISK-FREE GUARANTEE\nCampaigns require an $850 Tier 1 baseline to confirm the show. If your block does not reach $850 by the cutoff date, no event occurs and 100% of pledges are automatically refunded back to donors via Givebutter. Zero risk for you or your neighbors!\n\nIf you have any questions or need help sharing your campaign on Nextdoor or email listservs, please reach out to me directly.\n\nKevin\nFounder / Director, Sustainable Music Northwest\ninfo@sustainablemusicnw.org\nsustainablemusicnw.org\n\n© 2026 Sustainable Music Northwest · 501(c)(3) Nonprofit Cultural Organization · Seattle, WA`,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 640px; margin: 0 auto; border: 1px solid #e0ded9; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
                <!-- Header -->
                <div style="background-color: #1e1b18; padding: 26px 32px; border-bottom: 4px solid #dca842;">
                    <h1 style="color: #dca842; margin: 0; font-size: 1.35rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 800;">Sustainable Music NW</h1>
                    <p style="color: #a39c93; margin: 4px 0 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.06em;">Block Stage Neighborhood Concert Program</p>
                </div>

                <!-- Body Content -->
                <div style="padding: 28px 32px;">
                    <p style="font-size: 1.05rem; font-weight: 700; margin-top: 0; color: #1e1b18;">Hi ${championName},</p>
                    <p style="color: #333333; font-size: 0.95rem; margin-bottom: 1.2rem;">Thank you so much for stepping up as a Champion to initiate a Block Stage concert drive for <strong>${blockTitle}</strong>! We are thrilled to partner with you to bring live, fair-wage music into your neighborhood living room.</p>

                    <!-- Important Links Box -->
                    <div style="background-color: #faf9f6; border-left: 4px solid #dca842; padding: 16px 20px; margin: 22px 0; border-radius: 0 6px 6px 0;">
                        <p style="margin: 0 0 8px 0; font-size: 0.95rem; font-weight: 700; color: #1e1b18;">Important Campaign Links:</p>
                        <p style="margin: 0 0 6px 0; font-size: 0.92rem;">👉 <strong>Your Live Givebutter Drive:</strong> <a href="${givebutterUrl}" target="_blank" style="color: #0f766e; font-weight: 700; text-decoration: underline;">${givebutterUrl}</a></p>
                        <p style="margin: 0; font-size: 0.92rem;">🌐 <strong>Our Main Block Stage Hub:</strong> <a href="https://sustainablemusicnw.org/blockstage" target="_blank" style="color: #0f766e; font-weight: 700; text-decoration: underline;">sustainablemusicnw.org/blockstage</a></p>
                    </div>

                    <p style="font-size: 0.95rem; color: #333333; margin-bottom: 1.2rem;">
                        <strong>Your Print-Ready Flyer is Attached:</strong><br>
                        We have attached your customized 8.5" &times; 11" promotional flyer directly to this email. It includes dynamic micro-math household breakdowns and a custom QR code encoded straight to your Givebutter page. Print a few out to post on light poles or hand out to neighbors!
                    </p>

                    <!-- Custom Photo Callout Box -->
                    <div style="background-color: #fffdf5; border: 1px dashed #dca842; border-left: 4px solid #dca842; padding: 14px 18px; margin: 22px 0; border-radius: 0 6px 6px 0;">
                        <p style="margin: 0 0 4px 0; font-weight: 700; color: #1e1b18; font-size: 0.95rem;">📸 Want a custom photo on your drive?</p>
                        <p style="margin: 0; font-size: 0.88rem; color: #58595B; line-height: 1.5;">Simply reply to this email with a photo of your street, block party, or neighbors, and we'll format and add it directly to your Givebutter page!</p>
                    </div>

                    <!-- Courtesy Checklist -->
                    <div style="background-color: #f0f7f9; border-left: 4px solid #0f766e; padding: 18px 22px; margin: 24px 0; border-radius: 0 6px 6px 0; font-size: 0.9rem; color: #333333;">
                        <h4 style="margin: 0 0 8px; color: #0f766e; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800;">COURTESY CHECKLIST: HOSTING A SIMPLE BLOCK PARTY</h4>
                        <p style="margin: 0 0 12px; font-size: 0.88rem; color: #58595B; line-height: 1.5;">While we coordinate the musicians, instruments, and live sound equipment, setting up your neighborhood gathering is organized directly by you and your neighbors. Here are common practices most Seattle blocks follow:</p>
                        <ol style="margin: 0; padding-left: 20px; line-height: 1.65; font-size: 0.88rem;">
                            <li style="margin-bottom: 8px;"><strong>Free SDOT Block Party Permit:</strong> If planning a residential street closure, the City of Seattle offers simple, free block party permits through SDOT (submitted online 14–30 days in advance by a resident of the block).</li>
                            <li style="margin-bottom: 8px;"><strong>Notify Immediate Neighbors:</strong> Circulate a quick note or flyer to let everyone on the block know the date and hours so folks can plan parking and access.</li>
                            <li style="margin-bottom: 8px;"><strong>Closing Off Residential Streets:</strong> Position temporary street closure barricades or visible traffic cones at both ends of the block during party hours. Keep them easy to slide aside for local resident driveway access and emergency vehicles.</li>
                            <li><strong>Power for the Band:</strong> Musicians bring their own equipment. Make sure an accessible outdoor extension cord or exterior wall outlet from a neighboring house or garage is identified nearby!</li>
                        </ol>
                    </div>

                    <h3 style="color: #1e1b18; font-size: 1.05rem; text-transform: uppercase; margin: 22px 0 6px; letter-spacing: 0.04em; font-weight: 800;">WHY WE DO THIS</h3>
                    <p style="font-size: 0.92rem; color: #58595B; margin-top: 0; line-height: 1.6;">At Sustainable Music Northwest, our mission is to decentralize the arts and pay professional musicians fair, union-scale wages. By pooling small pledges across a block, neighborhood concerts become effortless community achievements.</p>

                    <h3 style="color: #1e1b18; font-size: 1.05rem; text-transform: uppercase; margin: 22px 0 6px; letter-spacing: 0.04em; font-weight: 800;">100% RISK-FREE GUARANTEE</h3>
                    <p style="font-size: 0.92rem; color: #58595B; margin-top: 0; line-height: 1.6;">Campaigns require an $850 Tier 1 baseline to confirm the show. If your block does not reach $850 by the cutoff date, no event occurs and <strong>100% of pledges are automatically refunded back to donors</strong> via Givebutter. Zero risk for you or your neighbors!</p>

                    <p style="margin-top: 1.5rem; font-size: 0.92rem; color: #58595B; line-height: 1.6;">If you have any questions or need help sharing your campaign on Nextdoor or email listservs, please reach out to me directly.</p>

                    <!-- Signature -->
                    <div style="border-top: 2px solid #dca842; padding-top: 1.2rem; margin-top: 1.8rem;">
                        <p style="margin: 0; font-weight: 800; color: #1e1b18; font-size: 1.1rem;">Kevin</p>
                        <p style="margin: 2px 0 0; color: #0f766e; font-weight: 600; font-size: 0.9rem;">Founder / Director, Sustainable Music Northwest</p>
                        <p style="margin: 6px 0 0; font-size: 0.88rem; color: #58595B;">
                            <a href="mailto:info@sustainablemusicnw.org" style="color: #0f766e; text-decoration: none;">info@sustainablemusicnw.org</a><br>
                            <a href="https://sustainablemusicnw.org" target="_blank" style="color: #0f766e; text-decoration: none;">sustainablemusicnw.org</a>
                        </p>
                    </div>
                </div>

                <!-- Footer Bar -->
                <div style="background-color: #ede8df; padding: 14px 20px; text-align: center; font-size: 0.78rem; color: #746c62;">
                    &copy; 2026 Sustainable Music Northwest &middot; 501(c)(3) Nonprofit Cultural Organization &middot; Seattle, WA
                </div>
            </div>
        `,
        attachments
    };

    console.log(`[SMTP] Connecting to smtp.gmail.com as ${process.env.EMAIL_USER}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Email successfully delivered: ${info.messageId}`);
    return info;
}

module.exports = { sendChampionWelcomeEmail };
