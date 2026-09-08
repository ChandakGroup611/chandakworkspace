const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const sourceLogoPath = path.join(rootDir, 'public', 'Chandak-Group-40-Logo.png');

  console.log('Reading source logo from:', sourceLogoPath);

  // Exact 40-years mark bounds determined from alpha analysis
  const cropLeft = 715;
  const cropTop = 17;
  const cropWidth = 972 - 715 + 1; // 258
  const cropHeight = 289 - 17 + 1; // 273

  console.log('Extracting 40-years logo region:', { cropLeft, cropTop, cropWidth, cropHeight });

  // Extract raw 40-years emblem
  const croppedBuffer = await sharp(sourceLogoPath)
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .toBuffer();

  // Create square 512x512 canvas with transparent background
  // Center the emblem inside 512x512 with proper padding (~460 content size)
  const targetSize = 512;
  const contentSize = 460;

  const resizedEmblem = await sharp(croppedBuffer)
    .resize(contentSize, contentSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  const emblemMeta = await sharp(resizedEmblem).metadata();
  const leftPad = Math.round((targetSize - emblemMeta.width) / 2);
  const topPad = Math.round((targetSize - emblemMeta.height) / 2);

  const final512 = await sharp({
    create: {
      width: targetSize,
      height: targetSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{
      input: resizedEmblem,
      top: topPad,
      left: leftPad
    }])
    .png()
    .toBuffer();

  const publicDir = path.join(rootDir, 'public');

  // 1. High-res 512x512 icon
  fs.writeFileSync(path.join(publicDir, 'chandak-40-icon.png'), final512);
  console.log('✅ Generated public/chandak-40-icon.png (512x512)');

  // 2. Apple touch icon (180x180)
  const icon180 = await sharp(final512).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), icon180);
  console.log('✅ Generated public/apple-touch-icon.png (180x180)');

  // 3. 32x32 Favicon PNG
  const icon32 = await sharp(final512).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), icon32);
  console.log('✅ Generated public/favicon-32x32.png (32x32)');

  // 4. 16x16 Favicon PNG
  const icon16 = await sharp(final512).resize(16, 16).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), icon16);
  console.log('✅ Generated public/favicon-16x16.png (16x16)');

  // 5. Square SVGs (favicon.svg, icon.svg, chandak-40-icon.svg)
  const base64Png = final512.toString('base64');
  const svgContent = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" width="100%" height="100%">
  <image width="512" height="512" xlink:href="data:image/png;base64,${base64Png}"/>
</svg>
`;
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);
  fs.writeFileSync(path.join(publicDir, 'chandak-40-icon.svg'), svgContent);
  console.log('✅ Generated public/favicon.svg, public/icon.svg, public/chandak-40-icon.svg');

  // 6. Valid favicon.ico embedding 32x32 PNG
  const icoHeader = Buffer.from([
    0x00, 0x00, // Reserved
    0x01, 0x00, // Type 1 = ICO
    0x01, 0x00, // 1 image
    // Directory entry
    32,         // Width (32)
    32,         // Height (32)
    0,          // Color palette (0 = no palette)
    0,          // Reserved
    0x01, 0x00, // Color planes (1)
    0x20, 0x00, // Bits per pixel (32)
    0, 0, 0, 0, // Image size in bytes (placeholder)
    0x16, 0x00, 0x00, 0x00 // Offset of image data (22 = 0x16)
  ]);
  icoHeader.writeUInt32LE(icon32.length, 8);
  const fullIco = Buffer.concat([icoHeader, icon32]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), fullIco);
  console.log('✅ Generated public/favicon.ico');
}

main().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
