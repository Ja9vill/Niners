const fs = require('fs');
let code = fs.readFileSync('E:/nine-dashboard/src/components/DirectorTab.tsx', 'utf8');

if (!code.includes('import { RosterManagementTab }')) {
  code = code.replace(
    `import { Host, NoteType, TaskStatus, PerformanceGoal } from '../types';`,
    `import { Host, NoteType, TaskStatus, PerformanceGoal } from '../types';\nimport { RosterManagementTab } from './RosterManagementTab';`
  );
}

// Remove Overview tab from sidebar
code = code.replace(/{ id: 'overview', label: 'Overview & AI Insights', icon: Zap },\s*/g, '');

// Remove Tasks tab from sidebar
code = code.replace(/{ id: 'tasks', label: 'Tasks Coordination', icon: ListTodo },\s*/g, '');

// Add roster_management render block if not there
if (!code.includes('<RosterManagementTab')) {
  code = code.replace(
    "{activeView === 'financials' && (",
    `{activeView === 'roster_management' && (
              <motion.div key="roster-management" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <RosterManagementTab hosts={hosts} onUpdate={loadData} auditLogAction={auditLogAction} />
              </motion.div>
            )}

            {activeView === 'financials' && (`
  );
}

fs.writeFileSync('E:/nine-dashboard/src/components/DirectorTab.tsx', code);
