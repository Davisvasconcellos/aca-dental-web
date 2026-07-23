const TYPEBOT_URL = 'https://typebot-viewer.dmedia.com.br';
const PUBLIC_ID = 'aca-limpeza-npgmb3s';

async function testTypebotSession() {
  try {
    console.log('----------------------------------------------------');
    console.log('Step 1: Registrando sessão no Typebot (isOnlyRegistering)...');
    console.log(`URL: ${TYPEBOT_URL}/api/v1/typebots/${PUBLIC_ID}/startChat`);

    const startPayload = {
      isOnlyRegistering: true,
      prefilledVariables: {
        remoteJid: '5521999999999@s.whatsapp.net',
        pacienteId: 'paciente-teste-uuid-123',
        pacienteNome: 'João da Silva',
        campanhaId: 'campanha-recall-001',
        organizationId: 'f5babeaf-b38d-4daf-842c-80fc732f78db'
      }
    };

    console.log('Payload de registro:', JSON.stringify(startPayload, null, 2));

    const startRes = await fetch(`${TYPEBOT_URL}/api/v1/typebots/${PUBLIC_ID}/startChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(startPayload)
    });

    const startData = await startRes.json();
    console.log('\n[START CHAT RESPONSE HTTP ' + startRes.status + ']:');
    console.log(JSON.stringify(startData, null, 2));

    if (!startData || (!startData.sessionId && !startData.session)) {
      console.error('\n❌ Erro: Não foi retornado um sessionId válido.');
      return;
    }

    const sessionId = startData.sessionId || startData.session?.id;
    console.log(`\n✅ SESSÃO REGISTRADA COM SUCESSO! ID da Sessão: ${sessionId}`);

    console.log('----------------------------------------------------');
    console.log('Step 2: Simulando resposta do paciente no WhatsApp ("Sim")...');
    console.log(`URL: ${TYPEBOT_URL}/api/v1/sessions/${sessionId}/continueChat`);

    const continuePayload = {
      message: {
        type: 'text',
        text: 'Sim'
      }
    };

    const continueRes = await fetch(`${TYPEBOT_URL}/api/v1/sessions/${sessionId}/continueChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(continuePayload)
    });

    const continueData = await continueRes.json();
    console.log('\n[CONTINUE CHAT RESPONSE HTTP ' + continueRes.status + ']:');
    console.log(JSON.stringify(continueData, null, 2));

    if (continueRes.ok && continueData.messages) {
      console.log('\n🎉 SUCESSO ABSOLUTO!');
      console.log(`Typebot retornou ${continueData.messages.length} mensagem(ns) em resposta.`);
      continueData.messages.forEach((msg, idx) => {
        console.log(`--- Mensagem ${idx + 1} (${msg.type}): ---`);
        console.log(msg.content);
      });
    } else {
      console.log('\n⚠️ Resposta do continueChat:', continueData);
    }

  } catch (err) {
    console.error('\n❌ Erro na execução do teste:', err);
  }
}

testTypebotSession();
