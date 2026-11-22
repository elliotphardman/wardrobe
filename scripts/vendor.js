// Copies browser builds of runtime dependencies into vendor/ so the site needs no npm.
import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('vendor', { recursive: true });
copyFileSync('node_modules/fflate/esm/browser.js', 'vendor/fflate.js');
console.log('vendored fflate');
