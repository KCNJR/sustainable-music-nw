// flyerEngine.js
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

/**
 * Dynamically measures rendered string height inside PDFKit to guarantee headline fit.
 */
function calculateDynamicFontSize(doc, text, maxWidth, maxHeight) {
    let fontSize = 28;
    while (fontSize > 12) {
        doc.fontSize(fontSize).font('Helvetica-Bold');
        const height = doc.heightOfString(text, { width: maxWidth, lineGap: -1 });
        if (height <= maxHeight) break;
        fontSize -= 1;
    }
    let yPos = 188;
    if (fontSize < 16) yPos = 182;
    else if (fontSize < 22) yPos = 184;
    else if (fontSize < 26) yPos = 186;
    return { fontSize, yPos };
}

/**
 * Generates an 8.5" x 11" flyer returning a Buffer with full 7-tier alignment.
 */
async function generateBlockStageFlyer(campaignData, outputPath = null) {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'LETTER', margin: 0 });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                if (outputPath) {
                    try {
                        fs.writeFileSync(outputPath, pdfBuffer);
                    } catch (e) {
                        console.warn('Could not write flyer to filesystem path:', e.message);
                    }
                }
                resolve(pdfBuffer);
            });

            // 1. Render Base Background Graphic
            const possiblePaths = [
                path.join(__dirname, 'templates', 'New Template Block Stage.jpg'),
                path.join(__dirname, 'New Template Block Stage.jpg'),
                path.join(process.cwd(), 'templates', 'New Template Block Stage.jpg'),
                path.join(process.cwd(), 'New Template Block Stage.jpg')
            ];

            const templatePath = possiblePaths.find(p => fs.existsSync(p));

            if (templatePath) {
                doc.image(templatePath, 0, 0, { width: 612, height: 792 });
            } else {
                // Layout Canvas fallback if image is not located
                doc.rect(0, 0, 612, 792).fill('#F8F7F4');
                doc.fillColor('#18181B').font('Helvetica-Bold').fontSize(24).text('BLOCK STAGE CONCERT', 50, 40);
            }

            // 2. Headline Overlay
            const rawTitle = campaignData.neighborhood_title ? campaignData.neighborhood_title.trim() : 'OUR BLOCK';
            const headlineText = `${rawTitle.toUpperCase()}!`;
            const { fontSize, yPos } = calculateDynamicFontSize(doc, headlineText, 521.28, 52);

            doc.fillColor('#182723')
               .font('Helvetica-Bold')
               .fontSize(fontSize)
               .text(headlineText, 43.2, yPos, {
                   width: 521.28,
                   height: 52,
                   align: 'center',
                   lineGap: -1,
                   ellipsis: true
               });

            // 3. Cutoff Date Overlay
            const cutoffDate = campaignData.target_event_date || 'Upcoming 2026';
            doc.fillColor('#182723')
               .font('Helvetica-Bold')
               .fontSize(18)
               .text(cutoffDate, 233.5, 245, {
                   width: 194.9,
                   align: 'left'
               });

            // 4. Host Name Overlay
            const champName = campaignData.champion_name || 'Community Host';
            doc.fillColor('#E85E2F')
               .font('Helvetica')
               .fontSize(15)
               .text(champName, 44.4, 700, {
                   width: 191.3,
                   align: 'center'
               });

            // 5. Host Email Overlay
            const champEmail = campaignData.champion_email || 'info@sustainablemusicnw.org';
            doc.fillColor('#E85E2F')
               .font('Helvetica')
               .fontSize(15)
               .text(champEmail, 256.1, 700, {
                   width: 191.3,
                   align: 'center'
               });

            // 6. Dynamic QR Code Overlay
            const pledgeUrl = campaignData.givebutter_url || 'https://givebutter.com';
            const qrBuffer = await QRCode.toBuffer(pledgeUrl, {
                width: 200,
                margin: 1,
                color: {
                    dark: '#182723',
                    light: '#FFFFFF'
                }
            });

            doc.image(qrBuffer, 468.1, 632.7, { width: 104.4, height: 104.4 });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { generateBlockStageFlyer };