const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// A Evolution API envia POSTs para esta rota quando um evento ocorre.
// Geralmente a URL cadastrada lá seria: https://sua-api.com/api/webhooks/evolution
router.post('/evolution', async (req, res) => {
  try {
    const event = req.body;
    
    // Verificamos se é um evento de recebimento de mensagem (MESSAGES_UPSERT)
    if (event && event.event === 'messages.upsert') {
      const messages = event.data?.messages || event.data;
      
      const messagesArray = Array.isArray(messages) ? messages : [messages];
      
      if (messagesArray.length > 0) {
        for (const msg of messagesArray) {
          // Ignoramos mensagens enviadas por nós mesmos
          if (msg.key?.fromMe) continue;
          
          const remoteJid = msg.key?.remoteJid; // Ex: 5511999999999@s.whatsapp.net
          if (!remoteJid) continue;
          
          // Tratando o telefone para ficar só os números
          let phone = remoteJid.split('@')[0];
          
          // O texto da resposta (pode vir de botões, de lista, ou texto normal)
          let responseText = msg.message?.conversation || 
                             msg.message?.extendedTextMessage?.text || 
                             msg.message?.buttonsResponseMessage?.selectedButtonId ||
                             msg.message?.templateButtonReplyMessage?.selectedId ||
                             msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
                             '';

          // Vamos buscar se esse telefone existe na base de pacientes
          const paciente = await prisma.paciente.findFirst({
            where: { telefone: phone }
          });
          
          if (paciente) {
            // Se achou o paciente, verificamos se ele tem alguma CampanhaAlvo que esteja como 'ENVIADO' ou 'EM_ANDAMENTO'
            const ultimoAlvo = await prisma.campanhaAlvo.findFirst({
              where: {
                paciente_id: paciente.id,
                status_envio: { in: ['ENVIADO', 'EM_ANDAMENTO'] }
              },
              orderBy: {
                data_envio: 'desc'
              }
            });
            
            if (ultimoAlvo) {
              // Atualizamos para RESPONDIDO no banco de dados do ACA
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

              // SE POSSUIR SESSÃO DO TYPEBOT REGISTRADA, PROSSEGUE O FLUXO NO TYPEBOT
              if (ultimoAlvo.typebot_session_id) {
                console.log(`[TYPEBOT CONTINUATION] Prosseguindo sessão ${ultimoAlvo.typebot_session_id} para paciente ${paciente.nome} (${phone})`);
                
                // Buscar configuracoes da organizacao do paciente
                const configs = await prisma.configuracao.findMany({
                  where: { organization_id: paciente.organization_id }
                });
                const configMap = {};
                configs.forEach(c => { configMap[c.chave] = c.valor; });

                const typebotUrl = configMap.typebot_url || 'https://typebot-viewer.dmedia.com.br';
                const evoUrl = configMap.evo_url;
                const evoInstance = configMap.evo_instance;
                const evoApikey = configMap.evo_apikey;

                try {
                  const continueRes = await fetch(`${typebotUrl.replace(/\/$/, '')}/api/v1/sessions/${ultimoAlvo.typebot_session_id}/continueChat`, {
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
                    console.log(`[TYPEBOT CONTINUATION] Typebot retornou ${typebotData.messages.length} mensagem(ns).`);

                    if (evoUrl && evoInstance && evoApikey) {
                      const baseUrlClean = evoUrl.replace(/\/$/, '');

                      for (const botMsg of typebotData.messages) {
                        let textContent = '';

                        // Tratar texto da mensagem do Typebot
                        if (typeof botMsg.content === 'string') {
                          textContent = botMsg.content;
                        } else if (botMsg.content?.richText && Array.isArray(botMsg.content.richText)) {
                          // Extrair texto de blocos richText
                          textContent = botMsg.content.richText.map(block => {
                            if (block.children && Array.isArray(block.children)) {
                              return block.children.map(c => c.text || '').join('');
                            }
                            return '';
                          }).filter(Boolean).join('\n');
                        }

                        if (textContent && textContent.trim()) {
                          console.log(`[EVOLUTION DISPATCH] Enviando texto do Typebot para ${phone}: "${textContent.trim()}"`);
                          await fetch(`${baseUrlClean}/message/sendText/${evoInstance}`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'apikey': evoApikey
                            },
                            body: JSON.stringify({
                              number: phone,
                              options: { delay: 1000, presence: "composing" },
                              text: textContent.trim()
                            })
                          }).catch(err => console.error('[EVOLUTION DISPATCH ERROR]', err));
                        }
                      }
                    }
                  } else {
                    console.warn(`[TYPEBOT CONTINUATION WARNING] Falha no continueChat:`, typebotData);
                  }
                } catch (tbErr) {
                  console.error('[TYPEBOT CONTINUATION ERROR]', tbErr);
                }
              }
            }
          }
        }
      }
    }
    
    // A Evolution API exige que retornemos 200 rápido para ela saber que recebemos
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erro no Webhook Evolution:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
