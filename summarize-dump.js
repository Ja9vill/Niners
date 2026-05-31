const fs = require('fs');

const data = JSON.parse(fs.readFileSync('db-dump.json', 'utf8'));

let summary = "# Database Storage Summary\n\n";
summary += "Here is a breakdown of everything currently stored in your Firebase database:\n\n";

for (const [collection, records] of Object.entries(data)) {
  summary += `## ${collection}\n`;
  summary += `- **Total Records:** ${records.length}\n`;
  if (records.length > 0) {
    summary += `- **Sample Record Keys:** ${Object.keys(records[0]).join(', ')}\n`;
  }
  summary += '\n';
}

fs.writeFileSync('db-summary.md', summary);
console.log("Summary generated.");
