// Playwright, wherever it is installed: next to the project, globally (npm -g), or in this machine's tools folder.
const path = require('path');
const tries = ['playwright', path.join(process.env.APPDATA || '', 'npm/node_modules/playwright'), 'C:/Users/elada/tools/npm-global/node_modules/playwright'];
let pw = null;
for (const t of tries) { try { pw = require(t); break; } catch {} }
if (!pw) { console.error('playwright is not installed: npm i -g playwright && npx playwright install chromium'); process.exit(2); }
module.exports = pw;
