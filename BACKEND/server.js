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
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { authMiddleware } = require('./middleware/authMiddleware');

// Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://aca.dmedia.com.br', 'http://aca.dmedia.com.br'],
  credentials: true
}));
app.use(express.json());

// Usar rotas
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/config', authMiddleware, configRoutes);
app.use('/api/update', authMiddleware, updateRoutes);
app.use('/api/campanhas', authMiddleware, campanhaRoutes);

// ----------------------------------------------------
// ROTA DE STATUS DA API
// ----------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    app: 'ACA Dental Web API'
  });
});

// ----------------------------------------------------
// ROTA DO DASHBOARD (Visão Geral)
// ----------------------------------------------------
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    console.log(`[DASHBOARD] user orgId: ${orgId}`);
    const configs = await prisma.configuracao.findMany({ where: { organization_id: orgId } });
    const configMap = {};
    configs.forEach(c => configMap[c.chave] = c.valor);
    
    // Default KPIs Se não existirem
    const valorKpiLimpeza = parseInt(configMap.valor_limpeza || '200');
    const valorKpiConsulta = parseInt(configMap.valor_consulta || '250');

    // Trazemos pacientes com datas de limpeza e consulta
    const pacientes = await prisma.paciente.findMany({
      where: { organization_id: orgId },
      select: {
        id: true,
        nome: true,
        ultima_limpeza_data: true,
        ultima_evolucao_data: true
      }
    });

    // Trazemos todos os orçamentos (para gráficos de pizza, status e linhas)
    const orcamentos = await prisma.orcamento.findMany({
      where: { organization_id: orgId },
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

    console.log(`[DASHBOARD] Return: ${pacientes.length} pacientes, ${orcamentos.length} orcamentos`);
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
app.get('/api/pacientes', authMiddleware, async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    console.log(`[PACIENTES] user orgId: ${orgId}`);
    const pacientes = await prisma.paciente.findMany({
      where: { organization_id: orgId },
      orderBy: { nome: 'asc' },
    });
    console.log(`[PACIENTES] Return: ${pacientes.length} pacientes`);
    res.json(pacientes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar pacientes' });
  }
});

// ----------------------------------------------------
// ROTAS DO RADAR DE LIMPEZA
// ----------------------------------------------------
app.get('/api/limpeza/radar', authMiddleware, async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const configs = await prisma.configuracao.findMany({ where: { organization_id: orgId } });
    const configMap = {};
    configs.forEach(c => configMap[c.chave] = c.valor);
    const radarDias = parseInt(configMap.radar_limpeza_dias || '180');

    // Busca os pacientes para o radar: ordenados por score (maiores primeiro)
    const pacientes = await prisma.paciente.findMany({
      where: { organization_id: orgId },
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
app.get('/api/orcamentos/abertos', authMiddleware, async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const orcamentos = await prisma.orcamento.findMany({
      where: { status: 'EM_ABERTO', organization_id: orgId },
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
