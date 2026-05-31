const fs = require('fs');
let txt = fs.readFileSync('src/components/ProfilesTab.tsx', 'utf8');

txt = txt.replace(
  '                           </div>\n                       </div>\n\n                       <div className="space-y-4">',
  '                           </div>\n                       </div>\n                       )}\n\n                       <div className="space-y-4">'
);

fs.writeFileSync('src/components/ProfilesTab.tsx', txt);
