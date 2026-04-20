const sharp = require('sharp');
const path = require('path');

const src = path.join(__dirname, 'public/images/logo-isolated.png');
const dst = path.join(__dirname, 'public/images/logo-final.png');

sharp(src)
  .ensureAlpha()
  .toFormat('png')
  .raw()
  .toBuffer({ resolveWithObject: true })
  .then(({ data, info }) => {
    // Process pixels: if the pixel is black (low RGB values), make it transparent
    const threshold = 40; // Pixels darker than this will be transparent
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      if (r < threshold && g < threshold && b < threshold) {
        data[i + 3] = 0; // Alpha 0
      }
    }
    
    return sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    }).toFile(dst);
  })
  .then(() => console.log('Logo background removed successfully! Saved to logo-final.png'))
  .catch(err => console.error(err));
