const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'Evolution API - v2.3.-.postman_collection.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log('=== ENDPOINTS DE ENVIO DE MENSAGEM (EVOLUTION API) ===\n');

function findSendMessage(items) {
  for (const item of items) {
    if (item.name && item.name.toLowerCase().includes('send message')) {
      printRequests(item.item);
    } else if (item.item) {
      findSendMessage(item.item);
    }
  }
}

function printRequests(items) {
  for (const item of items) {
    if (item.request) {
      console.log(`📌 ${item.name}`);
      console.log(`   URL: ${item.request.method} ${item.request.url?.raw}`);
      if (item.request.body && item.request.body.raw) {
        console.log(`   BODY:\n${item.request.body.raw.trim()}\n---------------------------------------------`);
      }
    } else if (item.item) {
      printRequests(item.item);
    }
  }
}

findSendMessage(data.item);
