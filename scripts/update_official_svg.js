const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const officialPngPath = path.join(rootDir, 'public', 'Chandak_Group_Official_Logo.png');
const officialPng = fs.readFileSync(officialPngPath);
const base64 = officialPng.toString('base64');

const svgContent = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 820 283" width="100%" height="100%">
  <image width="820" height="283" xlink:href="data:image/png;base64,${base64}"/>
</svg>
`;

fs.writeFileSync(path.join(rootDir, 'public', 'Chandak-Group-Final-Logo.svg'), svgContent);
fs.writeFileSync(path.join(rootDir, 'public', 'Chandak_Group_Official_Logo.svg'), svgContent);
console.log('✅ Updated public/Chandak-Group-Final-Logo.svg and public/Chandak_Group_Official_Logo.svg with official logo only');

// Also update app/icon.svg to use the 40-years icon
const iconPngPath = path.join(rootDir, 'public', 'chandak-40-icon.png');
const iconPng = fs.readFileSync(iconPngPath);
const iconBase64 = iconPng.toString('base64');

const appIconSvg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" width="100%" height="100%">
  <image width="512" height="512" xlink:href="data:image/png;base64,${iconBase64}"/>
</svg>
`;

fs.writeFileSync(path.join(rootDir, 'app', 'icon.svg'), appIconSvg);
console.log('✅ Updated app/icon.svg with 40-years icon');
