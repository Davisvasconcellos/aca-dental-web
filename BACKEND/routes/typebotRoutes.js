const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/integracoes/typebot/enviar
// Endpoint publico (protegido por apiKey no header ou body)
router.post('/enviar', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.body.apiKey;
    
    if (!apiKey) {
      return res.status(401).json({ ok: false, error: 'Chave de API não fornecida (apiKey ou header x-api-key).' });
    }

    // Buscar a configuracao que bate com essa apiKey de integracao
    const configKey = await prisma.configuracao.findFirst({
      where: {
        chave: 'typebot_api_key',
        valor: apiKey
      }
    });

    if (!configKey) {
      return res.status(401).json({ ok: false, error: 'Chave de API inválida ou não encontrada.' });
    }

    const orgId = configKey.organization_id;

    // Carregar todas as configuracoes da Evolution API para essa organizacao
    const configs = await prisma.configuracao.findMany({
      where: { organization_id: orgId }
    });

    const configMap = {};
    configs.forEach(c => { configMap[c.chave] = c.valor; });

    const evoUrl = configMap.evo_url;
    const evoInstance = configMap.evo_instance;
    const evoApikey = configMap.evo_apikey;

    if (!evoUrl || !evoInstance || !evoApikey) {
      return res.status(400).json({ ok: false, error: 'Configurações da Evolution API não encontradas para esta organização.' });
    }

    const { phone, number, type, message, description, title, footer, buttons, mediatype, mediaType, mimetype, caption, media, mediaUrl, fileName } = req.body;

    const rawPhone = phone || number;
    if (!rawPhone) {
      return res.status(400).json({ ok: false, error: 'Telefone do destinatário é obrigatório (phone ou number).' });
    }

    // Limpar telefone (apenas numeros com DDI)
    let cleanPhone = String(rawPhone).replace(/\D/g, '');
    if (!cleanPhone.startsWith('55') && cleanPhone.length <= 11) {
      cleanPhone = '55' + cleanPhone;
    }

    const msgText = message || description || '';
    const msgType = (type || '').toLowerCase();

    const baseUrlClean = evoUrl.replace(/\/$/, '');
    let targetEndpoint = '';
    let payload = {};

    // 1. MENSAGEM COM BOTÕES
    if (msgType === 'button' || (buttons && Array.isArray(buttons) && buttons.length > 0)) {
      targetEndpoint = `${baseUrlClean}/message/sendButtons/${evoInstance}`;
      
      const formattedButtons = buttons.map((b, idx) => {
        if (typeof b === 'string') {
          return {
            type: 'reply',
            displayText: b,
            id: `btn_${Date.now()}_${idx}`
          };
        }
        return {
          type: b.type || 'reply',
          displayText: b.displayText || b.title || b.text || `Opção ${idx + 1}`,
          id: b.id || `btn_${Date.now()}_${idx}`,
          ...(b.url ? { url: b.url } : {}),
          ...(b.phoneNumber ? { phoneNumber: b.phoneNumber } : {}),
          ...(b.copyCode ? { copyCode: b.copyCode } : {}),
          ...(b.key ? { key: b.key, keyType: b.keyType || 'random', currency: b.currency || 'BRL', name: b.name || '' } : {})
        };
      });

      payload = {
        number: cleanPhone,
        options: { delay: 1000, presence: "composing" },
        title: title || 'Mensagem da Clínica',
        description: msgText,
        footer: footer || 'Selecione uma opção abaixo:',
        buttons: formattedButtons
      };

    // 2. MENSAGEM COM MÍDIA (imagem, vídeo, documento)
    } else if (msgType === 'media' || media || mediaUrl) {
      targetEndpoint = `${baseUrlClean}/message/sendMedia/${evoInstance}`;
      const finalMedia = media || mediaUrl;
      const finalType = mediatype || mediaType || 'image';

      payload = {
        number: cleanPhone,
        mediatype: finalType,
        media: finalMedia,
        caption: caption || msgText || '',
        ...(fileName ? { fileName } : {}),
        ...(mimetype ? { mimetype } : {})
      };

    // 3. MENSAGEM DE TEXTO SIMPLES
    } else {
      targetEndpoint = `${baseUrlClean}/message/sendText/${evoInstance}`;
      payload = {
        number: cleanPhone,
        options: { delay: 1000, presence: "composing" },
        text: msgText
      };
    }

    console.log(`[TYPEBOT GATEWAY] Sending to ${targetEndpoint}`);
    console.log(`[TYPEBOT GATEWAY] Payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch(targetEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evoApikey
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json().catch(() => null);

    if (response.ok) {
      return res.json({
        ok: true,
        msg: 'Mensagem disparada com sucesso via Typebot Gateway!',
        data: responseData
      });
    } else {
      console.error(`[TYPEBOT GATEWAY ERROR] HTTP ${response.status}:`, responseData);
      return res.status(response.status).json({
        ok: false,
        msg: `Erro na Evolution API (HTTP ${response.status})`,
        data: responseData
      });
    }

  } catch (error) {
    console.error('[TYPEBOT GATEWAY] Erro interno:', error);
    return res.status(500).json({ ok: false, error: 'Erro interno ao processar disparo do Typebot.' });
  }
});

module.exports = router;
