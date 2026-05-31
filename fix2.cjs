const fs = require('fs');
let txt = fs.readFileSync('src/components/ProfilesTab.tsx', 'utf8');

const target = `                           </div>\r\n                       </div>\r\n\r\n                       <div className="space-y-4">\r\n                          <div className="flex items-center justify-between">\r\n                             <h5 className="text-xs font-bold uppercase tracking-widest text-white/30">🎲 Random PK Data</h5>`;

const replacement = `                           </div>\r\n                       </div>\r\n                       )}\r\n\r\n                       <div className="space-y-4">\r\n                          <div className="flex items-center justify-between">\r\n                             <h5 className="text-xs font-bold uppercase tracking-widest text-white/30">🎲 Random PK Data</h5>`;

if (txt.includes(target)) {
  txt = txt.replace(target, replacement);
  fs.writeFileSync('src/components/ProfilesTab.tsx', txt);
  console.log('Fixed syntax error with \\r\\n match');
} else {
  // Try \n match
  const targetN = `                           </div>\n                       </div>\n\n                       <div className="space-y-4">\n                          <div className="flex items-center justify-between">\n                             <h5 className="text-xs font-bold uppercase tracking-widest text-white/30">🎲 Random PK Data</h5>`;

  const replacementN = `                           </div>\n                       </div>\n                       )}\n\n                       <div className="space-y-4">\n                          <div className="flex items-center justify-between">\n                             <h5 className="text-xs font-bold uppercase tracking-widest text-white/30">🎲 Random PK Data</h5>`;
  
  if (txt.includes(targetN)) {
    txt = txt.replace(targetN, replacementN);
    fs.writeFileSync('src/components/ProfilesTab.tsx', txt);
    console.log('Fixed syntax error with \\n match');
  } else {
    console.log('Target string not found in ProfilesTab.tsx');
  }
}
