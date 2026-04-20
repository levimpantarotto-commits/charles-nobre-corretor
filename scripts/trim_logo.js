const sharp = require('sharp');
const path = require('path');

const src = path.join(__dirname, 'public/images/logo-final.png');
const dst = path.join(__dirname, 'public/images/logo-trimmed.png');

sharp(src)
  .trim() // Automatically removes surrounding transparent pixels
  .toFile(dst)
  .then(() => console.log('Logo trimmed successfully! Saved to logo-trimmed.png'))
  .catch(err => console.error(err));
