import fs from 'fs';

const dump = JSON.parse(fs.readFileSync('db-dump.json', 'utf8'));
console.log('Collection counts in db-dump.json:');
for (const [col, docs] of Object.entries(dump)) {
  console.log(`- ${col}: ${docs.length} documents`);
}
