const { execSync } = require('child_process');

// Get git hash with fallback
const getGitHash = () => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'no-git-info';
  }
};

let commitJson = {
  hash: JSON.stringify(getGitHash()),
  version: JSON.stringify(process.env.npm_package_version),
};

console.log(`
★═══════════════════════════════════════★
         N.E.U.R.O.C.O.D.E
         ⚡️  Welcome  ⚡️
★═══════════════════════════════════════★
`);
console.log('📍 Version actuelle :', `v${commitJson.version}`);
console.log('📍 Commit actuel :', commitJson.hash);
console.log('  Veuillez patienter jusqu\'à ce que l\'URL apparaisse ici');
console.log('★═══════════════════════════════════════★');