/* ==========================================
   ValeClinic - Módulo Financeiro (JavaScript)
   100% Dinâmico, Baseado em Presenças Confirmadas & Catálogo de Planos
   Versão 6.0 - Zero Mock Data / Estado Inicial Limpo
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {

  // Purga de segurança para caches legados de testes com dados de Julho
  try {
    const rawFin = localStorage.getItem('valeclinic_financeiro');
    if (rawFin) {
      const parsed = JSON.parse(rawFin);
      if (Array.isArray(parsed) && parsed.some(item => ['1','2','3','4','5','6','7','8','9','10','11','12'].includes(String(item.id)))) {
        localStorage.setItem('valeclinic_financeiro', JSON.stringify([]));
      }
    }
  } catch(e) {}

  // ======================================
  // 1. UTILITÁRIOS FINANCEIROS & PARSING
  // ======================================
  function parseValor(v) {
    if (typeof v === 'number') return isNaN(v) ? 0 : v;
    if (!v) return 0;
    const clean = String(v).replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  }

  function formatarMoeda(valor) {
    const v = parseValor(valor);
    return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatarDataBR(dateStr) {
    if (!dateStr) return '';
    if (dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  }

  function isPresencaConfirmada(ag) {
    if (!ag) return false;
    const st = (ag.status || '').toLowerCase();
    
    // Regra estrita de presença confirmada no sistema
    const isPresente = st.includes('presente') || 
                       st.includes('atendido') || 
                       st.includes('conclu') || 
                       st.includes('confirmado');

    const isValido = isPresente && 
                     !st.includes('falto') && 
                     !st.includes('ausente') && 
                     !st.includes('cancel');

    // Se tiver horário de chegada registrado e não for falta/cancelamento
    if (ag.horarioChegada && !st.includes('falto') && !st.includes('cancel')) {
      return true;
    }

    return isValido;
  }

  // ======================================
  // 2. CONSOLIDAÇÃO DINÂMICA DE ATENDIMENTOS & RECEITAS
  // ======================================
  function obterAtendimentosConfirmados() {
    const agendamentos = (typeof ValeStore !== 'undefined' ? ValeStore.getAgendamentos() : []) || [];
    const planos = (typeof ValeStore !== 'undefined' ? ValeStore.getPlanosServicos() : []) || [];

    // Mapa de planos para fallback de precificação
    const planosMap = new Map();
    planos.forEach(p => {
      if (p.id) planosMap.set(String(p.id), p);
      if (p.nome_servico) planosMap.set(p.nome_servico.toLowerCase().trim(), p);
    });

    const confirmados = [];
    const idsConfirmados = new Set();

    // 1. Processar agendamentos com presença confirmada
    agendamentos.forEach(a => {
      if (!a) return;
      if (!isPresencaConfirmada(a)) return;

      let valTotal = parseValor(a.valor_total);
      let valClinica = parseValor(a.valor_clinica);

      // Resolução com tabela de planos caso o agendamento não tenha valores salvos
      if (valTotal === 0 && a.plano_id && planosMap.has(String(a.plano_id))) {
        const pl = planosMap.get(String(a.plano_id));
        valTotal = parseValor(pl.valor_total);
        valClinica = parseValor(pl.valor_clinica);
      } else if (valTotal === 0 && a.plano_nome && planosMap.has(a.plano_nome.toLowerCase().trim())) {
        const pl = planosMap.get(a.plano_nome.toLowerCase().trim());
        valTotal = parseValor(pl.valor_total);
        valClinica = parseValor(pl.valor_clinica);
      }

      const item = {
        id: String(a.id),
        agendamento_id: String(a.id),
        data: a.date || new Date().toISOString().split('T')[0],
        paciente: a.paciente || 'Paciente',
        especialidade: a.especialidade || 'Pilates Studio',
        profissional: a.profissional || 'Profissional',
        plano_nome: a.plano_nome || 'Consulta / Atendimento',
        valor_total: valTotal,
        valor_clinica: valClinica,
        pagamento: 'Presença Confirmada',
        status: a.status || 'Presente'
      };

      confirmados.push(item);
      idsConfirmados.add(String(a.id));
    });

    // 2. Processar lançamentos manuais registrados no financeiro
    const transacoesFinanceiro = (typeof ValeStore !== 'undefined' ? ValeStore.getFinanceiro() : []) || [];
    transacoesFinanceiro.forEach(t => {
      if (!t) return;
      if (t.tipo === 'despesa') return;

      // Se for receita e não estiver duplicado com agendamento
      const refId = String(t.agendamento_id || t.id);
      if (!idsConfirmados.has(refId)) {
        confirmados.push({
          id: String(t.id),
          agendamento_id: t.agendamento_id ? String(t.agendamento_id) : null,
          data: t.data || t.date || new Date().toISOString().split('T')[0],
          paciente: t.paciente || t.descricao || 'Receita Avulsa',
          especialidade: t.categoria || 'Geral',
          profissional: t.profissional || '-',
          plano_nome: t.descricao || 'Lançamento Manual',
          valor_total: parseValor(t.valor),
          valor_clinica: parseValor(t.valor_clinica !== undefined ? t.valor_clinica : t.valor),
          pagamento: t.pagamento || 'PIX',
          status: 'Pago / Confirmado'
        });
      }
    });

    return confirmados;
  }

  // ======================================
  // 3. CÁLCULO E ATUALIZAÇÃO DOS KPIs
  // ======================================
  function atualizarDashboardFinanceiro() {
    const dados = obterAtendimentosConfirmados();

    let faturamentoBruto = 0;
    let caixaLiquido = 0;
    let totalConfirmados = 0;

    dados.forEach(d => {
      faturamentoBruto += d.valor_total;
      caixaLiquido += d.valor_clinica;
      totalConfirmados++;
    });

    // Atualizar Cards Superiores
    const elFaturamento = document.getElementById('kpiFaturamento');
    const elCaixaLiquido = document.getElementById('kpiCaixaLiquido');
    const elRecebido = document.getElementById('kpiRecebido');
    const elTotalConfirmados = document.getElementById('kpiTotalConfirmados');

    if (elFaturamento) elFaturamento.textContent = formatarMoeda(faturamentoBruto);
    if (elCaixaLiquido) elCaixaLiquido.textContent = formatarMoeda(caixaLiquido);
    if (elRecebido) elRecebido.textContent = formatarMoeda(faturamentoBruto);
    if (elTotalConfirmados) elTotalConfirmados.textContent = totalConfirmados;

    renderChartEvolucao(dados);
    renderChartEspecialidade(dados, faturamentoBruto);
  }

  // ======================================
  // 4. GRÁFICO: EVOLUÇÃO MENSAL (ZERO DADOS FALSOS)
  // ======================================
  function renderChartEvolucao(dados) {
    const container = document.getElementById('chartEvolucao');
    if (!container) return;

    // Gerar últimos 6 meses cronológicos baseados na data atual
    const meses = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      meses.push({
        ano: d.getFullYear(),
        mes: d.getMonth() + 1,
        label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
      });
    }

    // Calcular faturamento real de cada mês
    const dadosMeses = meses.map(m => {
      let receita = 0;
      dados.forEach(item => {
        const raw = item.data || '';
        let anoItem, mesItem;
        if (raw.includes('/')) {
          const parts = raw.split('/');
          anoItem = parseInt(parts[2], 10);
          mesItem = parseInt(parts[1], 10);
        } else if (raw.includes('-')) {
          const parts = raw.split('-');
          anoItem = parseInt(parts[0], 10);
          mesItem = parseInt(parts[1], 10);
        } else return;

        if (anoItem === m.ano && mesItem === m.mes) {
          receita += item.valor_total;
        }
      });
      return { ...m, receita };
    });

    const totalPeriodo = dadosMeses.reduce((acc, cur) => acc + cur.receita, 0);

    // Se não houver nenhum faturamento no período, exibir estado inicial zerado
    if (totalPeriodo === 0) {
      container.innerHTML = `
        <div style="width:100%; text-align:center; padding:36px 16px; color:#94A3B8; font-size:0.88rem;">
          Nenhum faturamento registrado nos últimos meses.<br>
          <span style="font-size:0.78rem; opacity:0.8;">O gráfico exibirá as barras dinamicamente conforme os atendimentos forem confirmados na recepção.</span>
        </div>`;
      return;
    }

    const maxVal = Math.max(...dadosMeses.map(d => d.receita), 1);

    container.innerHTML = dadosMeses.map(d => `
      <div class="chart-month-col" style="flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;">
        <div style="width:100%; height:140px; display:flex; align-items:flex-end; justify-content:center;">
          <div class="chart-bar receita" style="width:70%; max-width:34px; border-radius:6px 6px 0 0; background:linear-gradient(180deg, var(--color-primary) 0%, #1E293B 100%); height:${Math.max((d.receita/maxVal)*100, d.receita > 0 ? 8 : 0)}%;" title="${d.label}: ${formatarMoeda(d.receita)}"></div>
        </div>
        <span class="chart-month-label" style="font-size:0.75rem; margin-top:8px; color:var(--color-text-muted); font-weight:600;">${d.label}</span>
      </div>`).join('');
  }

  // ======================================
  // 5. RECEITA POR ESPECIALIDADE (ZERO DADOS FALSOS)
  // ======================================
  function renderChartEspecialidade(dados, faturamentoTotal) {
    const container = document.getElementById('chartEspecialidade');
    if (!container) return;

    // Se o faturamento total for zero, exibir estado limpo/zerado
    if (faturamentoTotal === 0 || dados.length === 0) {
      container.innerHTML = `
        <div style="width:100%; text-align:center; padding:36px 16px; color:#94A3B8; font-size:0.88rem;">
          Nenhum atendimento com presença confirmada até o momento.<br>
          <span style="font-size:0.78rem; opacity:0.8;">Os valores e repasses serão calculados dinamicamente conforme as presenças forem confirmadas.</span>
        </div>`;
      return;
    }

    const especialidades = [
      { key: 'fisio',   label: 'Fisioterapia (Dra. Leonarda / Dr. Lucas)',   css: 'fisio'   },
      { key: 'pilates', label: 'Pilates Studio (Dra. Katiane / Dra. Mirela)', css: 'pilates' },
      { key: 'fono',    label: 'Fonoaudiologia (Dr. Jorge Linhares)',        css: 'fono'    },
      { key: 'outros',  label: 'Outros / Consultas Gerais',                 css: 'outros'  },
    ];

    const totais = { fisio: 0, pilates: 0, fono: 0, outros: 0 };
    const clinicaTotais = { fisio: 0, pilates: 0, fono: 0, outros: 0 };

    dados.forEach(d => {
      let cat = (d.especialidade || '').toLowerCase();
      let prof = (d.profissional || '').toLowerCase();

      if (cat.includes('fisio') || prof.includes('leonarda') || prof.includes('lucas')) {
        totais.fisio += d.valor_total;
        clinicaTotais.fisio += d.valor_clinica;
      } else if (cat.includes('pilates') || prof.includes('katiane') || prof.includes('mirela')) {
        totais.pilates += d.valor_total;
        clinicaTotais.pilates += d.valor_clinica;
      } else if (cat.includes('fono') || prof.includes('jorge')) {
        totais.fono += d.valor_total;
        clinicaTotais.fono += d.valor_clinica;
      } else {
        totais.outros += d.valor_total;
        clinicaTotais.outros += d.valor_clinica;
      }
    });

    container.innerHTML = especialidades.map(e => {
      const tot = totais[e.key];
      const cli = clinicaTotais[e.key];
      const rep = Math.max(0, tot - cli);
      const pct = faturamentoTotal > 0 ? Math.round((tot / faturamentoTotal) * 100) : 0;

      return `
        <div class="specialty-bar-item" style="margin-bottom: 14px;">
          <div class="specialty-bar-header" style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;">
            <strong style="color:var(--color-primary);">${e.label}</strong>
            <span>${pct}% &mdash; <strong>${formatarMoeda(tot)}</strong></span>
          </div>
          <div class="specialty-bar-track" style="height:8px; background:#E2E8F0; border-radius:4px; overflow:hidden; margin-bottom:4px;">
            <div class="specialty-bar-fill ${e.css}" style="width:${Math.max(pct, pct > 0 ? 3 : 0)}%; height:100%; border-radius:4px;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--color-text-muted);">
            <span>Retenção Clínica: <strong style="color:#D97706;">${formatarMoeda(cli)}</strong></span>
            <span>Repasse Profissional: <strong style="color:#10B981;">${formatarMoeda(rep)}</strong></span>
          </div>
        </div>`;
    }).join('');
  }

  // ======================================
  // 6. MODAL: HISTÓRICO DE ATENDIMENTOS CONFIRMADOS
  // ======================================
  const modalRecebidos = document.getElementById('modalRecebidos');

  function renderRecebidos() {
    const tbody = document.getElementById('tbodyRecebidos');
    const empty = document.getElementById('emptyRecebidos');
    if (!tbody) return;

    const dados = obterAtendimentosConfirmados();
    tbody.innerHTML = '';

    if (dados.length === 0) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    dados.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="Data">${formatarDataBR(t.data)}</td>
        <td data-label="Paciente"><strong>${t.paciente}</strong></td>
        <td data-label="Especialidade / Plano">${t.especialidade} &mdash; <span style="font-size:0.82rem; color:#64748B;">${t.plano_nome}</span></td>
        <td data-label="Profissional">${t.profissional}</td>
        <td data-label="Status / Pagamento"><span class="status-badge presente" style="background:#DCFCE7; color:#166534; padding:3px 8px; border-radius:6px; font-size:0.78rem; font-weight:600;">&#10003; ${t.status}</span></td>
        <td data-label="Valor" class="td-valor receita" style="color:#10B981; font-weight:700;">+ ${formatarMoeda(t.valor_total)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Modal Handlers
  document.getElementById('cardRecebido')?.addEventListener('click', () => {
    renderRecebidos();
    if (modalRecebidos) modalRecebidos.classList.add('active');
  });

  document.querySelectorAll('.fin-modal-close, .btn-fin-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fin-modal-overlay').forEach(m => m.classList.remove('active'));
    });
  });

  document.querySelectorAll('.fin-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  // Modal Lançamento Manual de Receita
  const modalLancamento = document.getElementById('modalLancamento');
  const formLancamento = document.getElementById('formLancamento');

  document.getElementById('btnLancamento')?.addEventListener('click', () => {
    if (formLancamento) {
      formLancamento.reset();
      const dtInput = document.getElementById('lancData');
      if (dtInput) dtInput.value = new Date().toISOString().split('T')[0];
    }
    if (modalLancamento) modalLancamento.classList.add('active');
  });

  if (formLancamento) {
    formLancamento.addEventListener('submit', (e) => {
      e.preventDefault();
      const valor = parseFloat(document.getElementById('lancValor')?.value) || 0;
      const data = document.getElementById('lancData')?.value || new Date().toISOString().split('T')[0];
      const categoria = document.getElementById('lancCategoria')?.value || 'Pilates Studio';
      const pagamento = document.getElementById('lancPagamento')?.value || 'PIX';
      const descricao = document.getElementById('lancDescricao')?.value || 'Receita Avulsa';

      const novo = {
        id: 'fin-' + Date.now(),
        data,
        paciente: descricao,
        descricao,
        categoria,
        pagamento,
        valor: valor.toFixed(2).replace('.', ','),
        valor_clinica: valor.toFixed(2).replace('.', ','),
        tipo: 'receita',
        status: 'pago'
      };

      ValeStore.addFinanceiro(novo);
      atualizarDashboardFinanceiro();
      if (modalLancamento) modalLancamento.classList.remove('active');
    });
  }

  // ======================================
  // 7. SINCRONIZAÇÃO REATIVA COM SUPABASE
  // ======================================
  document.addEventListener('valeclinic:dataSynced', (e) => {
    if (e.detail && (e.detail.table === 'agendamentos' || e.detail.table === 'financeiro' || e.detail.table === 'planos_servicos')) {
      atualizarDashboardFinanceiro();
    }
  });

  // Inicialização no carregamento
  atualizarDashboardFinanceiro();

});
