const fs = require('fs');
try {
  const babel = require('@babel/core');
  const code = fs.readFileSync('src/components/DirectorTab.tsx', 'utf8');
  
  babel.transform(code, {
    filename: 'DirectorTab.tsx',
    presets: ['@babel/preset-react', '@babel/preset-typescript']
  }, function(err, result) {
    if (err) {
      fs.writeFileSync('babel_error.txt', err.toString());
      console.log('Error written to babel_error.txt');
    } else {
      fs.writeFileSync('babel_error.txt', 'SUCCESS');
      console.log('Success');
    }
  });
} catch (e) {
  fs.writeFileSync('babel_error.txt', e.toString());
}
