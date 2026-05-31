import fs from 'fs';
import path from 'path';

const filesToUpdate = [
  'src/server/auth.ts',
  'src/server/verify-director.ts',
  'src/server/get-director-doc.ts',
  'src/server/bootstrap.ts',
  'src/lib/firebaseService.ts',
  'scripts/deleteAllData.mjs'
];

filesToUpdate.forEach(file => {
  const filePath = path.resolve(file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Exact replacements for standard Firestore syntax
    content = content.replace(/collection\(\s*db\s*,\s*"hosts"\s*\)/g, 'collection(db, "users")');
    content = content.replace(/collection\(\s*db\s*,\s*'hosts'\s*\)/g, "collection(db, 'users')");
    content = content.replace(/\.collection\("hosts"\)/g, '.collection("users")');
    content = content.replace(/\.collection\('hosts'\)/g, ".collection('users')");
    
    // In firebaseService.ts, there are lines like `const path = 'hosts';`
    if (file.includes('firebaseService.ts')) {
      content = content.replace(/const path = 'hosts';/g, "const path = 'users';");
      content = content.replace(/doc\(db, 'hosts',/g, "doc(db, 'users',");
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated ${file}`);
  } else {
    console.warn(`⚠️ File not found: ${file}`);
  }
});

console.log('Done replacing hosts collection with users collection.');
