const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const dbConfig = await prisma.configuracao.findMany({
      where: { chave: { in: ['evo_url', 'evo_apikey'] } }
    });
    
    const configMap = { evo_url: '', evo_apikey: '' };
    dbConfig.forEach(c => configMap[c.chave] = c.valor);
    
    let status = 'desconectado';
    let instances = [];
    if (configMap.evo_url && configMap.evo_apikey) {
      try {
        const apiUrl = `${configMap.evo_url.replace(/\/$/, '')}/instance/fetchInstances`;
        const testRes = await fetch(apiUrl, {
          method: 'GET',
          headers: { 'apikey': configMap.evo_apikey }
        });
        if (testRes.ok) {
          status = 'conectado';
          instances = await testRes.json();
        } else {
            status = 'erro ' + testRes.status;
        }
      } catch (e) {
        status = 'erro exception ' + e.message;
      }
    }

    console.log({ config: configMap, status, instances });
}

test().finally(() => prisma.$disconnect());
