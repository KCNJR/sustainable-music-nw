const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

function formatDisplayDate(rawDate) {
    if (!rawDate) return 'Upcoming 2026';
    const singleDate = rawDate.toString().trim().split(/\s+/)[0];
    const parts = singleDate.split('-');
    if (parts.length === 3) {
        const year = parts[0];
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (month >= 1 && month <= 12) return `${months[month - 1]} ${day}, ${year}`;
    }
    return singleDate;
}

async function generateBlockStageFlyer(campaignData, outputPath) {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'LETTER', margin: 0 });
            const buffers = [];
            doc.on('data', chunk => buffers.push(chunk));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                if (outputPath) {
                    try { fs.writeFileSync(outputPath, pdfBuffer); } catch(e){}
                }
                resolve(pdfBuffer);
            });
            doc.on('error', err => reject(err));

            // Background template
            const possiblePaths = [
                path.join(__dirname, 'templates', 'New Template Block Stage.jpg'),
                path.join(__dirname, '..', '..', 'templates', 'New Template Block Stage.jpg'),
                path.join(process.cwd(), 'templates', 'New Template Block Stage.jpg')
            ];
            const templatePath = [path.join(process.cwd(), 'templates', 'New Template Block Stage.jpg'), path.join(__dirname, 'templates', 'New Template Block Stage.jpg'), path.join(__dirname, '..', 'templates', 'New Template Block Stage.jpg')].find(p => fs.existsSync(p)) || '';
            if (templatePath) {
                doc.image(templatePath, 0, 0, { width: 612, height: 792 });
            }

            // Headline Overlay
            const rawText = campaignData.neighborhood_title ? campaignData.neighborhood_title.trim() : 'OUR BLOCK';
            const neighborhoodText = `${rawText.toUpperCase()}!`;
            let fontSize = 16;
            let yPos = 180;
            if (neighborhoodText.length > 50) { fontSize = 9; yPos = 175; }
            else if (neighborhoodText.length > 35) { fontSize = 11; yPos = 177; }
            else if (neighborhoodText.length > 20) { fontSize = 13; yPos = 179; }

            doc.fillColor('#182723')
               .font('Helvetica-Bold')
               .fontSize(fontSize)
               .text(neighborhoodText, 43.2, yPos, {
                   width: 521.28,
                   height: 45,
                   align: 'center',
                   lineGap: -2
               });

            // Target Date
            const cleanDate = formatDisplayDate(campaignData.target_event_date);
            doc.fillColor('#182723')
               .font('Helvetica-Bold')
               .fontSize(18)
               .text(cleanDate, 233.5, 247, { width: 194.9, align: 'left' });

            // Champion Name
            doc.fillColor('#E85E2F')
               .font('Helvetica')
               .fontSize(15)
               .text(campaignData.champion_name || '', 44.4, 696, { width: 191.3, align: 'center' });

            // Champion Email
            doc.fillColor('#E85E2F')
               .font('Helvetica')
               .fontSize(15)
               .text(campaignData.champion_email || '', 256.1, 696, { width: 191.3, align: 'center' });

            // Dynamic QR Code
            const targetUrl = campaignData.givebutter_url || 'https://sustainablemusicnw.org/blockstage';
            const qrBuffer = await QRCode.toBuffer(targetUrl, {
                width: 300,
                margin: 1,
                color: { dark: '#132736', light: '#FFFFFF' }
            });
            doc.image(qrBuffer, 468.1, 632.7, { width: 104.4, height: 104.4 });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    generateBlockStageFlyer,
    generateBlockStageFlyerBuffer: generateBlockStageFlyer
};
