const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obter todas as configurações
router.get('/', async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const configs = await prisma.configuracao.findMany({
      where: { organization_id: orgId }
    });
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
    
    const orgId = req.user.organization_id;
    for (const [chave, valor] of Object.entries(data)) {
      await prisma.configuracao.upsert({
        where: { chave_organization_id: { chave, organization_id: orgId } },
        update: { valor: String(valor) },
        create: { chave, valor: String(valor), organization_id: orgId }
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
      const orgId = req.user.organization_id;
      const dbToken = await prisma.configuracao.findUnique({ 
        where: { chave_organization_id: { chave: 'token', organization_id: orgId } } 
      });
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
    const { url, instance, apikey, phone, message, botoes } = req.body;
    
    if (!url || !instance || !apikey || !phone || !message) {
      return res.json({ ok: false, msg: 'Preencha todos os campos da Evolution API e do teste.' });
    }

    // Limpar telefone (apenas números)
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55') && cleanPhone.length <= 11) {
      cleanPhone = '55' + cleanPhone;
    }

    // Verifica se existem botões (array ou JSON string) para usar sendButtons
    let parsedBotoes = botoes;
    if (typeof botoes === 'string') {
      try { parsedBotoes = JSON.parse(botoes); } catch (e) { parsedBotoes = null; }
    }

    let apiUrl = `${url.replace(/\/$/, '')}/message/sendText/${instance}`;
    let payload = {
      number: cleanPhone,
      options: { delay: 1000, presence: "composing" },
      text: message
    };

    if (parsedBotoes && Array.isArray(parsedBotoes) && parsedBotoes.length > 0) {
      apiUrl = `${url.replace(/\/$/, '')}/message/sendButtons/${instance}`;
      
      const formattedButtons = parsedBotoes.map((b, idx) => {
        const bType = b.type || 'reply';
        const labelText = b.displayText || b.title || b.label || `Opção ${idx + 1}`;

        if (bType === 'reply') {
          return {
            type: 'reply',
            displayText: labelText,
            id: b.id || `btn_${Date.now()}_${idx}`
          };
        } else if (bType === 'copy') {
          return {
            type: 'copy',
            displayText: labelText,
            copyCode: b.copyCode || ''
          };
        } else if (bType === 'url') {
          return {
            type: 'url',
            displayText: labelText,
            url: b.url || ''
          };
        } else if (bType === 'call') {
          return {
            type: 'call',
            displayText: labelText,
            phoneNumber: b.phoneNumber || ''
          };
        } else if (bType === 'pix') {
          return {
            type: 'pix',
            currency: 'BRL',
            name: b.name || labelText || 'PIX',
            keyType: b.keyType || 'cpf',
            key: b.key || ''
          };
        }
        return {
          type: 'reply',
          displayText: labelText,
          id: b.id || `btn_${Date.now()}_${idx}`
        };
      });

      payload = {
        number: cleanPhone,
        options: { delay: 1000, presence: "composing" },
        title: req.body.header || req.body.header_texto || "Mensagem da Clínica",
        description: message,
        footer: req.body.footer || req.body.footer_texto || "Selecione uma opção abaixo:",
        buttons: formattedButtons
      };
    }

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
    const orgId = req.user.organization_id;
    const configs = await prisma.configuracao.findMany({
      where: { organization_id: orgId }
    });
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

// Buscar Status da Instância da Evolution API
router.get('/evolution-status', async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const configs = await prisma.configuracao.findMany({
      where: { organization_id: orgId }
    });
    const configMap = {};
    configs.forEach(c => { configMap[c.chave] = c.valor; });
    
    const url = configMap['evo_url'];
    const instance = configMap['evo_instance'];
    const apikey = configMap['evo_apikey'];

    if (!url || !instance || !apikey) {
      return res.json({ ok: true, state: 'NOT_CONFIGURED' });
    }

    const apiUrl = `${url.replace(/\/$/, '')}/instance/connectionState/${instance}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'apikey': apikey }
    });

    const data = await response.json().catch(() => null);

    if (response.ok && data) {
      // Retorna o state real (open, close, connecting)
      const state = data.instance?.state || data.state || 'DISCONNECTED';
      return res.json({ ok: true, state: state.toUpperCase() });
    } else {
      return res.json({ ok: true, state: 'ERROR' });
    }
  } catch (err) {
    console.error('[EVOLUTION STATUS ERROR]', err);
    return res.json({ ok: true, state: 'ERROR' });
  }
});

module.exports = router;
