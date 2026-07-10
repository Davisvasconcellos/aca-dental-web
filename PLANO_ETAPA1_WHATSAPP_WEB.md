# Plano de Implementacao - Etapa 1 (WhatsApp Web only)

## Objetivo
Automatizar o envio via WhatsApp Web com fluxo robusto, sem instalacao manual do usuario para operacao diaria.

Fluxo alvo:
1. Abrir contato no WhatsApp Web
2. Clicar em "Continuar para WhatsApp Web" (quando existir)
3. Aguardar chat carregar
4. Clicar em enviar
5. Fechar aba
6. Aguardar intervalo
7. Repetir para o proximo contato

---

## Escopo da Etapa 1
- Apenas modo Web
- Automacao por elemento (evitar coordenadas para Web)
- Sessao persistente do navegador
- Checkpoint para retomar execucao sem duplicar envio
- Log por contato

Fora do escopo (nesta etapa):
- Modo App desktop
- Toggle Web/App no config

---

## Tasklist (acompanhamento)

Status:
- [ ] Pendente
- [~] Em andamento
- [x] Concluido

### A. Base tecnica
- [x] T1 - Definir contrato do fluxo Web (entradas, saidas, erros)
- [~] T2 - Criar modulo de automacao Web (abrir URL, detectar estado, clicar botoes)
- [~] T3 - Integrar modulo Web ao loop atual de envio
- [ ] T4 - Detectar estados da pagina (continuar, chat pronto, enviado, erro)

### B. Resiliencia
- [ ] T5 - Retry por contato (1 tentativa extra)
- [ ] T6 - Fechamento de aba e intervalo entre contatos
- [ ] T7 - Persistir checkpoint apos cada contato
- [ ] T8 - Retomar execucao interrompida sem reenviar duplicado

### C. Observabilidade
- [ ] T9  - Log estruturado por contato (inicio, tentativa, sucesso, falha)
- [ ] T10 - Exibir status de execucao no dashboard

### D. Validacao
- [ ] T11 - Teste de lote pequeno (5 contatos)
- [ ] T12 - Teste de lote medio (30+ contatos)
- [ ] T13 - Ajustes de timeout/erro de rede
- [ ] T14 - Documentacao de operacao da Etapa 1

---

## Criterios de Pronto (Definition of Done)
- [ ] Lote executa sem cliques manuais no navegador (apos sessao autenticada)
- [ ] Interrupcao permite retomada sem duplicidade
- [ ] Historico da campanha registra dados corretos
- [ ] Logs permitem auditoria por contato

---

## Checkpoint de Execucao (modelo)
Preencher durante implementacao:

- Data:
- Responsavel:
- Branch/versao:
- Ultima tarefa concluida:
- Proxima tarefa:
- Riscos abertos:
- Decisoes tomadas:

---

## Diario rapido (append-only)
Adicionar entradas curtas no formato:

YYYY-MM-DD HH:MM - [Tarefa] acao realizada - resultado - proximo passo

Exemplo:
2026-07-10 14:30 - [T1] contrato inicial definido - pendente revisar erros - iniciar T2
2026-07-10 16:10 - [T2/T3] fluxo Web-only integrado via endpoint /api/enviar_wpp_web - pendente validar lote real - revisar retries e estados
