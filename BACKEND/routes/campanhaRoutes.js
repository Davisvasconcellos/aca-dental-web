const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/campanhas
// Lista todas as campanhas, ordenadas por data de início (mais recentes primeiro)
router.get('/', async (req, res) => {
  try {
    const campanhas = await prisma.campanha.findMany({
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
        where: { campanha_id: c.id, status_envio: 'ENVIADO' }
      });
      return {
        ...c,
        total_alvos: c._count.alvos,
        enviados
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
    const campanha = await prisma.campanha.findUnique({
      where: { id },
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
    const { nome, mensagem_template, pacientesIds } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Dados inválidos. Necessário nome.' });
    }

    const alvos = (pacientesIds && Array.isArray(pacientesIds)) ? pacientesIds : [];

    // Criar a campanha e os alvos em uma transação
    const novaCampanha = await prisma.campanha.create({
      data: {
        nome,
        mensagem_template: mensagem_template || '',
        status: 'ATIVA',
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
    const { status_envio } = req.body;

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
        data_envio: status_envio === 'ENVIADO' ? new Date() : undefined
      },
      create: {
        campanha_id: id,
        paciente_id: paciente_id,
        status_envio,
        data_envio: status_envio === 'ENVIADO' ? new Date() : undefined
      }
    });

    res.json(alvoAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar alvo da campanha:", error);
    res.status(500).json({ error: 'Erro interno ao atualizar alvo da campanha.' });
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
