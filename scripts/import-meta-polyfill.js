// Polyfill for import.meta in CommonJS bundles
// This file is injected by esbuild during the build process

// In CommonJS, we can construct import.meta.url from __filename
const import_meta_url = typeof __filename !== 'undefined'
  ? 'file://' + __filename
  : '';

export { import_meta_url as 'import.meta.url' };
