const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.configuracao.findMany().then(c => console.log(c)).finally(() => prisma.$disconnect());
