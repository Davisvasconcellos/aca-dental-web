const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const prisma = new PrismaClient();

// Todas as rotas admin requerem login e perfil MASTER
router.use(authMiddleware);
router.use(roleMiddleware(['MASTER']));

// --- Organizations (Clínicas) ---

router.get('/organizations', async (req, res) => {
  try {
    const orgs = await prisma.organization.findMany();
    res.json(orgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/organizations', async (req, res) => {
  const { nome, logo, evo_instance } = req.body;
  
  try {
    const org = await prisma.organization.create({
      data: { nome, logo, evo_instance }
    });
    res.json({ ok: true, org });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/organizations/:id/create-instance', async (req, res) => {
  const { id } = req.params;
  try {
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return res.status(404).json({ ok: false, msg: 'Clínica não encontrada' });

    const dbConfig = await prisma.configuracao.findMany();
    const configMap = {};
    dbConfig.forEach(c => configMap[c.chave] = c.valor);
    
    const url = configMap['evo_url'];
    const apikey = configMap['evo_apikey'];
    
    if (!url || !apikey) {
      return res.status(400).json({ ok: false, msg: 'Evolution API não configurada globalmente.' });
    }

    const apiUrl = `${url.replace(/\/$/, '')}/instance/create`;
    const evoRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apikey
      },
      body: JSON.stringify({
        instanceName: org.evo_instance,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS"
      })
    });

    const data = await evoRes.json().catch(() => null);

    if (evoRes.ok) {
      res.json({ ok: true, msg: 'Instância criada com sucesso!' });
    } else {
      console.error("[EVOLUTION API ERROR]", data);
      res.status(evoRes.status).json({ 
        ok: false, 
        msg: `Erro na Evolution API: ${data?.message || data?.response?.message || 'Erro desconhecido'}`,
        details: data
      });
    }
  } catch (err) {
    res.status(500).json({ ok: false, msg: `Erro interno: ${err.message}` });
  }
});

router.put('/organizations/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, evo_instance } = req.body;
  try {
    const org = await prisma.organization.update({
      where: { id },
      data: { nome, evo_instance }
    });
    res.json({ ok: true, org });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/organizations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.organization.delete({
      where: { id }
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Usuarios ---

router.get('/users', async (req, res) => {
  try {
    const users = await prisma.usuario.findMany({
      include: { organization: true },
      where: { role: 'ADMIN' } // Lista apenas admins das clínicas
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', async (req, res) => {
  const { email, senha, organization_id } = req.body;
  
  try {
    const existing = await prisma.usuario.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ ok: false, msg: 'Email já cadastrado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(senha, salt);
    
    const user = await prisma.usuario.create({
      data: {
        email,
        senha: hash,
        role: 'ADMIN',
        organization_id
      },
      include: { organization: true }
    });
    
    // Removendo senha da resposta
    delete user.senha;
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { email, senha, organization_id } = req.body;
  try {
    const data = { email, organization_id };
    if (senha) {
      const salt = await bcrypt.genSalt(10);
      data.senha = await bcrypt.hash(senha, salt);
    }
    const user = await prisma.usuario.update({
      where: { id },
      data,
      include: { organization: true }
    });
    delete user.senha;
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.usuario.delete({
      where: { id }
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Configurações Globais (Evolution) ---

router.get('/evolution', async (req, res) => {
  try {
    const dbConfig = await prisma.configuracao.findMany({
      where: { chave: { in: ['evo_url', 'evo_apikey'] } }
    });
    
    const configMap = { evo_url: '', evo_apikey: '' };
    dbConfig.forEach(c => configMap[c.chave] = c.valor);
    
    let status = 'desconectado';
    let instances = [];
    if (configMap.evo_url && configMap.evo_apikey) {
      try {
        const apiUrl = `${configMap.evo_url.replace(/\/$/, '')}/instance/fetchInstances`;
        const testRes = await fetch(apiUrl, {
          method: 'GET',
          headers: { 'apikey': configMap.evo_apikey }
        });
        if (testRes.ok) {
          status = 'conectado';
          instances = await testRes.json();
        }
      } catch (e) {
        status = 'erro';
      }
    }

    res.json({ config: configMap, status, instances });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/evolution', async (req, res) => {
  const { evo_url, evo_apikey } = req.body;
  
  try {
    if (evo_url !== undefined) {
      await prisma.configuracao.upsert({
        where: { chave: 'evo_url' },
        update: { valor: evo_url },
        create: { chave: 'evo_url', valor: evo_url }
      });
    }
    if (evo_apikey !== undefined) {
      await prisma.configuracao.upsert({
        where: { chave: 'evo_apikey' },
        update: { valor: evo_apikey },
        create: { chave: 'evo_apikey', valor: evo_apikey }
      });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
