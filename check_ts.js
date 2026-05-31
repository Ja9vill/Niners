const { exec } = require('child_process');
exec('npx tsc --noEmit', { cwd: 'e:/nine-dashboard' }, (error, stdout, stderr) => {
  console.log('STDOUT:', stdout);
  console.log('STDERR:', stderr);
  console.log('ERROR:', error);
});
