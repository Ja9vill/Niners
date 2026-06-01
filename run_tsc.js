const { execSync } = require('child_process');
try {
  console.log('Running tsc...');
  execSync('npx tsc --noEmit', { cwd: 'e:\\nine-dashboard', stdio: 'pipe' });
  console.log('TSC passed');
} catch (e) {
  console.log('TSC Failed:\n', e.stdout.toString());
}
