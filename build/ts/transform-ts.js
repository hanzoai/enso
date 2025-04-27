const fs = require('fs');
const MJS_FILES = ['src/zen/split-view/ZenViewSplitter.ts'];

for (const file of MJS_FILES) {
  const code = fs.readFileSync(file, 'utf8');
  require('@babel/core').transformSync(code, {
    presets: ['@babel/preset-typescript'],
    filename: file,
  });
}
