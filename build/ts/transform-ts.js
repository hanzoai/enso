const MJS_FILES = ['src/zen/split-view/ZenViewSplitter.ts'];

for (const file of MJS_FILES) {
  require('@babel/core').transformSync('code', {
    presets: ['@babel/preset-typescript'],
    filename: file,
  });
}
