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
            // Se achou o paciente, verificamos se ele tem alguma CampanhaAlvo que esteja como 'ENVIADO'
            // Pegamos a mais recente
            const ultimoAlvo = await prisma.campanhaAlvo.findFirst({
              where: {
                paciente_id: paciente.id,
                status_envio: 'ENVIADO'
              },
              orderBy: {
                data_envio: 'desc'
              }
            });
            
            if (ultimoAlvo) {
              // Atualizamos para RESPONDIDO
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
