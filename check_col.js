const fs = require('fs');
const lines = fs.readFileSync('src/components/DirectorTab.tsx', 'utf8').split('\n');
console.log('Line 211:', lines[210]);
for (let i=0; i<lines[210].length; i++) {
  console.log(i+1, lines[210][i]);
}
