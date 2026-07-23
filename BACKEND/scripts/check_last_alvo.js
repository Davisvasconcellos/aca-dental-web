const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatestAlvo() {
  try {
    const alvos = await prisma.campanhaAlvo.findMany({
      orderBy: { data_envio: 'desc' },
      take: 5,
      include: {
        paciente: { select: { nome: true, telefone: true } },
        campanha: { select: { nome: true } }
      }
    });

    console.log('--- ÚLTIMOS ALVOS DE CAMPANHA REGISTRADOS ---');
    console.log(JSON.stringify(alvos, null, 2));

    const configs = await prisma.configuracao.findMany();
    console.log('--- CONFIGURACOES DA ORGANIZACAO ---');
    const cfgMap = {};
    configs.forEach(c => cfgMap[c.chave] = c.valor);
    console.log('typebot_url:', cfgMap.typebot_url);
    console.log('typebot_public_id:', cfgMap.typebot_public_id);
    console.log('evo_url:', cfgMap.evo_url);
    console.log('evo_instance:', cfgMap.evo_instance);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestAlvo();
