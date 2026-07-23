const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/campanhas
// Lista todas as campanhas, ordenadas por data de início (mais recentes primeiro)
router.get('/', async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const campanhas = await prisma.campanha.findMany({
      where: { organization_id: orgId },
      orderBy: { data_inicio: 'desc' },
      include: {
        _count: {
          select: { alvos: true }
        }
      }
    });

    // Mapear para incluir contagem de status
    const campanhasComStatus = await Promise.all(campanhas.map(async (c) => {
      const enviados = await prisma.campanhaAlvo.count({
        where: { campanha_id: c.id, status_envio: { in: ['ENVIADO', 'RESPONDIDO'] } }
      });
      const respondidos = await prisma.campanhaAlvo.count({
        where: { campanha_id: c.id, status_envio: 'RESPONDIDO' }
      });
      return {
        ...c,
        total_alvos: c._count.alvos,
        enviados,
        respondidos
      };
    }));

    res.json(campanhasComStatus);
  } catch (error) {
    console.error("Erro ao buscar campanhas:", error);
    res.status(500).json({ error: 'Erro interno ao buscar campanhas.' });
  }
});

// GET /api/campanhas/:id
// Detalhes de uma campanha específica e seus alvos
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.organization_id;
    const campanha = await prisma.campanha.findFirst({
      where: { id, organization_id: orgId },
      include: {
        alvos: {
          include: {
            paciente: {
              select: { nome: true, telefone: true, id_sDental: true }
            }
          }
        }
      }
    });

    if (!campanha) return res.status(404).json({ error: 'Campanha não encontrada.' });
    res.json(campanha);
  } catch (error) {
    console.error("Erro ao buscar detalhes da campanha:", error);
    res.status(500).json({ error: 'Erro interno ao buscar detalhes da campanha.' });
  }
});

// POST /api/campanhas
// Cria uma nova campanha e seus alvos
router.post('/', async (req, res) => {
  try {
    const { nome, mensagem_template, botoes, pacientesIds } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Dados inválidos. Necessário nome.' });
    }

    const alvos = (pacientesIds && Array.isArray(pacientesIds)) ? pacientesIds : [];

    // Criar a campanha e os alvos em uma transação
    const orgId = req.user.organization_id;
    const novaCampanha = await prisma.campanha.create({
      data: {
        nome,
        mensagem_template: mensagem_template || '',
        botoes: botoes || null,
        status: 'ATIVA',
        organization_id: orgId,
        alvos: {
          create: alvos.map(id => ({
            paciente_id: id,
            status_envio: 'PENDENTE'
          }))
        }
      }
    });

    res.status(201).json(novaCampanha);
  } catch (error) {
    console.error("Erro ao criar campanha:", error);
    res.status(500).json({ error: 'Erro interno ao criar campanha.' });
  }
});

// PUT /api/campanhas/:id/alvo/:paciente_id
// Atualiza o status de um alvo específico (ex: ENVIADO) ou cria se não existir
router.put('/:id/alvo/:paciente_id', async (req, res) => {
  try {
    const { id, paciente_id } = req.params;
    const { status_envio, typebot_session_id } = req.body;

    if (!status_envio) return res.status(400).json({ error: 'status_envio é obrigatório' });

    const alvoAtualizado = await prisma.campanhaAlvo.upsert({
      where: {
        campanha_id_paciente_id: {
          campanha_id: id,
          paciente_id: paciente_id
        }
      },
      update: {
        status_envio,
        data_envio: status_envio === 'ENVIADO' ? new Date() : undefined,
        ...(typebot_session_id !== undefined ? { typebot_session_id } : {})
      },
      create: {
        campanha_id: id,
        paciente_id: paciente_id,
        status_envio,
        data_envio: status_envio === 'ENVIADO' ? new Date() : undefined,
        typebot_session_id: typebot_session_id || null
      }
    });

    res.json(alvoAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar alvo da campanha:", error);
    res.status(500).json({ error: 'Erro interno ao atualizar alvo da campanha.' });
  }
});

// POST /api/campanhas/:id/pre-registrar-typebot
// Pré-registra uma sessão no Typebot com todas as variáveis (paciente, campanha, apiKey, serverUrl, instanceName)
router.post('/:id/pre-registrar-typebot', async (req, res) => {
  try {
    const { id } = req.params;
    const { paciente_id, typebot_public_id } = req.body;
    const orgId = req.user.organization_id;

    if (!paciente_id) {
      return res.status(400).json({ error: 'paciente_id é obrigatório' });
    }

    const paciente = await prisma.paciente.findUnique({
      where: { id: paciente_id }
    });

    if (!paciente) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    const userOrgId = req.user?.organization_id || paciente.organization_id;
    const configs = await prisma.configuracao.findMany({
      where: { organization_id: userOrgId }
    });
    const configMap = {};
    configs.forEach(c => { configMap[c.chave] = c.valor; });

    const typebotUrl = configMap.typebot_url || 'https://typebot-viewer.dmedia.com.br';
    const publicId = configMap.typebot_public_id || 'aca-limpeza-npgmb3s';

    let cleanPhone = String(paciente.telefone || '').replace(/\D/g, '');
    if (!cleanPhone.startsWith('55') && cleanPhone.length <= 11) {
      cleanPhone = '55' + cleanPhone;
    }

    const startPayload = {
      isOnlyRegistering: true,
      prefilledVariables: {
        remoteJid: `${cleanPhone}@s.whatsapp.net`,
        pacienteId: paciente.id,
        pacienteNome: paciente.nome,
        campanhaId: id,
        organizationId: orgId,
        apiKey: configMap.typebot_api_key || '',
        tbKey: configMap.typebot_api_key || '',
        serverUrl: configMap.evo_url || '',
        instanceName: configMap.evo_instance || '',
        pushName: paciente.nome ? paciente.nome.split(' ')[0] : '',
        contactName: paciente.nome || ''
      }
    };

    const response = await fetch(`${typebotUrl.replace(/\/$/, '')}/api/v1/typebots/${publicId}/startChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(startPayload)
    });

    const data = await response.json().catch(() => null);
    const sessionId = data?.sessionId || data?.session?.id;

    if (sessionId) {
      await prisma.campanhaAlvo.upsert({
        where: {
          campanha_id_paciente_id: {
            campanha_id: id,
            paciente_id: paciente_id
          }
        },
        update: { typebot_session_id: sessionId },
        create: {
          campanha_id: id,
          paciente_id: paciente_id,
          status_envio: 'PENDENTE',
          typebot_session_id: sessionId
        }
      });

      return res.json({ ok: true, sessionId });
    } else {
      return res.status(400).json({ ok: false, error: 'Não foi possível obter sessionId do Typebot', data });
    }
  } catch (error) {
    console.error("Erro ao pré-registrar sessão no Typebot:", error);
    res.status(500).json({ error: 'Erro interno ao pré-registrar sessão no Typebot.' });
  }
});

// PUT /api/campanhas/:id/finalizar
// Finaliza uma campanha
router.put('/:id/finalizar', async (req, res) => {
  try {
    const { id } = req.params;

    const campanha = await prisma.campanha.update({
      where: { id },
      data: {
        status: 'CONCLUIDA',
        data_fim: new Date()
      }
    });

    res.json(campanha);
  } catch (error) {
    console.error("Erro ao finalizar campanha:", error);
    res.status(500).json({ error: 'Erro interno ao finalizar campanha.' });
  }
});

// DELETE /api/campanhas/:id
// Exclui uma campanha (e seus alvos via Cascade)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.campanha.delete({
      where: { id }
    });
    res.status(204).send();
  } catch (error) {
    console.error("Erro ao excluir campanha:", error);
    res.status(500).json({ error: 'Erro interno ao excluir campanha.' });
  }
});

module.exports = router;
