const fs = require('fs');
const path = require('path');

const filesToDelete = [
  'auto-fix.js', 'auto-suppress.mjs', 'fix-deploy.ps1', 'fix_cors.ts',
  'remove-test-credentials.js', 'wipe-commissions.js', 'check_col.js',
  'check_syntax.js', 'check_ts.js', 'run_tsc.js', 'summarize-dump.js',
  'dump_messages.js', 'extract_pdfs.py', 'test.txt', 'test_babel.js',
  'test-key-validity.js', 'test-firestore.js', 'test-firestore-init.js'
];

const basePath = 'e:\\nine-dashboard';

filesToDelete.forEach(file => {
  const fullPath = path.join(basePath, file);
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`Successfully deleted: ${file}`);
    } else {
      console.log(`File not found: ${file}`);
    }
  } catch (err) {
    console.error(`Error deleting ${file}:`, err.message);
  }
});
