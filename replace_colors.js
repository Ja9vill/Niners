const fs = require('fs');
const path = require('path');

const replacements = {
  '#D4AF37': '#FFB800',
  '#A09E9A': '#B0B0B0',
  '#F0EFE8': '#F5F5F5',
  '#1A1A28': '#1A1A1A',
  '#0D0D14': '#111111',
  '#13131E': '#0A0A0A',
  '#222235': '#222222',
  '#5A5865': '#707070'
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetDir = path.join(__dirname, 'src');

walkDir(targetDir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    for (const [oldColor, newColor] of Object.entries(replacements)) {
      // Case-insensitive replace for old color
      const regex = new RegExp(oldColor, 'gi');
      if (regex.test(content)) {
        content = content.replace(regex, newColor);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated colors in ${filePath}`);
    }
  }
});
console.log('Finished updating colors.');
