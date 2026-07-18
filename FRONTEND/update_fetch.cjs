const fs = require('fs');

function replaceFetch(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('function fetchAuth') && !content.includes('const fetchAuth')) {
    const importRegex = /(import React[^;]+;)/;
    content = content.replace(importRegex, "$1\n\nconst fetchAuth = (url, options = {}) => {\n  const token = localStorage.getItem('token');\n  options.headers = { ...options.headers, Authorization: `Bearer ${token}` };\n  return fetch(url, options);\n};\n");
  }

  content = content.replace(/\bfetch\(/g, 'fetchAuth(');
  
  fs.writeFileSync(filePath, content);
  console.log('Updated', filePath);
}

const files = [
  'src/pages/Limpeza.jsx',
  'src/pages/Todos.jsx',
  'src/pages/Campanhas.jsx',
  'src/pages/Configuracoes.jsx',
];

files.forEach(f => replaceFetch(f));
