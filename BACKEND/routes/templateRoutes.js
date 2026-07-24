const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/templates
// Lista todos os modelos de mensagens da organização
router.get('/', async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const templates = await prisma.mensagemTemplate.findMany({
      where: { organization_id: orgId },
      orderBy: { id: 'desc' }
    });
    res.json(templates);
  } catch (error) {
    console.error("Erro ao listar templates:", error);
    res.status(500).json({ error: 'Erro interno ao listar templates.' });
  }
});

// GET /api/templates/:id
// Obtém detalhes de um template específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.organization_id;

    const template = await prisma.mensagemTemplate.findFirst({
      where: { id, organization_id: orgId }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template não encontrado.' });
    }

    res.json(template);
  } catch (error) {
    console.error("Erro ao buscar template:", error);
    res.status(500).json({ error: 'Erro interno ao buscar template.' });
  }
});

// POST /api/templates
// Cria um novo modelo de mensagem rico
router.post('/', async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const {
      titulo,
      tipo = 'TEXTO',
      texto,
      header_texto,
      footer_texto,
      botoes,
      media_url,
      media_tipo,
      file_name,
      typebot_public_id,
      sections,
      location_data,
      contact_data
    } = req.body;

    if (!titulo || !texto) {
      return res.status(400).json({ error: 'Título e texto da mensagem são obrigatórios.' });
    }

    const template = await prisma.mensagemTemplate.create({
      data: {
        titulo,
        tipo,
        texto,
        header_texto: header_texto || null,
        footer_texto: footer_texto || null,
        botoes: botoes ? (typeof botoes === 'string' ? botoes : JSON.stringify(botoes)) : null,
        media_url: media_url || null,
        media_tipo: media_tipo || null,
        file_name: file_name || null,
        typebot_public_id: typebot_public_id || null,
        sections: sections ? (typeof sections === 'string' ? sections : JSON.stringify(sections)) : null,
        location_data: location_data ? (typeof location_data === 'string' ? location_data : JSON.stringify(location_data)) : null,
        contact_data: contact_data ? (typeof contact_data === 'string' ? contact_data : JSON.stringify(contact_data)) : null,
        organization_id: orgId
      }
    });

    res.status(201).json(template);
  } catch (error) {
    console.error("Erro ao criar template:", error);
    res.status(500).json({ error: 'Erro interno ao criar template.' });
  }
});

// PUT /api/templates/:id
// Atualiza um modelo existente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.organization_id;
    const {
      titulo,
      tipo,
      texto,
      header_texto,
      footer_texto,
      botoes,
      media_url,
      media_tipo,
      file_name,
      typebot_public_id,
      sections,
      location_data,
      contact_data
    } = req.body;

    const templateExistente = await prisma.mensagemTemplate.findFirst({
      where: { id, organization_id: orgId }
    });

    if (!templateExistente) {
      return res.status(404).json({ error: 'Template não encontrado.' });
    }

    const templateAtualizado = await prisma.mensagemTemplate.update({
      where: { id },
      data: {
        ...(titulo ? { titulo } : {}),
        ...(tipo ? { tipo } : {}),
        ...(texto !== undefined ? { texto } : {}),
        header_texto: header_texto !== undefined ? header_texto : templateExistente.header_texto,
        footer_texto: footer_texto !== undefined ? footer_texto : templateExistente.footer_texto,
        botoes: botoes !== undefined ? (typeof botoes === 'string' ? botoes : JSON.stringify(botoes)) : templateExistente.botoes,
        media_url: media_url !== undefined ? media_url : templateExistente.media_url,
        media_tipo: media_tipo !== undefined ? media_tipo : templateExistente.media_tipo,
        file_name: file_name !== undefined ? file_name : templateExistente.file_name,
        typebot_public_id: typebot_public_id !== undefined ? typebot_public_id : templateExistente.typebot_public_id,
        sections: sections !== undefined ? (typeof sections === 'string' ? sections : JSON.stringify(sections)) : templateExistente.sections,
        location_data: location_data !== undefined ? (typeof location_data === 'string' ? location_data : JSON.stringify(location_data)) : templateExistente.location_data,
        contact_data: contact_data !== undefined ? (typeof contact_data === 'string' ? contact_data : JSON.stringify(contact_data)) : templateExistente.contact_data
      }
    });

    res.json(templateAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar template:", error);
    res.status(500).json({ error: 'Erro interno ao atualizar template.' });
  }
});

// DELETE /api/templates/:id
// Exclui um modelo de mensagem
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.organization_id;

    const templateExistente = await prisma.mensagemTemplate.findFirst({
      where: { id, organization_id: orgId }
    });

    if (!templateExistente) {
      return res.status(404).json({ error: 'Template não encontrado.' });
    }

    await prisma.mensagemTemplate.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error("Erro ao excluir template:", error);
    res.status(500).json({ error: 'Erro interno ao excluir template.' });
  }
});

module.exports = router;
