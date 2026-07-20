const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const regex1 = /\`\$\{import\.meta\.env\.VITE_API_URL \|\| \"http:\/\/localhost:3000\"\}\/([^`]*)\`/g;
      const count = (content.match(regex1) || []).length;
      if (count > 0) {
        content = content.replace(regex1, '`${import.meta.env.MODE === "production" ? "https://api-aca.dmedia.com.br" : "http://localhost:3000"}/$1`');
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

replaceInDir(path.join(__dirname, 'FRONTEND', 'src'));
console.log('Replacement complete.');
