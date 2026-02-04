const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'config.json');

// Reset SHOULD_RUN to true
const config = { SHOULD_RUN: true };
fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');

console.log('✅ SHOULD_RUN has been reset to TRUE');
console.log('💡 The script will now run on the next execution');
