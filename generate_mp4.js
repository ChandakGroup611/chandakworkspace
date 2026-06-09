const fs = require('fs');
const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const path = require('path');

const slides = [
  'public/logo.png',
  'public/slideshow/slide1.png',
  'public/slideshow/slide2.png',
  'public/slideshow/slide3.png',
  'public/slideshow/slide4.png',
  'public/logo.png'
];

console.log("Preparing padded images...");

let inputsTxt = '';

slides.forEach((slide, index) => {
  const outName = `temp_slide_${index}.png`;
  // Scale to 1280x720, pad with black background
  const cmd = `"${ffmpeg}" -y -i "${slide}" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black" "${outName}"`;
  execSync(cmd, { stdio: 'ignore' });
  
  inputsTxt += `file '${outName}'\n`;
  inputsTxt += `duration 5\n`;
});
// Need to repeat the last file due to ffmpeg concat quirk
inputsTxt += `file 'temp_slide_${slides.length - 1}.png'\n`;

fs.writeFileSync('slideshow_inputs.txt', inputsTxt);

console.log("Generating MP4 video...");

try {
  const finalCmd = `"${ffmpeg}" -y -f concat -safe 0 -i slideshow_inputs.txt -vsync vfr -pix_fmt yuv420p public/whatsapp_status.mp4`;
  execSync(finalCmd, { stdio: 'inherit' });
  console.log("SUCCESS! Video created at public/whatsapp_status.mp4");
} catch (e) {
  console.error("Failed to create video:", e);
}

// Cleanup temp files
slides.forEach((_, index) => {
  try { fs.unlinkSync(`temp_slide_${index}.png`); } catch(e){}
});
try { fs.unlinkSync('slideshow_inputs.txt'); } catch(e){}
