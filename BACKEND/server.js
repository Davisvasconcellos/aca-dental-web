require('dotenv').config(); // Garante o carregamento do .env local, no deploy o host injeta as variáveis

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

const configRoutes = require('./routes/configRoutes');
const updateRoutes = require('./routes/updateRoutes');
const campanhaRoutes = require('./routes/campanhaRoutes');

// Middlewares
app.use(cors());
app.use(express.json());

// Usar rotas
app.use('/api/config', configRoutes);
app.use('/api/update', updateRoutes);
app.use('/api/campanhas', campanhaRoutes);

// ----------------------------------------------------
// ROTA DO DASHBOARD (Visão Geral)
// ----------------------------------------------------
app.get('/api/dashboard', async (req, res) => {
  try {
    const configs = await prisma.configuracao.findMany();
    const configMap = {};
    configs.forEach(c => configMap[c.chave] = c.valor);
    
    // Default KPIs Se não existirem
    const valorKpiLimpeza = parseInt(configMap.valor_limpeza || '200');
    const valorKpiConsulta = parseInt(configMap.valor_consulta || '250');

    // Trazemos pacientes com datas de limpeza e consulta
    const pacientes = await prisma.paciente.findMany({
      select: {
        id: true,
        nome: true,
        ultima_limpeza_data: true,
        ultima_evolucao_data: true
      }
    });

    // Trazemos todos os orçamentos (para gráficos de pizza, status e linhas)
    const orcamentos = await prisma.orcamento.findMany({
      select: {
        id: true,
        status: true,
        valor_total: true,
        data_orcamento: true,
        descricao: true,
        tratamentos: {
          select: { nome: true }
        },
        paciente: {
          select: { nome: true }
        }
      }
    });

    res.json({
      configs: { valorKpiLimpeza, valorKpiConsulta },
      pacientes,
      orcamentos
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
  }
});

// ----------------------------------------------------
// ROTAS DE PACIENTES (Todos)
// ----------------------------------------------------
app.get('/api/pacientes', async (req, res) => {
  try {
    const pacientes = await prisma.paciente.findMany({
      orderBy: { nome: 'asc' },
    });
    res.json(pacientes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar pacientes' });
  }
});

// ----------------------------------------------------
// ROTAS DO RADAR DE LIMPEZA
// ----------------------------------------------------
app.get('/api/limpeza/radar', async (req, res) => {
  try {
    const configs = await prisma.configuracao.findMany();
    const configMap = {};
    configs.forEach(c => configMap[c.chave] = c.valor);
    const radarDias = parseInt(configMap.radar_limpeza_dias || '180');

    // Busca os pacientes para o radar: ordenados por score (maiores primeiro)
    const pacientes = await prisma.paciente.findMany({
      orderBy: { score: 'desc' }
    });
    
    res.json({ radarDias, pacientes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar dados do radar' });
  }
});

// ----------------------------------------------------
// ROTAS DE ORÇAMENTOS
// ----------------------------------------------------
app.get('/api/orcamentos/abertos', async (req, res) => {
  try {
    const orcamentos = await prisma.orcamento.findMany({
      where: { status: 'EM_ABERTO' },
      include: {
        paciente: { select: { nome: true, telefone: true, id_sDental: true } },
        tratamentos: true
      },
      orderBy: { valor_total: 'desc' }
    });
    res.json(orcamentos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar orçamentos' });
  }
});

// ----------------------------------------------------
// HEALTHCHECK (Util para o Dokploy)
// ----------------------------------------------------
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'UP', db: 'CONNECTED' });
  } catch (err) {
    res.status(503).json({ status: 'DOWN', db: 'DISCONNECTED', error: err.message });
  }
});

// Start
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌍 Conectado ao banco: ${process.env.DATABASE_URL.split('@')[1] || 'Local'}`);
});
