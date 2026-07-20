import React, { useState } from 'react';

export default function Orcamentos() {
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCampaignActive] = useState(false);

  // Estados do DataTable
  const [search, setSearch] = useState('');
  const [filterDias, setFilterDias] = useState('');
  const [filterValor, setFilterValor] = useState('');
  const [filterDateIni, setFilterDateIni] = useState('');
  const [filterDateFim, setFilterDateFim] = useState('');
  const [sortField, setSortField] = useState('valor_total');
  const [sortDir, setSortDir] = useState(-1);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const toggleSelect = (id) => {
    setOrcamentos(prev => prev.map(o => o.id === id ? { ...o, selected: !o.selected } : o));
  };

  React.useEffect(() => {
    const token = localStorage.getItem('aca_token');
    fetch(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/orcamentos/abertos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const mapped = data.map(o => {
          const dias = Math.floor((new Date() - new Date(o.data_orcamento)) / (1000 * 60 * 60 * 24));
          return {
            id: o.id,
            id_sDental: o.paciente?.id_sDental || '-',
            nome: o.paciente?.nome || 'Desconhecido',
            celular: o.paciente?.telefone || '-',
            valor: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(o.valor_total),
            valor_raw: o.valor_total || 0,
            dias: dias,
            data: new Date(o.data_orcamento).toLocaleDateString('pt-BR'),
            data_raw: new Date(o.data_orcamento).getTime(),
            descricao: o.descricao,
            tratamentos: o.tratamentos || [],
            selected: false,
            status: o.paciente?.telefone ? '✓' : '-'
          };
        });
        setOrcamentos(mapped);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao buscar orçamentos:", err);
        setLoading(false);
      });
  }, []);

  // Logica do DataTable
  let filteredData = orcamentos.filter(o => {
    if (search && !o.nome.toLowerCase().includes(search.toLowerCase()) && !o.celular.includes(search)) return false;
    
    if (filterDias && o.dias <= Number(filterDias)) return false;

    if (filterValor) {
      const v = o.valor_raw;
      if (filterValor === '0-500' && v >= 500) return false;
      if (filterValor === '500-1000' && (v < 500 || v >= 1000)) return false;
      if (filterValor === '1000-3000' && (v < 1000 || v >= 3000)) return false;
      if (filterValor === '3000-5000' && (v < 3000 || v >= 5000)) return false;
      if (filterValor === '5000+' && v < 5000) return false;
    }

    if (filterDateIni) {
      const dtIni = new Date(filterDateIni + 'T00:00:00').getTime();
      if (o.data_raw < dtIni) return false;
    }
    if (filterDateFim) {
      const dtFim = new Date(filterDateFim + 'T23:59:59').getTime();
      if (o.data_raw > dtFim) return false;
    }

    return true;
  });

  filteredData.sort((a, b) => {
    let va = a[sortField];
    let vb = b[sortField];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return sortDir;
    if (va > vb) return -sortDir;
    return 0;
  });

  const handleSort = (field) => {
    setSortField(field);
    setSortDir(sortField === field ? -sortDir : -1);
    setCurrentPage(1);
  };
  
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const allSelected = currentData.length > 0 && currentData.every(o => o.selected);

  if (loading) {
    return (
      <div className="page-loader">
        <div className="global-spinner"></div>
        <div>Carregando Orçamentos...</div>
      </div>
    );
  }

  const toggleSelectAll = () => {
    const newVal = !allSelected;
    const currentIds = currentData.map(o => o.id);
    setOrcamentos(orcamentos.map(o => currentIds.includes(o.id) ? { ...o, selected: newVal } : o));
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Jornada de Orçamentos</div>
        <div style={{ background: 'rgba(234,179,8,.15)', border: '1px solid rgba(234,179,8,.35)', color: '#fde68a', borderRadius: '999px', padding: '6px 11px', fontSize: '11px', fontWeight: '700' }}>
          ⚠ Em desenvolvimento
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: '16px' }}>
        <div className="kpi purple"><div className="kpi-lbl">Total em Aberto</div><div className="kpi-val">{loading ? '...' : orcamentos.length}</div><div className="kpi-sub">orçamentos aguardando</div></div>
        <div className="kpi blue"><div className="kpi-lbl">Recentes</div><div className="kpi-val">{loading ? '...' : orcamentos.filter(o => o.dias <= 30).length}</div><div className="kpi-sub">até 30 dias</div></div>
        <div className="kpi yellow"><div className="kpi-lbl">Antigos</div><div className="kpi-val">{loading ? '...' : orcamentos.filter(o => o.dias > 30).length}</div><div className="kpi-sub">mais de 30 dias</div></div>
        <div className="kpi green"><div className="kpi-lbl">Enviados Campanha</div><div className="kpi-val">0</div><div className="kpi-sub">nesta sessão</div></div>
      </div>

      <div className="tbl-wrap">
        <div className="tbl-toolbar">
          <input type="text" placeholder="🔍 Buscar orçamento..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
          
          <select value={filterDias} onChange={e => { setFilterDias(e.target.value); setCurrentPage(1); }}>
            <option value="">Dias: todos</option>
            <option value="30">{'> 30 dias'}</option>
            <option value="60">{'> 60 dias'}</option>
            <option value="90">{'> 90 dias'}</option>
            <option value="180">{'> 180 dias'}</option>
          </select>

          <select value={filterValor} onChange={e => { setFilterValor(e.target.value); setCurrentPage(1); }}>
            <option value="">Valor: todos</option>
            <option value="0-500">Até R$ 500</option>
            <option value="500-1000">R$ 500 a 1.000</option>
            <option value="1000-3000">R$ 1.000 a 3.000</option>
            <option value="3000-5000">R$ 3.000 a 5.000</option>
            <option value="5000+">Acima de R$ 5.000</option>
          </select>

          <input type="date" title="Data inicial" style={{ width: '130px' }} value={filterDateIni} onChange={e => { setFilterDateIni(e.target.value); setCurrentPage(1); }} />
          <input type="date" title="Data final" style={{ width: '130px' }} value={filterDateFim} onChange={e => { setFilterDateFim(e.target.value); setCurrentPage(1); }} />

          <button className={`sort-btn ${sortField === 'valor_raw' ? 'active' : ''}`} onClick={() => { setSortField('valor_raw'); setSortDir(sortField === 'valor_raw' ? -sortDir : -1); setCurrentPage(1); }}>{sortField === 'valor_raw' && sortDir === 1 ? '↑' : '↓'} Valor</button>
          <button className={`sort-btn ${sortField === 'nome' ? 'active' : ''}`} onClick={() => { setSortField('nome'); setSortDir(sortField === 'nome' ? -sortDir : 1); setCurrentPage(1); }}>A–Z</button>
          <button className={`sort-btn ${sortField === 'data_raw' ? 'active' : ''}`} onClick={() => { setSortField('data_raw'); setSortDir(sortField === 'data_raw' ? -sortDir : -1); setCurrentPage(1); }}>📅 Data</button>

          <div className="ml-auto" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={() => {}}>✉️ Mensagem</button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} /></th>
              <th style={{ width: '40px' }}>ID</th>
              <th onClick={() => handleSort('nome')} style={{ cursor: 'pointer' }}>Paciente {sortField === 'nome' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th onClick={() => handleSort('valor_raw')} style={{ cursor: 'pointer' }}>Valor {sortField === 'valor_raw' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th onClick={() => handleSort('dias')} style={{ cursor: 'pointer' }}>Dias {sortField === 'dias' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th onClick={() => handleSort('data_raw')} style={{ cursor: 'pointer' }}>Data {sortField === 'data_raw' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th>Celular</th>
              <th>WA</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length === 0 ? (
              <tr><td colSpan="8" style={{textAlign: 'center', padding: '20px'}}>Nenhum orçamento encontrado com os filtros atuais.</td></tr>
            ) : currentData.map((o) => (
              <tr key={o.id} className={o.selected ? 'tr-playing' : ''}>
                <td>
                  <input type="checkbox" checked={o.selected} onChange={() => toggleSelect(o.id)} disabled={!isCampaignActive} />
                </td>
                <td>{o.id_sDental}</td>
                <td style={{ fontWeight: 500 }}>
                  <div className="tt-wrap">
                    {o.nome}
                    {o.tratamentos.length > 0 && (
                      <div className="tt tt-orc">
                        <div className="tt-date">Itens do Orçamento</div>
                        <div style={{ marginBottom: '8px' }}>
                          <strong>{o.data}</strong> · {o.valor}<br />
                          <span style={{ color: 'var(--muted)' }}>{o.descricao || 'Sem título informado'}</span><br />
                          <span style={{ color: '#c7d2fe' }}>
                            Tratamentos: {o.tratamentos.slice(0, 4).map(t => t.nome).join(' • ')}
                            {o.tratamentos.length > 4 ? ` • +${o.tratamentos.length - 4} itens` : ''}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ color: 'var(--green)', fontWeight: 600 }}>{o.valor}</td>
                <td>{o.dias} dias</td>
                <td>{o.data}</td>
                <td>{o.celular}</td>
                <td style={{ textAlign: 'center' }}>{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination">
          <div className="page-info">
            Mostrando {currentData.length} de {filteredData.length} registros
            <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ marginLeft: '10px', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
              <option value={10}>10 por página</option>
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
            </select>
          </div>
          <div className="page-btns">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>← Ant.</button>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Próx. →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
