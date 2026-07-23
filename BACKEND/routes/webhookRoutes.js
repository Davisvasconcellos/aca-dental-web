const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Armazena em memória os últimos 100 logs de webhooks para depuração em tempo real
const webhookLogs = [];

function addWebhookLog(type, message, details = null) {
  const logItem = {
    id: Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    type,
    message,
    details
  };
  webhookLogs.unshift(logItem);
  if (webhookLogs.length > 100) webhookLogs.pop();
  console.log(`[WEBHOOK LOG - ${type}] ${message}`, details ? JSON.stringify(details) : '');
}

// GET /api/webhooks/logs
// Endpoint público de depuração dos eventos do webhook e Typebot
router.get('/logs', (req, res) => {
  res.json({ ok: true, total: webhookLogs.length, logs: webhookLogs });
});

// DELETE /api/webhooks/logs
// Limpa o histórico de logs
router.delete('/logs', (req, res) => {
  webhookLogs.length = 0;
  res.json({ ok: true, msg: 'Logs limpos com sucesso.' });
});

// A Evolution API envia POSTs para esta rota quando um evento ocorre.
// URL cadastrada: https://aca-api.dmedia.com.br/api/webhooks/evolution
router.post('/evolution', async (req, res) => {
  try {
    const event = req.body;
    
    // Verificamos se é um evento de recebimento de mensagem (MESSAGES_UPSERT)
    if (event && (event.event === 'messages.upsert' || event.event === 'MESSAGES_UPSERT')) {
      const messages = event.data?.messages || event.data;
      const messagesArray = Array.isArray(messages) ? messages : [messages];
      
      if (messagesArray.length > 0) {
        for (const msg of messagesArray) {
          // Ignoramos mensagens enviadas por nós mesmos
          if (msg.key?.fromMe) continue;
          
          const remoteJid = msg.key?.remoteJid; // Ex: 5511999999999@s.whatsapp.net
          if (!remoteJid) continue;
          
          // Tratando o telefone para ficar só os números (ex: 5521965445992)
          let phone = remoteJid.split('@')[0];
          let cleanIncomingPhone = phone.replace(/\D/g, '');
          
          // O texto da resposta (priorizando o texto visível do botão clicado: "SIM" / "NÃO")
          let responseText = msg.message?.buttonsResponseMessage?.selectedDisplayText ||
                             msg.message?.templateButtonReplyMessage?.selectedDisplayText ||
                             msg.message?.conversation || 
                             msg.message?.extendedTextMessage?.text || 
                             msg.message?.buttonsResponseMessage?.selectedButtonId ||
                             msg.message?.templateButtonReplyMessage?.selectedId ||
                             msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
                             '';

          addWebhookLog('RECEIVE', `Mensagem recebida do WhatsApp: "${responseText}"`, {
            remoteJid,
            phone,
            cleanIncomingPhone,
            responseText
          });

          // Buscar pacientes e comparar ignorando formatação (+55 21 99999-9999)
          const todosPacientes = await prisma.paciente.findMany({
            select: { id: true, nome: true, telefone: true, organization_id: true }
          });

          const paciente = todosPacientes.find(p => p.telefone && p.telefone.replace(/\D/g, '') === cleanIncomingPhone) ||
                           todosPacientes.find(p => p.telefone && p.telefone.replace(/\D/g, '').endsWith(cleanIncomingPhone.slice(-8)));
          
          if (paciente) {
            addWebhookLog('PATIENT_MATCH', `Paciente identificado: ${paciente.nome}`, {
              pacienteId: paciente.id,
              nome: paciente.nome,
              telefoneBanco: paciente.telefone
            });
            
            // Buscar o alvo de campanha mais recente
            const ultimoAlvo = await prisma.campanhaAlvo.findFirst({
              where: {
                paciente_id: paciente.id,
                status_envio: { in: ['ENVIADO', 'EM_ANDAMENTO', 'PENDENTE', 'RESPONDIDO'] }
              },
              orderBy: {
                data_envio: 'desc'
              }
            });
            
            if (ultimoAlvo) {
              // Atualizamos para RESPONDIDO no banco do ACA
              await prisma.campanhaAlvo.update({
                where: {
                  campanha_id_paciente_id: {
                    campanha_id: ultimoAlvo.campanha_id,
                    paciente_id: ultimoAlvo.paciente_id
                  }
                },
                data: {
                  status_envio: 'RESPONDIDO',
                  resposta_texto: responseText,
                  data_resposta: new Date()
                }
              });

              addWebhookLog('TARGET_MATCH', `Alvo da campanha localizado. Status alterado para RESPONDIDO.`, {
                campanhaId: ultimoAlvo.campanha_id,
                sessionId: ultimoAlvo.typebot_session_id
              });

              // Buscar configuracoes da organizacao
              const configs = await prisma.configuracao.findMany({
                where: { organization_id: paciente.organization_id }
              });
              const configMap = {};
              configs.forEach(c => { configMap[c.chave] = c.valor; });

              const typebotUrl = configMap.typebot_url || 'https://typebot-viewer.dmedia.com.br';
              const publicId = configMap.typebot_public_id || 'aca-limpeza-npgmb3s';
              const evoUrl = configMap.evo_url;
              const evoInstance = configMap.evo_instance;
              const evoApikey = configMap.evo_apikey;

              let sessionId = ultimoAlvo.typebot_session_id;

              // SE NÃO TIVER SESSÃO CRIADA, CRIA UMA AGORA MESMO COM AS VARIÁVEIS DO PACIENTE!
              if (!sessionId) {
                addWebhookLog('TYPEBOT_AUTO_START', `Gerando nova sessão no Typebot para ${paciente.nome}...`, {
                  typebotUrl,
                  publicId
                });

                try {
                  const startPayload = {
                    isOnlyRegistering: true,
                    prefilledVariables: {
                      remoteJid: `${cleanIncomingPhone}@s.whatsapp.net`,
                      pacienteId: paciente.id,
                      pacienteNome: paciente.nome,
                      campanhaId: ultimoAlvo.campanha_id,
                      organizationId: paciente.organization_id,
                      apiKey: configMap.typebot_api_key || '',
                      tbKey: configMap.typebot_api_key || '',
                      serverUrl: evoUrl || '',
                      instanceName: evoInstance || '',
                      pushName: paciente.nome ? paciente.nome.split(' ')[0] : '',
                      contactName: paciente.nome || ''
                    }
                  };

                  const startRes = await fetch(`${typebotUrl.replace(/\/$/, '')}/api/v1/typebots/${publicId}/startChat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(startPayload)
                  });

                  const startData = await startRes.json().catch(() => null);
                  sessionId = startData?.sessionId || startData?.session?.id;

                  if (sessionId) {
                    await prisma.campanhaAlvo.update({
                      where: {
                        campanha_id_paciente_id: {
                          campanha_id: ultimoAlvo.campanha_id,
                          paciente_id: ultimoAlvo.paciente_id
                        }
                      },
                      data: { typebot_session_id: sessionId }
                    });
                    addWebhookLog('TYPEBOT_AUTO_SUCCESS', `Sessão do Typebot criada com sucesso! ID: ${sessionId}`);
                  } else {
                    addWebhookLog('TYPEBOT_AUTO_ERROR', `Falha ao obter sessionId do Typebot`, startData);
                  }
                } catch (regErr) {
                  addWebhookLog('TYPEBOT_AUTO_EXCEPTION', `Exceção ao criar sessão no Typebot: ${regErr.message}`);
                }
              }

              // SE POSSUIR OU TIVER GERADO A SESSÃO DO TYPEBOT, PROSSEGUE O FLUXO (continueChat)
              if (sessionId) {
                addWebhookLog('TYPEBOT_CONTINUE', `Enviando resposta "${responseText}" para continueChat (Sessão: ${sessionId})`);
                try {
                  const continueRes = await fetch(`${typebotUrl.replace(/\/$/, '')}/api/v1/sessions/${sessionId}/continueChat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      message: {
                        type: 'text',
                        text: responseText
                      }
                    })
                  });

                  const typebotData = await continueRes.json().catch(() => null);

                  if (continueRes.ok && typebotData && Array.isArray(typebotData.messages)) {
                    addWebhookLog('TYPEBOT_RESPONSE', `Typebot retornou ${typebotData.messages.length} mensagem(ns).`, {
                      messagesCount: typebotData.messages.length
                    });

                    if (evoUrl && evoInstance && evoApikey) {
                      const baseUrlClean = evoUrl.replace(/\/$/, '');

                      for (const botMsg of typebotData.messages) {
                        let textContent = '';

                        // Extrair texto da mensagem do Typebot
                        if (typeof botMsg.content === 'string') {
                          textContent = botMsg.content;
                        } else if (botMsg.content?.richText && Array.isArray(botMsg.content.richText)) {
                          textContent = botMsg.content.richText.map(block => {
                            if (block.children && Array.isArray(block.children)) {
                              return block.children.map(c => c.text || '').join('');
                            }
                            return '';
                          }).filter(Boolean).join('\n');
                        }

                        if (textContent && textContent.trim()) {
                          addWebhookLog('EVOLUTION_DISPATCH', `Disparando texto do Typebot para ${cleanIncomingPhone}: "${textContent.trim()}"`);
                          await fetch(`${baseUrlClean}/message/sendText/${evoInstance}`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'apikey': evoApikey
                            },
                            body: JSON.stringify({
                              number: cleanIncomingPhone,
                              options: { delay: 1000, presence: "composing" },
                              text: textContent.trim()
                            })
                          }).catch(err => {
                            addWebhookLog('EVOLUTION_DISPATCH_ERROR', `Erro ao disparar mensagem para WhatsApp: ${err.message}`);
                          });
                        }
                      }
                    }
                  } else {
                    addWebhookLog('TYPEBOT_CONTINUE_WARNING', `Resposta inesperada do continueChat`, typebotData);
                  }
                } catch (tbErr) {
                  addWebhookLog('TYPEBOT_CONTINUE_EXCEPTION', `Erro de rede no continueChat: ${tbErr.message}`);
                }
              }
            } else {
              addWebhookLog('WARNING', `Nenhum alvo de campanha recente encontrado para o paciente ${paciente.nome}`);
            }
          } else {
            addWebhookLog('WARNING', `Nenhum paciente encontrado no banco para o telefone: ${phone} (limpo: ${cleanIncomingPhone})`);
          }
        }
      }
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    addWebhookLog('CRITICAL_ERROR', `Exceção fatal no Webhook Evolution: ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
