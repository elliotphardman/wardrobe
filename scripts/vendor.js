// Copies browser builds of runtime dependencies into vendor/ and fonts/ so the site needs no npm.
import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('vendor', { recursive: true });
mkdirSync('fonts', { recursive: true });
copyFileSync('node_modules/fflate/esm/browser.js', 'vendor/fflate.js');
copyFileSync('node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2', 'fonts/archivo-wdth.woff2');
console.log('vendored fflate and Archivo');
