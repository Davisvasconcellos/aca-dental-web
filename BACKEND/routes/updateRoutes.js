const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Função para buscar o token salvo
const getAuthToken = async () => {
  const config = await prisma.configuracao.findUnique({ where: { chave: 'token' } });
  return config?.valor || '';
};

// Função para buscar configurações
const getConfigs = async () => {
  const configs = await prisma.configuracao.findMany();
  const map = {};
  configs.forEach(c => map[c.chave] = c.valor);
  return map;
};

const sendEvent = (res, event, data) => {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

// ----------------------------------------------------
// 1. Atualizar Usuários (Sincronização via API)
// ----------------------------------------------------
router.get('/usuarios', async (req, res) => {
  try {
    const token = await getAuthToken();
    if (!token) return res.status(400).json({ error: 'Token não configurado.' });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    sendEvent(res, 'start', { total: 0, msg: 'Buscando lista de pacientes da API...' });

    let page = 1;
    let hasMore = true;
    let processados = 0;
    let inseridos = 0;

    while (hasMore) {
      try {
        const url = `https://api.simplesdental.com/pacientes?pageSize=100&pageNumber=${page}`;
        const response = await fetch(url, {
          headers: {
            "x-auth-token": token,
            "Accept": "application/json"
          }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const pacientes = data.content || [];

        if (pacientes.length === 0) {
          hasMore = false;
          break;
        }

        const pacientesToCreate = pacientes.map(p => ({
          id_sDental: String(p.id),
          nome: p.nome || 'Desconhecido',
          telefone: p.celular || p.telefone || null
        }));

        const result = await prisma.paciente.createMany({
          data: pacientesToCreate,
          skipDuplicates: true
        });

        inseridos += result.count;
        processados += pacientes.length;

        sendEvent(res, 'progress', { 
          atual: processados, 
          total: processados, // Como não sabemos o total exato antecipadamente, mostramos o progresso contínuo
          paciente: `Página ${page} processada`, 
          msg: 'ok' 
        });

        page++;
        await new Promise(r => setTimeout(r, 200)); // Rate limit
      } catch (err) {
        sendEvent(res, 'progress', { atual: processados, total: processados, paciente: 'Erro na página ' + page, msg: 'erro', error: err.message });
        hasMore = false;
      }
    }

    sendEvent(res, 'end', { ok: true, processados, erros: 0, msg: `Sincronização concluída. ${inseridos} pacientes novos inseridos no banco local.` });
    res.end();
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// 2. Atualizar Evoluções
// ----------------------------------------------------
router.get('/evolucoes', async (req, res) => {
  try {
    const configs = await getConfigs();
    const token = configs.token || '';
    if (!token) return res.status(400).json({ error: 'Token não configurado.' });
    
    const rawTags = configs.radar_limpeza_tags || 'limpeza, profilaxia';
    const KEYWORDS = rawTags.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
    const dias_radar = parseInt(configs.radar_limpeza_dias || '180');

    const pacientes = await prisma.paciente.findMany({
      where: { id_sDental: { not: '' } }
    });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    sendEvent(res, 'start', { total: pacientes.length, msg: 'Iniciando coleta de evoluções...' });

    let processados = 0;
    let erros = 0;

    for (const pac of pacientes) {
      try {
        const url = `https://api.simplesdental.com/pacientes/${pac.id_sDental}/evolucoes?pageSize=50&pageNumber=1&verHtml=true`;
        const response = await fetch(url, {
          headers: {
            "x-auth-token": token,
            "Accept": "application/json"
          }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const evolucoes = data.content || [];
        
        let ultima_limpeza_data = null;
        let ultima_evolucao_data = null;
        let ultimo_proc = '';

        for (const ev of evolucoes) {
          const ev_data = ev.data || '';
          const desc_txt = (ev.descricao || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').toLowerCase();

          if (!ultima_evolucao_data) {
            ultima_evolucao_data = new Date(ev_data);
            ultimo_proc = desc_txt.substring(0, 120);
          }

          if (!ultima_limpeza_data && KEYWORDS.some(k => desc_txt.includes(k))) {
            ultima_limpeza_data = new Date(ev_data);
          }
        }

        const hoje = new Date();
        const diffLimpeza = ultima_limpeza_data ? (hoje - ultima_limpeza_data) / (1000 * 60 * 60 * 24) : 9999;
        const diffEvolucao = ultima_evolucao_data ? (hoje - ultima_evolucao_data) / (1000 * 60 * 60 * 24) : 9999;
        
        // Puxar os orçamentos para calcular o score corretamente
        const orcamentosAbertos = await prisma.orcamento.findMany({
          where: { paciente_id: pac.id, status: 'EM_ABERTO' }
        });
        
        let score = 0;
        if (orcamentosAbertos.length > 0) score += 3;
        
        const maiorOrc = orcamentosAbertos.reduce((max, o) => Math.max(max, o.valor_total), 0);
        if (maiorOrc >= 1000) score += 1;
        if (maiorOrc >= 5000) score += 1;

        if (diffLimpeza > dias_radar) score += 2;
        if (diffEvolucao > 60) score += 1;

        await prisma.paciente.update({
          where: { id: pac.id },
          data: {
            ultima_limpeza_data,
            ultima_evolucao_data,
            ultimo_proc,
            total_evolucoes: evolucoes.length,
            score
          }
        });

        processados++;
        sendEvent(res, 'progress', { atual: processados + erros, total: pacientes.length, paciente: pac.nome, msg: 'ok' });
      } catch (err) {
        erros++;
        sendEvent(res, 'progress', { atual: processados + erros, total: pacientes.length, paciente: pac.nome, msg: 'erro', error: err.message });
      }

      await new Promise(r => setTimeout(r, 200)); 
    }

    sendEvent(res, 'end', { ok: true, processados, erros, msg: 'Coleta de evoluções concluída' });
    res.end();
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// 3. Atualizar Orçamentos e Tratamentos
// ----------------------------------------------------
router.get('/orcamentos', async (req, res) => {
  try {
    const token = await getAuthToken();
    if (!token) return res.status(400).json({ error: 'Token não configurado.' });

    const pacientes = await prisma.paciente.findMany({
      where: { id_sDental: { not: '' } }
    });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    sendEvent(res, 'start', { total: pacientes.length, msg: 'Buscando orçamentos na base de todos os pacientes...' });

    let processados = 0;
    let erros = 0;
    let orcamentosAtualizados = 0;

    // Limpa orçamentos antigos para manter apenas os em aberto atuais
    await prisma.tratamento.deleteMany();
    await prisma.orcamento.deleteMany();

    for (const pac of pacientes) {
      try {
        const url_orc = `https://api.simplesdental.com/pacientes/${pac.id_sDental}/orcamentos?pageNumber=1&pageSize=30`;
        const resOrc = await fetch(url_orc, { headers: { "x-auth-token": token, "Accept": "application/json" } });
        if (!resOrc.ok) throw new Error(`HTTP ${resOrc.status}`);
        const dataOrc = await resOrc.json();
        
        const orcamentosEmAberto = (dataOrc.content || []).filter(o => o.status === 'EM_ABERTO');

        for (const o of orcamentosEmAberto) {
          const realOrcId = String(o.id);
          
          const url_proc = `https://api.simplesdental.com/orcamentos/${realOrcId}/procedimentos?idPaciente=${pac.id_sDental}&pageNumber=1`;
          const resProc = await fetch(url_proc, { headers: { "x-auth-token": token, "Accept": "application/json" } });
          if (resProc.ok) {
             const dataProc = await resProc.json();
             
             const newOrc = await prisma.orcamento.create({
               data: {
                 id: realOrcId,
                 paciente_id: pac.id,
                 descricao: o.descricao || '',
                 status: o.status || 'EM_ABERTO',
                 data_orcamento: o.data ? new Date(o.data) : new Date(),
                 valor_total: parseFloat(o.valorTotal || 0)
               }
             });

             const trats = (dataProc.content || []).map(t => {
               const p = t.procedimento || {};
               return {
                 orcamento_id: newOrc.id,
                 nome: String(p.nome || p.nomeTuss || '').trim().substring(0, 200),
                 valor: parseFloat(t.valor || 0)
               };
             }).filter(t => t.nome !== '');

             if (trats.length > 0) {
               await prisma.tratamento.createMany({ data: trats });
             }
             orcamentosAtualizados++;
          }
        }

        processados++;
        sendEvent(res, 'progress', { atual: processados + erros, total: pacientes.length, paciente: pac.nome, msg: 'ok' });
        
        // Recalcular score após atualizar orçamento
        const configs = await getConfigs();
        const dias_radar = parseInt(configs.radar_limpeza_dias || '180');
        const dbPac = await prisma.paciente.findUnique({ where: { id: pac.id }, include: { orcamentos: { where: { status: 'EM_ABERTO' } } } });
        if (dbPac) {
          const hoje = new Date();
          const diffLimpeza = dbPac.ultima_limpeza_data ? (hoje - dbPac.ultima_limpeza_data) / (1000 * 60 * 60 * 24) : 9999;
          const diffEvolucao = dbPac.ultima_evolucao_data ? (hoje - dbPac.ultima_evolucao_data) / (1000 * 60 * 60 * 24) : 9999;
          let score = 0;
          if (dbPac.orcamentos.length > 0) score += 3;
          const maiorOrc = dbPac.orcamentos.reduce((max, o) => Math.max(max, o.valor_total), 0);
          if (maiorOrc >= 1000) score += 1;
          if (maiorOrc >= 5000) score += 1;
          if (diffLimpeza > dias_radar) score += 2;
          if (diffEvolucao > 60) score += 1;
          await prisma.paciente.update({ where: { id: pac.id }, data: { score } });
        }
        
      } catch (err) {
        erros++;
        sendEvent(res, 'progress', { atual: processados + erros, total: pacientes.length, paciente: pac.nome, msg: 'erro', error: err.message });
      }

      await new Promise(r => setTimeout(r, 200));
    }

    sendEvent(res, 'end', { ok: true, processados, erros, msg: `Sincronização de orçamentos concluída. ${orcamentosAtualizados} orçamentos encontrados.` });
    res.end();
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
});

module.exports = router;
