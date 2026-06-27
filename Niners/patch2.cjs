const fs = require('fs');
let code = fs.readFileSync('E:/nine-dashboard/src/components/DirectorTab.tsx', 'utf8');

// Ensure import is added
if (!code.includes('import { RosterManagementTab }')) {
  code = code.replace(
    `import { FinancialUpload } from './FinancialUpload';`,
    `import { FinancialUpload } from './FinancialUpload';\nimport { RosterManagementTab } from './RosterManagementTab';`
  );
}

// Ensure roster_management tab is in sidebar
if (!code.includes(`{ id: 'roster_management', label: 'Roster Management', icon: Clipboard }`)) {
    code = code.replace(
        `{ id: 'create_user', label: 'Provision User', icon: UserPlus },`,
        `{ id: 'roster_management', label: 'Roster Management', icon: Clipboard },\n          { id: 'create_user', label: 'Provision User', icon: UserPlus },`
    );
}

// Remove Overview tab from sidebar
code = code.replace(/{ id: 'overview', label: 'Overview & AI Insights', icon: Zap },\s*/g, '');

// Remove Tasks tab from sidebar
code = code.replace(/{ id: 'tasks', label: 'Tasks Coordination', icon: ListTodo },\s*/g, '');

// Remove Awards tab from sidebar
code = code.replace(/{ id: 'awards', label: 'Awards & Badges', icon: Award },\s*/g, '');

// Remove Roster Admin tab from sidebar
code = code.replace(/{ id: 'roster_admin', label: 'Roster Admin', icon: Users },\s*/g, '');


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
