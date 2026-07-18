const fs = require('fs');

function replaceToken(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/localStorage\.getItem\('token'\)/g, "localStorage.getItem('aca_token')");
  fs.writeFileSync(filePath, content);
  console.log('Fixed token key in', filePath);
}

const files = [
  'src/pages/Limpeza.jsx',
  'src/pages/Todos.jsx',
  'src/pages/Campanhas.jsx',
  'src/pages/Configuracoes.jsx',
  'src/pages/VisaoGeral.jsx',
  'src/pages/Orcamentos.jsx'
];

files.forEach(f => replaceToken(f));
