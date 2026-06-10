const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if(file.endsWith('.tsx')) results.push(file);
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'src'));
let changedCount = 0;

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('bg-[#1A1A28]') || content.includes('bg-[#0D0D14]') || content.includes('bg-[#13131E]')) {
        let newContent = content
            .replace(/bg-\[#1A1A28\]/g, 'bg-black/40 backdrop-blur-md')
            .replace(/bg-\[#0D0D14\]/g, 'bg-black/60 backdrop-blur-md')
            .replace(/bg-\[#13131E\]/g, 'bg-black/50 backdrop-blur-md');
        fs.writeFileSync(file, newContent, 'utf8');
        changedCount++;
        console.log('Updated', file);
    }
});

console.log('Total files changed:', changedCount);
