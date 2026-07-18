const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orgMatrizId = 'f5babeaf-b38d-4daf-842c-80fc732f78db';
  console.log(`Atualizando registros para a organização: ${orgMatrizId}`);

  // Atualizar Pacientes
  const pacientes = await prisma.paciente.updateMany({
    where: { organization_id: null },
    data: { organization_id: orgMatrizId },
  });
  console.log(`Pacientes atualizados: ${pacientes.count}`);

  // Atualizar Orcamentos
  const orcamentos = await prisma.orcamento.updateMany({
    where: { organization_id: null },
    data: { organization_id: orgMatrizId },
  });
  console.log(`Orcamentos atualizados: ${orcamentos.count}`);

  // Atualizar Campanhas
  const campanhas = await prisma.campanha.updateMany({
    where: { organization_id: null },
    data: { organization_id: orgMatrizId },
  });
  console.log(`Campanhas atualizadas: ${campanhas.count}`);

  // Atualizar Configuracoes
  const configuracoes = await prisma.configuracao.updateMany({
    where: { organization_id: null },
    data: { organization_id: orgMatrizId },
  });
  console.log(`Configuracoes atualizadas: ${configuracoes.count}`);
}

main()
  .then(() => {
    console.log('Migração de dados (Etapa 2) concluída!');
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
