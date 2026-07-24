import React, { useState, useEffect } from 'react';
import { 
  FileText, MessageSquare, Image, Bot, List, Plus, Trash2, Edit3, 
  Save, Copy, ExternalLink, Phone, DollarSign, Check, Smartphone, ArrowLeft
} from 'lucide-react';

const fetchAuth = (url, options = {}) => {
  const token = localStorage.getItem('aca_token');
  options.headers = { ...options.headers, Authorization: `Bearer ${token}` };
  return fetch(url, options);
};

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('BOTOES'); // TEXTO, BOTOES, MIDIA, LISTA, TYPEBOT
  const [texto, setTexto] = useState('Olá <%first_name%>, sentimos sua falta! Chegou a hora de realizar sua limpeza preventiva. Podemos agendar?');
  const [headerTexto, setHeaderTexto] = useState('Mensagem da Clínica ACA Dental');
  const [footerTexto, setFooterTexto] = useState('Selecione uma das opções abaixo:');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaTipo, setMediaTipo] = useState('image'); // image, video, document
  const [fileName, setFileName] = useState('');
  const [typebotPublicId, setTypebotPublicId] = useState('aca-limpeza-npgmb3s');

  // Botões
  const [botoes, setBotoes] = useState([
    { type: 'reply', displayText: 'Sim, confirmo!', id: 'SIM', customValue: false },
    { type: 'reply', displayText: 'Preciso remarcar', id: 'REMARCAR', customValue: false }
  ]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetchAuth(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/templates`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTemplates(data);
      }
    } catch (err) {
      console.error("Erro ao carregar templates:", err);
    }
    setLoading(false);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setTitulo('Novo Modelo de Mensagem');
    setTipo('BOTOES');
    setTexto('Olá <%first_name%>, tudo bem? Estamos com condições especiais este mês. Como podemos ajudar?');
    setHeaderTexto('Clínica Odontológica ACA');
    setFooterTexto('Responda clicando em uma das opções abaixo:');
    setMediaUrl('');
    setMediaTipo('image');
    setFileName('');
    setTypebotPublicId('');
    setBotoes([
      { type: 'reply', displayText: 'Quero agendar', id: 'SIM', customValue: false },
      { type: 'reply', displayText: 'Dúvidas', id: 'DUVIDAS', customValue: false }
    ]);
    setIsEditing(true);
  };

  const handleEdit = (tmpl) => {
    setEditingId(tmpl.id);
    setTitulo(tmpl.titulo || '');
    setTipo(tmpl.tipo || 'TEXTO');
    setTexto(tmpl.texto || '');
    setHeaderTexto(tmpl.header_texto || '');
    setFooterTexto(tmpl.footer_texto || '');
    setMediaUrl(tmpl.media_url || '');
    setMediaTipo(tmpl.media_tipo || 'image');
    setFileName(tmpl.file_name || '');
    setTypebotPublicId(tmpl.typebot_public_id || '');

    try {
      const parsed = tmpl.botoes ? JSON.parse(tmpl.botoes) : [];
      setBotoes(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
      setBotoes([]);
    }

    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Deseja realmente excluir este template?")) return;
    try {
      await fetchAuth(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/templates/${id}`, {
        method: 'DELETE'
      });
      fetchTemplates();
      if (editingId === id) setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!titulo.trim() || !texto.trim()) {
      alert("Título e texto da mensagem são obrigatórios.");
      return;
    }

    const payload = {
      titulo,
      tipo,
      texto,
      header_texto: headerTexto,
      footer_texto: footerTexto,
      botoes,
      media_url: mediaUrl,
      media_tipo: mediaTipo,
      file_name: fileName,
      typebot_public_id: typebotPublicId
    };

    try {
      const url = `${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/templates${editingId ? `/${editingId}` : ''}`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetchAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsEditing(false);
        fetchTemplates();
      } else {
        alert("Erro ao salvar template.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao salvar template.");
    }
  };

  // Botões Handlers
  const handleAddButton = () => {
    if (botoes.length >= 3 && tipo === 'BOTOES') {
      alert("A Evolution API limita mensagens de botões em até 3 botões por mensagem.");
      return;
    }
    setBotoes(prev => [...prev, { type: 'reply', displayText: `Opção ${prev.length + 1}`, id: `OPCAO_${prev.length + 1}`, customValue: false }]);
  };

  const handleUpdateButton = (index, field, value) => {
    setBotoes(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };

      // Se não tiver ID customizado, atualiza o ID igual ao displayText
      if (field === 'displayText' && !next[index].customValue) {
        next[index].id = value.toUpperCase().replace(/\s+/g, '_');
      }

      return next;
    });
  };

  const handleRemoveButton = (index) => {
    setBotoes(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={24} style={{ color: 'var(--accent)' }} />
            Modelos de Mensagens (Templates)
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Crie e personalize modelos ricos com botões, imagens e fluxos do Typebot para usar em suas campanhas.
          </div>
        </div>

        {!isEditing && (
          <button className="btn btn-primary" onClick={handleOpenNew} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} />
            Novo Template
          </button>
        )}
      </div>

      {/* Visão de Edição ou Lista */}
      {isEditing ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', alignItems: 'start' }}>
          
          {/* Formulário do Editor (Esquerda) */}
          <div className="cfg-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', margin: 0, fontWeight: '700' }}>
                {editingId ? '✍️ Editar Modelo' : '✨ Criar Novo Modelo'}
              </h3>
              <button className="btn btn-ghost" onClick={() => setIsEditing(false)} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={16} /> Voltar para lista
              </button>
            </div>

            {/* Título do Template */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)', marginBottom: '6px' }}>
                NOME DO TEMPLATE (Identificador Interno)
              </label>
              <input 
                type="text" 
                className="cfg-input" 
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ex: Lembrete de Limpeza 6 Meses"
                style={{ width: '100%' }}
              />
            </div>

            {/* Seletor de Tipo */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)', marginBottom: '8px' }}>
                TIPO DE MENSAGEM
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <button 
                  type="button"
                  className={`btn ${tipo === 'BOTOES' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setTipo('BOTOES')}
                  style={{ fontSize: '12px', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
                >
                  <MessageSquare size={18} />
                  Botões Interativos
                </button>

                <button 
                  type="button"
                  className={`btn ${tipo === 'TEXTO' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setTipo('TEXTO')}
                  style={{ fontSize: '12px', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
                >
                  <FileText size={18} />
                  Texto Simples
                </button>

                <button 
                  type="button"
                  className={`btn ${tipo === 'MIDIA' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setTipo('MIDIA')}
                  style={{ fontSize: '12px', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
                >
                  <Image size={18} />
                  Imagem / PDF
                </button>

                <button 
                  type="button"
                  className={`btn ${tipo === 'TYPEBOT' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setTipo('TYPEBOT')}
                  style={{ fontSize: '12px', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
                >
                  <Bot size={18} />
                  Fluxo Typebot
                </button>
              </div>
            </div>

            {/* Header (Título da Mensagem) */}
            {tipo === 'BOTOES' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)', marginBottom: '6px' }}>
                  CABEÇALHO (Título da Mensagem - Opcional)
                </label>
                <input 
                  type="text" 
                  className="cfg-input" 
                  value={headerTexto}
                  onChange={e => setHeaderTexto(e.target.value)}
                  placeholder="Ex: Mensagem da Clínica ACA"
                  style={{ width: '100%' }}
                />
              </div>
            )}

            {/* Campo de Mídia (se tipo for MIDIA) */}
            {tipo === 'MIDIA' && (
              <div style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)', marginBottom: '6px' }}>
                  URL DA MÍDIA (Imagem ou Documento PDF)
                </label>
                <input 
                  type="text" 
                  className="cfg-input" 
                  value={mediaUrl}
                  onChange={e => setMediaUrl(e.target.value)}
                  placeholder="https://suaclinica.com.br/imagem.jpg"
                  style={{ width: '100%', marginBottom: '10px' }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select className="cfg-input" value={mediaTipo} onChange={e => setMediaTipo(e.target.value)}>
                    <option value="image">Imagem (.png, .jpg)</option>
                    <option value="document">Documento PDF (.pdf)</option>
                    <option value="video">Vídeo (.mp4)</option>
                  </select>
                  {mediaTipo === 'document' && (
                    <input 
                      type="text" 
                      className="cfg-input" 
                      placeholder="Nome do Arquivo (Ex: tabela.pdf)"
                      value={fileName}
                      onChange={e => setFileName(e.target.value)}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Public ID do Typebot (se tipo for TYPEBOT) */}
            {tipo === 'TYPEBOT' && (
              <div style={{ marginBottom: '16px', background: 'rgba(56,189,248,0.05)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.2)' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '6px' }}>
                  PUBLIC ID / SLUG DO TYPEBOT
                </label>
                <input 
                  type="text" 
                  className="cfg-input" 
                  value={typebotPublicId}
                  onChange={e => setTypebotPublicId(e.target.value)}
                  placeholder="aca-limpeza-npgmb3s"
                  style={{ width: '100%', fontFamily: 'monospace' }}
                />
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                  O ACA Dental criará a sessão no Typebot preenchendo o nome e telefone do paciente antes de responder.
                </div>
              </div>
            )}

            {/* Texto Principal (Corpo da Mensagem) */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)' }}>
                  CORPO DA MENSAGEM
                </label>
                <span style={{ fontSize: '11px', color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setTexto(prev => prev + ' <%first_name%>')}>
                  + Inserir Nome do Paciente
                </span>
              </div>
              <textarea 
                className="cfg-input" 
                rows={5}
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder="Escreva sua mensagem aqui... Use <%first_name%> para personalizar."
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            {/* Footer (Rodapé) */}
            {tipo === 'BOTOES' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)', marginBottom: '6px' }}>
                  RODAPÉ DA MENSAGEM (Opcional)
                </label>
                <input 
                  type="text" 
                  className="cfg-input" 
                  value={footerTexto}
                  onChange={e => setFooterTexto(e.target.value)}
                  placeholder="Ex: Escolha uma das opções abaixo:"
                  style={{ width: '100%' }}
                />
              </div>
            )}

            {/* Construtor de Botões */}
            {tipo === 'BOTOES' && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageSquare size={16} /> Botões Interativos ({botoes.length}/3)
                  </label>
                  {botoes.length < 3 && (
                    <button type="button" className="btn btn-secondary" onClick={handleAddButton} style={{ fontSize: '12px', padding: '4px 10px' }}>
                      + Adicionar Botão
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {botoes.map((btn, idx) => (
                    <div key={idx} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                        
                        {/* Seletor de Tipo de Botão */}
                        <select 
                          className="cfg-input" 
                          value={btn.type}
                          onChange={e => handleUpdateButton(idx, 'type', e.target.value)}
                          style={{ width: '140px', fontSize: '12px' }}
                        >
                          <option value="reply">💬 Resposta Rápida</option>
                          <option value="copy">📋 Copia e Cola</option>
                          <option value="url">🔗 Link / Site</option>
                          <option value="call">📞 Ligação</option>
                          <option value="pix">💲 Pagamento PIX</option>
                        </select>

                        {/* Label (Texto do Botão) */}
                        <input 
                          type="text" 
                          className="cfg-input" 
                          placeholder="Texto visível (Ex: Sim, confirmo)"
                          value={btn.displayText}
                          onChange={e => handleUpdateButton(idx, 'displayText', e.target.value)}
                          style={{ flex: 1, fontSize: '12px' }}
                        />

                        <button type="button" className="btn btn-ghost" onClick={() => handleRemoveButton(idx)} style={{ color: '#ef4444', padding: '6px' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Campos Dinâmicos por Tipo de Botão */}
                      {btn.type === 'reply' && (
                        <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--muted)' }}>
                            <input 
                              type="checkbox" 
                              checked={btn.customValue}
                              onChange={e => handleUpdateButton(idx, 'customValue', e.target.checked)}
                            />
                            Personalizar ID / Valor retornado ao Typebot
                          </label>

                          {btn.customValue && (
                            <input 
                              type="text" 
                              className="cfg-input" 
                              placeholder="ID ex: SIM"
                              value={btn.id}
                              onChange={e => handleUpdateButton(idx, 'id', e.target.value)}
                              style={{ width: '120px', padding: '2px 6px', fontSize: '11px', fontFamily: 'monospace' }}
                            />
                          )}
                        </div>
                      )}

                      {btn.type === 'copy' && (
                        <input 
                          type="text" 
                          className="cfg-input" 
                          placeholder="Código a ser copiado pelo cliente (Ex: Chave PIX ou Cupom)"
                          value={btn.copyCode || ''}
                          onChange={e => handleUpdateButton(idx, 'copyCode', e.target.value)}
                          style={{ width: '100%', fontSize: '11px', marginTop: '4px', fontFamily: 'monospace' }}
                        />
                      )}

                      {btn.type === 'url' && (
                        <input 
                          type="text" 
                          className="cfg-input" 
                          placeholder="URL do site (Ex: https://aca.dmedia.com.br)"
                          value={btn.url || ''}
                          onChange={e => handleUpdateButton(idx, 'url', e.target.value)}
                          style={{ width: '100%', fontSize: '11px', marginTop: '4px' }}
                        />
                      )}

                      {btn.type === 'call' && (
                        <input 
                          type="text" 
                          className="cfg-input" 
                          placeholder="Número para discagem (Ex: 5521965445992)"
                          value={btn.phoneNumber || ''}
                          onChange={e => handleUpdateButton(idx, 'phoneNumber', e.target.value)}
                          style={{ width: '100%', fontSize: '11px', marginTop: '4px' }}
                        />
                      )}

                      {btn.type === 'pix' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginTop: '4px' }}>
                          <select className="cfg-input" value={btn.keyType || 'cpf'} onChange={e => handleUpdateButton(idx, 'keyType', e.target.value)} style={{ fontSize: '11px' }}>
                            <option value="cpf">CPF</option>
                            <option value="cnpj">CNPJ</option>
                            <option value="phone">Telefone</option>
                            <option value="email">E-mail</option>
                            <option value="random">Chave Aleatória</option>
                          </select>
                          <input 
                            type="text" 
                            className="cfg-input" 
                            placeholder="Valor da Chave PIX"
                            value={btn.key || ''}
                            onChange={e => handleUpdateButton(idx, 'key', e.target.value)}
                            style={{ fontSize: '11px', fontFamily: 'monospace' }}
                          />
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ações do Formulário */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Save size={16} /> Salvar Template
              </button>
            </div>

          </div>

          {/* Simulador de Celular (Direita) */}
          <div style={{ position: 'sticky', top: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Smartphone size={16} /> PREVIEW NO WHATSAPP (AO VIVO)
            </div>

            {/* Moldura do Smartphone */}
            <div style={{ background: '#0b141a', border: '8px solid #1e293b', borderRadius: '32px', padding: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', fontFamily: 'sans-serif' }}>
              
              {/* Top Bar do Celular */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid #1f2c34', color: '#e9edef' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#00a884', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                  🦷
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Clínica ACA Dental</div>
                  <div style={{ fontSize: '10px', color: '#8696a0' }}>Online • Mensagem Automática</div>
                </div>
              </div>

              {/* Área de Conversa */}
              <div style={{ padding: '16px 0', minHeight: '260px' }}>
                
                {/* Balão de Mensagem do WhatsApp */}
                <div style={{ background: '#005c4b', borderRadius: '8px 8px 8px 0', padding: '10px 12px', maxWidth: '90%', color: '#e9edef', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', fontSize: '13px', position: 'relative' }}>
                  
                  {/* Cabeçalho */}
                  {headerTexto && tipo === 'BOTOES' && (
                    <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '6px', color: '#70e000' }}>
                      {headerTexto}
                    </div>
                  )}

                  {/* Mídia em Imagem/PDF */}
                  {tipo === 'MIDIA' && mediaUrl && (
                    <div style={{ marginBottom: '8px', borderRadius: '6px', overflow: 'hidden', background: '#091014', border: '1px solid rgba(255,255,255,0.1)', padding: '6px', textAlign: 'center' }}>
                      {mediaTipo === 'image' && <img src={mediaUrl} alt="Preview" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '4px' }} onError={(e) => { e.target.style.display = 'none'; }} />}
                      {mediaTipo === 'document' && <div style={{ fontSize: '11px', color: '#38bdf8' }}>📄 {fileName || 'Documento.pdf'}</div>}
                    </div>
                  )}

                  {/* Texto Formatado */}
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                    {texto.replace(/<%first_name%>/g, 'João')}
                  </div>

                  {/* Rodapé */}
                  {footerTexto && tipo === 'BOTOES' && (
                    <div style={{ fontSize: '11px', color: '#8696a0', marginTop: '8px', fontStyle: 'italic' }}>
                      {footerTexto}
                    </div>
                  )}

                  {/* Hora */}
                  <div style={{ fontSize: '9px', color: '#8696a0', textAlign: 'right', marginTop: '4px' }}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                  </div>
                </div>

                {/* Render de Botões Interativos no WhatsApp */}
                {tipo === 'BOTOES' && botoes.length > 0 && (
                  <div style={{ marginTop: '6px', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {botoes.map((b, i) => (
                      <div key={i} style={{ background: '#1f2c34', color: '#00a884', textAlign: 'center', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #2a3942', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {b.type === 'copy' && <Copy size={12} />}
                        {b.type === 'url' && <ExternalLink size={12} />}
                        {b.type === 'call' && <Phone size={12} />}
                        {b.type === 'pix' && <DollarSign size={12} />}
                        {b.type === 'reply' && <Check size={12} />}
                        {b.displayText || `Botão ${i + 1}`}
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>
      ) : (
        /* Lista de Templates */
        <div>
          {loading ? (
            <div className="page-loader">
              <div className="global-spinner"></div>
              <div>Carregando modelos de mensagens...</div>
            </div>
          ) : templates.length === 0 ? (
            <div className="cfg-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
              <FileText size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <h3>Nenhum modelo cadastrado</h3>
              <p style={{ fontSize: '13px' }}>Crie seu primeiro modelo de mensagem para utilizar em suas campanhas de recall.</p>
              <button className="btn btn-primary" onClick={handleOpenNew} style={{ marginTop: '12px' }}>
                + Criar Primeiro Template
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {templates.map(tmpl => {
                let badgeBg = 'rgba(255,255,255,0.05)';
                let badgeColor = 'var(--muted)';
                if (tmpl.tipo === 'BOTOES') { badgeBg = 'rgba(79,142,247,0.1)'; badgeColor = 'var(--accent)'; }
                if (tmpl.tipo === 'MIDIA') { badgeBg = 'rgba(34,197,94,0.1)'; badgeColor = 'var(--green)'; }
                if (tmpl.tipo === 'TYPEBOT') { badgeBg = 'rgba(147,51,234,0.1)'; badgeColor = '#c084fc'; }

                return (
                  <div key={tmpl.id} className="cfg-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ background: badgeBg, color: badgeColor, fontSize: '10px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px' }}>
                          {tmpl.tipo}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="btn btn-ghost" onClick={() => handleEdit(tmpl)} style={{ padding: '4px', color: 'var(--accent)' }} title="Editar">
                            <Edit3 size={16} />
                          </button>
                          <button className="btn btn-ghost" onClick={() => handleDelete(tmpl.id)} style={{ padding: '4px', color: '#ef4444' }} title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <h4 style={{ fontSize: '15px', margin: '0 0 8px 0', fontWeight: '700' }}>{tmpl.titulo}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {tmpl.texto}
                      </p>
                    </div>

                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--muted)' }}>
                      <span>{tmpl.botoes ? `${JSON.parse(tmpl.botoes || '[]').length} botão(ões)` : 'Sem botões'}</span>
                      <button className="btn btn-ghost" onClick={() => handleEdit(tmpl)} style={{ fontSize: '11px', color: 'var(--text)' }}>
                        Visualizar & Editar →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
