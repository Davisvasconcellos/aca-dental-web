const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPhoneMatch() {
  const incomingPhone = '5521965445992';
  const cleanIncoming = incomingPhone.replace(/\D/g, '');

  console.log(`Buscando paciente para o telefone recebido do WhatsApp: ${incomingPhone}`);

  // Busca estrita (como estava antes)
  const buscaEstrita = await prisma.paciente.findFirst({
    where: { telefone: incomingPhone }
  });
  console.log('1. Busca Estrita (where: { telefone: "5521965445992" }):', buscaEstrita ? 'ENCONTRADO' : '❌ NÃO ENCONTRADO (NULL)');

  // Busca por digitos limpos (nova solução)
  const todos = await prisma.paciente.findMany({
    select: { id: true, nome: true, telefone: true, organization_id: true }
  });
  const pacienteEncontrado = todos.find(p => p.telefone && p.telefone.replace(/\D/g, '') === cleanIncoming);

  console.log('2. Busca Limpa por Dígitos:', pacienteEncontrado ? `✅ ENCONTRADO: ${pacienteEncontrado.nome} (${pacienteEncontrado.telefone})` : '❌ NÃO ENCONTRADO');

  if (pacienteEncontrado) {
    const alvos = await prisma.campanhaAlvo.findMany({
      where: { paciente_id: pacienteEncontrado.id },
      orderBy: { data_envio: 'desc' }
    });
    console.log('\nAlvos da campanha para este paciente:');
    console.log(JSON.stringify(alvos, null, 2));
  }

  await prisma.$disconnect();
}

testPhoneMatch();
