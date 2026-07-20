const fs = require('fs');
const path = require('path');

function fixInterpolationInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixInterpolationInDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix single quoted interpolation
      const regex1 = /'\$\{import\.meta\.env\.MODE === "production" \? "https:\/\/aca-api\.dmedia\.com\.br" : "http:\/\/localhost:3000"\}([^']*)'/g;
      let count = (content.match(regex1) || []).length;
      if (count > 0) {
        content = content.replace(regex1, '`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}$1`');
      }

      // Fix double quoted interpolation
      const regex2 = /"\$\{import\.meta\.env\.MODE === "production" \? "https:\/\/aca-api\.dmedia\.com\.br" : "http:\/\/localhost:3000"\}([^"]*)"/g;
      count = (content.match(regex2) || []).length;
      if (count > 0) {
        content = content.replace(regex2, '`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}$1`');
      }
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

fixInterpolationInDir(path.join(__dirname, 'FRONTEND', 'src'));
console.log('Fix complete.');
