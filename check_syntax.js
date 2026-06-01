const fs = require('fs');
const content = fs.readFileSync('src/components/DirectorTab.tsx', 'utf8');

try {
  // We can't parse TSX with pure node, but we can try to look for obvious unbalanced brackets
  let brackets = 0;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') brackets++;
    if (content[i] === '}') brackets--;
  }
  console.log('Bracket count:', brackets);
} catch (e) {
  console.error(e);
}
