const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obter todas as configurações
router.get('/', async (req, res) => {
  try {
    const configs = await prisma.configuracao.findMany();
    const configMap = {};
    configs.forEach(c => {
      configMap[c.chave] = c.valor;
    });
    res.json(configMap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Salvar/Atualizar configurações
router.post('/', async (req, res) => {
  try {
    const data = req.body; // { "token": "abc", "msg_padrao": "..." }
    const saved = {};
    
    for (const [chave, valor] of Object.entries(data)) {
      await prisma.configuracao.upsert({
        where: { chave },
        update: { valor: String(valor) },
        create: { chave, valor: String(valor) }
      });
      saved[chave] = valor;
    }
    
    res.json({ ok: true, saved });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Testar Token
router.post('/testar-token', async (req, res) => {
  try {
    let token = req.body.token;
    
    if (!token) {
      // Pega o atual do DB
      const dbToken = await prisma.configuracao.findUnique({ where: { chave: 'token' } });
      token = dbToken?.valor;
    }

    if (!token) {
      return res.json({ ok: false, msg: 'Nenhum token fornecido ou salvo.' });
    }

    // Fazer uma requisição leve para a API do Simples Dental para testar
    // Vamos usar a mesma URL de teste original
    const URL_TEST = "https://api.simplesdental.com/pacientes/37249577/evolucoes?pageSize=1&pageNumber=1";
    
    const response = await fetch(URL_TEST, {
      method: 'GET',
      headers: {
        "x-auth-token": token,
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0",
        "Origin": "https://app.simplesdental.com"
      }
    });

    if (response.ok) {
      return res.json({ ok: true, msg: 'Autenticado com sucesso!' });
    } else {
      return res.json({ ok: false, msg: `Falha na autenticação (HTTP ${response.status})` });
    }
  } catch (err) {
    res.status(500).json({ ok: false, msg: `Erro de rede: ${err.message}` });
  }
});

// Testar Evolution API
router.post('/testar-evolution', async (req, res) => {
  try {
    const { url, instance, apikey, phone, message } = req.body;
    
    if (!url || !instance || !apikey || !phone || !message) {
      return res.json({ ok: false, msg: 'Preencha todos os campos da Evolution API e do teste.' });
    }

    // Limpar telefone (apenas números)
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55') && cleanPhone.length <= 11) {
      cleanPhone = '55' + cleanPhone;
    }

    // Montar URL da API
    const apiUrl = `${url.replace(/\/$/, '')}/message/sendText/${instance}`;
    
    const payload = {
      number: cleanPhone,
      options: {
        delay: 1000,
        presence: "composing"
      },
      text: message
    };

    console.log(`[EVOLUTION TEST] Sending to: ${apiUrl}`);
    console.log(`[EVOLUTION TEST] Payload:`, payload);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apikey
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json().catch(() => null);

    if (response.ok) {
      return res.json({ ok: true, msg: 'Mensagem enviada com sucesso pela Evolution API!', data: responseData });
    } else {
      return res.json({ ok: false, msg: `Erro da Evolution API (HTTP ${response.status}): ${responseData?.response?.message || responseData?.message || JSON.stringify(responseData)}` });
    }
  } catch (err) {
    console.error('[EVOLUTION ERROR]', err);
    res.status(500).json({ ok: false, msg: `Erro interno de conexão: ${err.message}` });
  }
});

// Buscar QR Code de Conexão da Evolution API
router.get('/evolution-qr', async (req, res) => {
  try {
    const configs = await prisma.configuracao.findMany();
    const configMap = {};
    configs.forEach(c => { configMap[c.chave] = c.valor; });
    
    const url = configMap['evo_url'];
    const instance = configMap['evo_instance'];
    const apikey = configMap['evo_apikey'];

    if (!url || !instance || !apikey) {
      return res.status(400).json({ ok: false, msg: 'Evolution API não está totalmente configurada.' });
    }

    const apiUrl = `${url.replace(/\/$/, '')}/instance/connect/${instance}`;
    
    console.log(`[EVOLUTION QR] Fetching: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'apikey': apikey }
    });

    const data = await response.json().catch(() => null);

    if (response.ok && data) {
      // Retorna o base64
      const base64 = data.base64 || data?.instance?.qr || data?.qrcode; // Depende da versão da API
      if (base64) {
        return res.json({ ok: true, base64 });
      } else {
        return res.json({ ok: false, msg: 'Instância já está conectada ou QR Code não disponível.', data });
      }
    } else {
      return res.status(response.status).json({ ok: false, msg: 'Erro ao buscar QR Code', data });
    }
  } catch (err) {
    console.error('[EVOLUTION QR ERROR]', err);
    res.status(500).json({ ok: false, msg: `Erro interno: ${err.message}` });
  }
});

module.exports = router;
