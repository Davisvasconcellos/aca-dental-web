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
      
      const regex1 = /https:\/\/aca-api\.dmedia\.com\.br/g;
      const count = (content.match(regex1) || []).length;
      if (count > 0) {
        content = content.replace(regex1, '${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}');
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

replaceInDir(path.join(__dirname, 'FRONTEND', 'src'));
console.log('Replacement complete.');
