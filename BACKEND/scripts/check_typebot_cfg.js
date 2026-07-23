const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const configs = await prisma.configuracao.findMany();
  console.log('--- CONFIGURACOES NO BANCO ---');
  console.log(configs);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  prisma.$disconnect();
});
