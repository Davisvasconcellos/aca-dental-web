const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed...");

  // Criar Organização Padrão se não existir
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        nome: "Clínica Matriz ACA",
        evo_instance: "aca-matriz"
      }
    });
    console.log("Organização padrão criada:", org.id);
  } else {
    console.log("Organização padrão já existe:", org.id);
  }

  // Criar Usuário Master
  const masterEmail = "davisvasconcellos@gmail.com";
  let master = await prisma.usuario.findUnique({ where: { email: masterEmail } });
  
  if (!master) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash("Aca@2026", salt);
    
    master = await prisma.usuario.create({
      data: {
        email: masterEmail,
        senha: hash,
        role: "MASTER"
      }
    });
    console.log("Usuário Master criado com sucesso.");
  } else {
    console.log("Usuário Master já existe.");
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
