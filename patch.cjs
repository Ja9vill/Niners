const fs = require('fs');

let content = fs.readFileSync('src/components/DirectorTab.tsx', 'utf8');

// 1. Add import
if (!content.includes('RosterManagementTab')) {
  content = content.replace(
    "import { FirebaseService } from '../lib/firebase';",
    "import { FirebaseService } from '../lib/firebase';\nimport { RosterManagementTab } from './RosterManagementTab';"
  );
}

// 2. State
content = content.replace(
  /const \[activeView, setActiveView\] = useState<'overview' \| 'awards' \| 'tasks' \| 'roster_admin' \| 'financials' \| 'system_logs' \| 'create_user'>\('overview'\);/,
  "const [activeView, setActiveView] = useState<'awards' | 'roster_admin' | 'roster_management' | 'financials' | 'system_logs' | 'create_user'>('roster_management');"
);

// 3. Sidebar items
content = content.replace(
  /{\s*id:\s*'overview',\s*label:\s*'Overview',\s*icon:\s*LayoutDashboard\s*},/,
  ""
);
content = content.replace(
  /{\s*id:\s*'tasks',\s*label:\s*'AI Tasks',\s*icon:\s*CheckCircle2\s*},/,
  ""
);
content = content.replace(
  /{\s*id:\s*'awards',\s*label:\s*'Awards & Badges',\s*icon:\s*Award\s*},/,
  "{ id: 'awards', label: 'Awards & Badges', icon: Award },\n          { id: 'roster_management', label: 'Roster Management', icon: Clipboard },"
);

// 4. Remove MODULE 1
const mod1Start = content.indexOf('{/* MODULE 1: OVERVIEW & AI RECOMMENDATIONS */}');
if (mod1Start !== -1) {
  // Find the exact activeView === 'overview' && ( block
  const overviewStart = content.lastIndexOf('{activeView === \'overview\' && (', mod1Start);
  // We want to delete from overviewStart to the closing `)}`
  const mod2Start = content.indexOf('{/* MODULE 2: AWARDS & BADGES */}');
  
  if (overviewStart !== -1 && mod2Start !== -1) {
    content = content.substring(0, overviewStart) + content.substring(mod2Start);
  }
}

// 5. Remove MODULE 3
const mod3Start = content.indexOf('{/* MODULE 3: TASKS MANAGEMENT DESK */}');
if (mod3Start !== -1) {
  const tasksStart = content.lastIndexOf('{activeView === \'tasks\' && (', mod3Start);
  const mod4Start = content.indexOf('{/* MODULE 4: ROSTER IMPORT ADMIN DESK */}');
  
  if (tasksStart !== -1 && mod4Start !== -1) {
    const rosterManagementBlock = `
            {/* MODULE 4.5: ROSTER MANAGEMENT */}
            {activeView === 'roster_management' && (
              <motion.div key="roster_management" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-xl flex items-center gap-2 text-[#F0EFE8]">
                      <Clipboard size={20} className="text-indigo-400" />
                      Roster Management
                    </h3>
                    <p className="text-[10px] text-[#A09E9A]/40 uppercase tracking-widest font-black">View and edit roster details</p>
                  </div>
                </div>
                
                <RosterManagementTab hosts={hosts} onUpdate={loadData} auditLogAction={auditLogAction} />
              </motion.div>
            )}

            `;
    content = content.substring(0, tasksStart) + rosterManagementBlock + content.substring(mod4Start);
  }
}

fs.writeFileSync('src/components/DirectorTab.tsx', content);
console.log('Successfully patched DirectorTab.tsx');
