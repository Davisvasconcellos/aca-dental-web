import React, { useState, useEffect } from 'react';

export default function VisaoGeral() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtros locais dos KPIs
  const [limpezaDias, setLimpezaDias] = useState(90);
  const [consultaDias, setConsultaDias] = useState(60);

  useEffect(() => {
    const token = localStorage.getItem('aca_token');
    fetch('http://localhost:3000/api/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Falha na autenticação ou erro no servidor');
        return res.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao carregar dashboard:", err);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return (
      <div className="page-loader">
        <div className="global-spinner"></div>
        <div>Carregando Visão Geral...</div>
      </div>
    );
  }

  const { pacientes, orcamentos, configs } = data;

  // KPI 1: Pacientes
  const totalPacientes = pacientes.length;

  // KPI 2: Orçamentos Abertos
  const orcamentosAbertos = orcamentos.filter(o => o.status === 'EM_ABERTO');
  const valorTotalAbertos = orcamentosAbertos.reduce((acc, curr) => acc + curr.valor_total, 0);

  // KPI 3: Limpeza
  const getDiffDias = (dataStr) => {
    if (!dataStr) return 9999;
    return Math.floor((new Date() - new Date(dataStr)) / (1000 * 60 * 60 * 24));
  };
  
  const pacientesLimpeza = pacientes.filter(p => getDiffDias(p.ultima_limpeza_data) > limpezaDias);
  const valorPotencialLimpeza = pacientesLimpeza.length * configs.valorKpiLimpeza;

  // KPI 4: Sem Consulta
  const pacientesConsulta = pacientes.filter(p => getDiffDias(p.ultima_evolucao_data) > consultaDias);
  const valorPotencialConsulta = pacientesConsulta.length * configs.valorKpiConsulta;

  // Formatter
  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  // Faixas (Bar Chart)
  const faixas = [
    { label: '< R$ 500', min: 0, max: 500, count: 0, color: 'var(--green)' },
    { label: 'R$ 500-1k', min: 500, max: 1000, count: 0, color: 'var(--accent)' },
    { label: 'R$ 1k-3k', min: 1000, max: 3000, count: 0, color: 'var(--accent2)' },
    { label: 'R$ 3k-5k', min: 3000, max: 5000, count: 0, color: 'var(--orange)' },
    { label: '> R$ 5k', min: 5000, max: Infinity, count: 0, color: 'var(--red)' }
  ];
  orcamentosAbertos.forEach(o => {
    const f = faixas.find(fx => o.valor_total >= fx.min && o.valor_total < fx.max) || faixas[faixas.length - 1];
    f.count++;
  });
  const maxBarCount = Math.max(...faixas.map(f => f.count)) || 1;

  // Status (Donut Chart)
  const statusCounts = {};
  const statusColors = { 'EM_ABERTO': '#eab308', 'APROVADO': '#22c55e', 'REPROVADO': '#ef4444' };
  const totalOrcs = orcamentos.length || 1;
  orcamentos.forEach(o => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });

  let conicGradient = [];
  let currentAngle = 0;
  Object.entries(statusCounts).forEach(([status, count]) => {
    let pct = (count / totalOrcs) * 100;
    let color = statusColors[status] || '#64748b';
    conicGradient.push(`${color} ${currentAngle}% ${currentAngle + pct}%`);
    currentAngle += pct;
  });
  const conicString = `conic-gradient(${conicGradient.join(', ')})`;

  // Monthly Line Chart (Mini bar chart for simplicity and reactivity)
  const monthlyCounts = {};
  orcamentosAbertos.forEach(o => {
    const d = new Date(o.data_orcamento);
    const mKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    monthlyCounts[mKey] = (monthlyCounts[mKey] || 0) + 1;
  });
  const months = Object.keys(monthlyCounts).sort().slice(-12); // Last 12 months
  const maxMonthCount = Math.max(...months.map(m => monthlyCounts[m]), 1);

  // Top 10 Maiores
  const top10 = [...orcamentosAbertos].sort((a,b) => b.valor_total - a.valor_total).slice(0, 10);

  return (
    <div id="tab-visao">
      <div className="kpi-grid">
        <div className="kpi purple">
          <div className="kpi-lbl">Total de Pacientes</div>
          <div className="kpi-val">{totalPacientes}</div>
          <div className="kpi-sub">base total cadastrada</div>
        </div>
        <div className="kpi orange">
          <div className="kpi-lbl">Orçamentos Abertos</div>
          <div className="kpi-val">{orcamentosAbertos.length}</div>
          <div className="kpi-sub">{formatMoney(valorTotalAbertos)} total em aberto</div>
        </div>
        <div className="kpi red">
          <div className="kpi-head">
            <div className="kpi-lbl">Limpeza</div>
            <select className="kpi-dd" value={limpezaDias} onChange={e => setLimpezaDias(Number(e.target.value))}>
              <option value="30">30d</option>
              <option value="60">60d</option>
              <option value="90">90d</option>
              <option value="180">180d</option>
            </select>
          </div>
          <div className="kpi-val">{pacientesLimpeza.length}</div>
          <div className="kpi-sub">Potencial: {formatMoney(valorPotencialLimpeza)}</div>
        </div>
        <div className="kpi yellow">
          <div className="kpi-head">
            <div className="kpi-lbl">Sem Consulta</div>
            <select className="kpi-dd" value={consultaDias} onChange={e => setConsultaDias(Number(e.target.value))}>
              <option value="30">30d</option>
              <option value="60">60d</option>
              <option value="90">90d</option>
              <option value="180">180d</option>
            </select>
          </div>
          <div className="kpi-val">{pacientesConsulta.length}</div>
          <div className="kpi-sub">Potencial: {formatMoney(valorPotencialConsulta)}</div>
        </div>
      </div>
      
      <div className="two-col">
        <div className="panel">
          <div className="panel-title">📊 Orçamentos por Faixa de Valor</div>
          <div className="bar-chart" id="chart-faixas">
            {faixas.map((f, i) => (
              <div key={i} className="bar-wrap">
                <div className="bar-cnt">{f.count}</div>
                <div className="bar" style={{ height: `${(f.count / maxBarCount) * 100}%`, background: f.color }}></div>
                <div className="bar-lbl">{f.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-title">🍩 Status dos Orçamentos</div>
          <div className="donut-wrap">
            <div style={{ width: '85px', height: '85px', borderRadius: '50%', background: conicString, flexShrink: 0, position: 'relative' }}>
              {/* Buraco do Donut */}
              <div style={{ position: 'absolute', top: '20%', left: '20%', width: '60%', height: '60%', background: 'var(--surface)', borderRadius: '50%' }}></div>
            </div>
            <div className="donut-legend">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="donut-item">
                  <div className="donut-dot" style={{ background: statusColors[status] || '#64748b' }}></div>
                  <span style={{ color: 'var(--muted)' }}>{status}</span>
                  <span style={{ fontWeight: 600 }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="one-col">
        <div className="panel">
          <div className="panel-title">📅 Orçamentos Em Aberto por Mês</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '100px', paddingTop: '15px' }}>
            {months.length === 0 ? <div style={{ color: 'var(--muted)', fontSize: '12px' }}>Sem dados suficientes</div> : null}
            {months.map(m => (
              <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: '4px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600 }}>{monthlyCounts[m]}</div>
                <div style={{ width: '100%', borderRadius: '4px 4px 0 0', minHeight: '3px', background: 'var(--accent2)', height: `${(monthlyCounts[m] / maxMonthCount) * 100}%` }}></div>
                <div style={{ fontSize: '9px', color: 'var(--muted)' }}>{m.split('-')[1]}/{m.split('-')[0].slice(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="one-col">
        <div className="panel">
          <div className="panel-title">🏆 Top 10 Maiores Orçamentos</div>
          <div id="top10">
            {top10.length === 0 ? <div style={{ color: 'var(--muted)', fontSize: '12px' }}>Nenhum orçamento em aberto.</div> : null}
            {top10.map((o, index) => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: index < top10.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(79,142,247,.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                    {index + 1}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="tt-wrap" style={{ display: 'inline-block' }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, cursor: 'help' }}>{o.paciente?.nome || 'Desconhecido'}</div>
                      <div className="tt tt-orc" style={{ whiteSpace: 'normal', textAlign: 'left', lineHeight: '1.4' }}>
                        <div className="tt-date" style={{ marginBottom: '6px', fontSize: '11px', color: 'var(--accent)' }}>Itens do Orçamento</div>
                        <div style={{ marginBottom: '8px' }}>
                          <strong>{new Date(o.data_orcamento).toLocaleDateString('pt-BR')}</strong> · {formatMoney(o.valor_total)}<br />
                          <span style={{ color: 'var(--muted)' }}>{o.descricao || 'Sem título informado'}</span><br />
                          <span style={{ color: '#c7d2fe' }}>
                            Tratamentos: {(o.tratamentos || []).slice(0, 4).map(t => t.nome).join(' • ')}
                            {(o.tratamentos || []).length > 4 ? ` • +${(o.tratamentos || []).length - 4} itens` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{new Date(o.data_orcamento).toLocaleDateString('pt-BR')}</div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--green)' }}>
                  {formatMoney(o.valor_total)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
