const fs = require('fs');

try {
  const lines = fs.readFileSync('C:\\Users\\Jwavp\\.gemini\\antigravity-ide\\brain\\c3f06b69-8b8a-41a2-8342-8dcba21be38a\\.system_generated\\logs\\transcript.jsonl', 'utf-8').split('\n');
  const userMessages = lines
    .filter(line => line.includes('"type":"USER_INPUT"'))
    .map(line => JSON.parse(line).content);
  
  fs.writeFileSync('user_messages_dump.json', JSON.stringify(userMessages, null, 2));
  console.log("Dumped user messages.");
} catch (e) {
  console.error(e);
}
