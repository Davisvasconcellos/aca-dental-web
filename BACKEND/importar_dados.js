const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({});

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Iniciando importação de dados...');
  const map_sDental_to_internalId = {};

  // 1. IMPORTAR PACIENTES DO CSV
  console.log('\n--- 1. Lendo pacientes.csv ---');
  const csvPath = path.join(__dirname, '..', 'OLD', 'pacientes.csv');
  const pacientesToCreate = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        // As vezes vem UTF-8 BOM, garantindo que a chave seja lida corretamente
        const idKey = Object.keys(row).find(k => k.includes('id'));
        if (idKey && row[idKey]) {
          pacientesToCreate.push({
            id_sDental: row[idKey].trim(),
            nome: row.nome || 'Desconhecido',
            telefone: row.telefone || null
          });
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Encontrados ${pacientesToCreate.length} pacientes no CSV. Inserindo no Banco...`);
  
  // Limpar tabelas para nao duplicar se rodar duas vezes
  await prisma.tratamento.deleteMany({});
  await prisma.orcamento.deleteMany({});
  await prisma.campanhaAlvo.deleteMany({});
  await prisma.campanha.deleteMany({});
  await prisma.paciente.deleteMany({});

  // Inserir em lotes
  const batchSize = 100;
  for (let i = 0; i < pacientesToCreate.length; i += batchSize) {
    const batch = pacientesToCreate.slice(i, i + batchSize);
    await prisma.paciente.createMany({
      data: batch,
      skipDuplicates: true
    });
  }

  // Preencher o mapa de IDs
  const allPacientes = await prisma.paciente.findMany({ select: { id: true, id_sDental: true } });
  for (const p of allPacientes) {
    map_sDental_to_internalId[p.id_sDental] = p.id;
  }
  console.log(`Inseridos e mapeados ${allPacientes.length} pacientes com seus UUIDs internos.`);

  // 2. IMPORTAR METRICAS E EVOLUÇÕES (evolucoes_resultado.json)
  console.log('\n--- 2. Lendo evolucoes_resultado.json ---');
  const evoPath = path.join(__dirname, '..', 'OLD', 'evolucoes_resultado.json');
  if (fs.existsSync(evoPath)) {
    const evoData = JSON.parse(fs.readFileSync(evoPath, 'utf8'));
    const lista = evoData.lista || [];
    
    let atualizados = 0;
    for (const item of lista) {
      const internalId = map_sDental_to_internalId[item.id];
      if (internalId) {
        await prisma.paciente.update({
          where: { id: internalId },
          data: {
            ultima_limpeza_data: item.ultima_limpeza_data ? new Date(item.ultima_limpeza_data) : null,
            ultima_evolucao_data: item.ultima_evolucao_data ? new Date(item.ultima_evolucao_data) : null,
            ultimo_proc: item.ultimo_proc || null,
            total_evolucoes: item.total_evolucoes || 0,
            score: item.score || 0
          }
        });
        atualizados++;
      }
    }
    console.log(`Métricas cacheadas atualizadas para ${atualizados} pacientes.`);
  }

  // 3. IMPORTAR ORCAMENTOS E TRATAMENTOS (orcamentos_tratamentos.json)
  console.log('\n--- 3. Lendo orcamentos_tratamentos.json ---');
  const orcPath = path.join(__dirname, '..', 'OLD', 'orcamentos_tratamentos.json');
  if (fs.existsSync(orcPath)) {
    const orcData = JSON.parse(fs.readFileSync(orcPath, 'utf8'));
    const details = orcData.details || {};
    
    let countOrcamentos = 0;
    let countTrats = 0;
    const insertedOrcs = new Set();

    for (const key of Object.keys(details)) {
      const parts = key.split('|');
      const sDentalId = parts[0];
      const internalId = map_sDental_to_internalId[sDentalId];
      const orc = details[key];
      
      if (internalId && orc.ok && orc.orcamento_id && !insertedOrcs.has(String(orc.orcamento_id))) {
        insertedOrcs.add(String(orc.orcamento_id));
        // Criar orcamento
        const dbOrc = await prisma.orcamento.create({
          data: {
            id: String(orc.orcamento_id),
            paciente_id: internalId,
            descricao: orc.descricao,
            status: orc.status || 'EM_ABERTO',
            data_orcamento: orc.data ? new Date(orc.data) : new Date(),
            valor_total: orc.valor || 0
          }
        });
        countOrcamentos++;

        // Inserir tratamentos do orcamento
        if (orc.tratamentos && Array.isArray(orc.tratamentos)) {
          const tratData = orc.tratamentos.map(t => ({
            orcamento_id: dbOrc.id,
            nome: t.nome || 'Sem nome',
            valor: t.valor || 0
          }));
          
          if (tratData.length > 0) {
            await prisma.tratamento.createMany({ data: tratData });
            countTrats += tratData.length;
          }
        }
      }
    }
    console.log(`Importados ${countOrcamentos} orçamentos e ${countTrats} tratamentos vinculados!`);
  }

  console.log('\n✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
