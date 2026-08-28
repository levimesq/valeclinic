/* ==========================================
   ValeClinic - Módulo Financeiro (JavaScript)
   100% Dinâmico, Baseado em Presenças Confirmadas & Catálogo de Planos
   Versão 7.0 - Cálculo Correto de Repasses & Responsividade Mobile
   ========================================== */

document.addEventListener('DOMContentLoaded', async () => {

  // ======================================
  // 1. MENU RESPONSIVO MOBILE & NOTIFICAÇÕES
  // ======================================
  const btnHamburger = document.getElementById('btnHamburger');
  const sidebar = document.querySelector('.sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  if (btnHamburger && sidebar && sidebarOverlay) {
    function toggleSidebar() {
      sidebar.classList.toggle('open');
      sidebarOverlay.classList.toggle('active');
      document.body.classList.toggle('sidebar-open');
    }
    btnHamburger.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);
  }

  const bellBtn = document.getElementById('bellBtn');
  const notificationsPopover = document.getElementById('notificationsPopover');

  if (bellBtn && notificationsPopover) {
    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = notificationsPopover.style.display === 'block';
      if (!isVisible) {
        const rect = bellBtn.getBoundingClientRect();
        notificationsPopover.style.top = (rect.bottom + 10) + 'px';
        notificationsPopover.style.right = (window.innerWidth - rect.right) + 'px';
      }
      notificationsPopover.style.display = isVisible ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
      if (!notificationsPopover.contains(e.target) && !bellBtn.contains(e.target)) {
        notificationsPopover.style.display = 'none';
      }
    });
  }

  // Purga de segurança para caches legados de testes
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
  // 2. UTILITÁRIOS FINANCEIROS & PARSING
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
    
    const isPresente = st.includes('presente') || 
                       st.includes('atendido') || 
                       st.includes('conclu') || 
                       st.includes('confirmado');

    const isValido = isPresente && 
                     !st.includes('falto') && 
                     !st.includes('ausente') && 
                     !st.includes('cancel');

    if (ag.horarioChegada && !st.includes('falto') && !st.includes('cancel')) {
      return true;
    }

    return isValido;
  }

  // ======================================
  // 3. CONSOLIDAÇÃO DINÂMICA DE ATENDIMENTOS & REPASSES
  // ======================================
  function obterAtendimentosConfirmados() {
    const agendamentos = (typeof ValeStore !== 'undefined' ? ValeStore.getAgendamentos() : []) || [];
    const planos = (typeof ValeStore !== 'undefined' ? ValeStore.getPlanosServicos() : []) || [];

    // Mapa inteligente de planos para fallback de precificação
    function findMatchingPlan(planoId, planoNome, especialidade, desc, valorTotal) {
      if (planoId) {
        const found = planos.find(p => String(p.id) === String(planoId));
        if (found) return found;
      }

      const strList = [planoNome, desc].filter(Boolean).map(s => String(s).toLowerCase().trim());
      for (const s of strList) {
        const cleanS = s.replace('agendamento:', '').replace('consulta:', '').trim();
        const found = planos.find(p => {
          const nomeP = (p.nome_servico || '').toLowerCase().trim();
          return nomeP === cleanS || cleanS.includes(nomeP) || nomeP.includes(cleanS);
        });
        if (found) return found;
      }

      // Procura por especialidade + valor
      const esp = (especialidade || '').toLowerCase();
      if (valorTotal > 0) {
        const foundByVal = planos.find(p => parseValor(p.valor_total) === valorTotal && (
          (esp.includes('fono') && (p.nome_servico || '').toLowerCase().includes('fono')) ||
          (esp.includes('psico') && (p.nome_servico || '').toLowerCase().includes('psico')) ||
          (esp.includes('pilates') && (p.nome_servico || '').toLowerCase().includes('pilates')) ||
          (esp.includes('fisio') && (p.nome_servico || '').toLowerCase().includes('fisio'))
        ));
        if (foundByVal) return foundByVal;
      }

      return null;
    }

    const confirmados = [];
    const idsConfirmados = new Set();

    // 1. Processar agendamentos com presença confirmada
    agendamentos.forEach(a => {
      if (!a) return;
      if (!isPresencaConfirmada(a)) return;

      let valTotal = parseValor(a.valor_total);
      let valClinica = a.valor_clinica !== undefined && a.valor_clinica !== null && a.valor_clinica !== '' ? parseValor(a.valor_clinica) : null;
      const matchedPlano = findMatchingPlan(a.plano_id, a.plano_nome, a.especialidade, '', valTotal);

      if (valTotal === 0 && matchedPlano) {
        valTotal = parseValor(matchedPlano.valor_total);
      }

      // Se valor_clinica não veio ou veio igual ao total, obter do plano cadastrado
      if (valClinica === null || valClinica === 0 || valClinica === valTotal) {
        if (matchedPlano && parseValor(matchedPlano.valor_clinica) > 0) {
          valClinica = parseValor(matchedPlano.valor_clinica);
        } else {
          // Retenção padrão: 20% para a clínica (conforme regra de R$ 26 de R$ 130)
          valClinica = Math.round(valTotal * 0.20 * 100) / 100;
        }
      }

      const repasseProfissional = Math.max(0, valTotal - valClinica);

      const item = {
        id: String(a.id),
        agendamento_id: String(a.id),
        data: a.date || new Date().toISOString().split('T')[0],
        paciente: a.paciente || 'Paciente',
        especialidade: a.especialidade || 'Pilates Studio',
        profissional: a.profissional || 'Profissional',
        plano_nome: a.plano_nome || (matchedPlano ? matchedPlano.nome_servico : 'Consulta / Atendimento'),
        valor_total: valTotal,
        valor_clinica: valClinica,
        repasse_profissional: repasseProfissional,
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

      const refId = String(t.agendamento_id || t.id);
      if (!idsConfirmados.has(refId)) {
        const valTotal = parseValor(t.valor);
        let valClinica = t.valor_clinica !== undefined && t.valor_clinica !== null && t.valor_clinica !== '' ? parseValor(t.valor_clinica) : null;
        const matchedPlano = findMatchingPlan(null, null, t.categoria, t.descricao, valTotal);

        if (matchedPlano && parseValor(matchedPlano.valor_clinica) > 0 && (valClinica === null || valClinica === 0 || valClinica === valTotal)) {
          valClinica = parseValor(matchedPlano.valor_clinica);
        } else if (valClinica === null || valClinica === 0 || valClinica === valTotal) {
          valClinica = Math.round(valTotal * 0.20 * 100) / 100;
        }

        const repasse = Math.max(0, valTotal - valClinica);

        confirmados.push({
          id: String(t.id),
          agendamento_id: t.agendamento_id ? String(t.agendamento_id) : null,
          data: t.data || t.date || new Date().toISOString().split('T')[0],
          paciente: t.paciente || t.descricao || 'Receita Avulsa',
          especialidade: t.categoria || 'Geral',
          profissional: t.profissional || '-',
          plano_nome: t.descricao || (matchedPlano ? matchedPlano.nome_servico : 'Lançamento Manual'),
          valor_total: valTotal,
          valor_clinica: valClinica,
          repasse_profissional: repasse,
          pagamento: t.pagamento || 'PIX',
          status: 'Pago / Confirmado'
        });
      }
    });

    return confirmados;
  }

  // ======================================
  // 4. CÁLCULO E ATUALIZAÇÃO DOS KPIs
  // ======================================
  function atualizarDashboardFinanceiro() {
    const dados = obterAtendimentosConfirmados();

    // 1. Total Bruto = Soma integral de todos os pagamentos dos pacientes
    // 2. Repasse Profissional = Soma dos valores devidos aos doutores
    // 3. Líquido (Clínica) = Total Bruto - Repasse Profissional
    let totalBruto = 0;
    let repasseProfissional = 0;
    let totalConfirmados = 0;

    dados.forEach(d => {
      const bruto = d.valor_total || 0;
      const repasse = d.repasse_profissional !== undefined ? d.repasse_profissional : Math.max(0, bruto - (d.valor_clinica || 0));
      
      totalBruto += bruto;
      repasseProfissional += repasse;
      totalConfirmados++;
    });

    const liquidoClinica = totalBruto - repasseProfissional;

    // Atualizar Cards Superiores
    const elFaturamento = document.getElementById('kpiFaturamento');
    const elCaixaLiquido = document.getElementById('kpiCaixaLiquido');
    const elTotalConfirmados = document.getElementById('kpiTotalConfirmados');

    if (elFaturamento) elFaturamento.textContent = formatarMoeda(totalBruto);
    if (elCaixaLiquido) elCaixaLiquido.textContent = formatarMoeda(liquidoClinica);
    if (elTotalConfirmados) elTotalConfirmados.textContent = totalConfirmados;

    renderChartEvolucao(dados);
    renderChartEspecialidade(dados, totalBruto);
  }

  // ======================================
  // 5. GRÁFICO: EVOLUÇÃO MENSAL
  // ======================================
  function renderChartEvolucao(dados) {
    const container = document.getElementById('chartEvolucao');
    if (!container) return;

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
  // 6. RECEITA POR ESPECIALIDADE & REPASSES
  // ======================================
  function renderChartEspecialidade(dados, faturamentoTotal) {
    const container = document.getElementById('chartEspecialidade');
    if (!container) return;

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
      { key: 'psico',   label: 'Psicopedagogia (Dra. Cleópatra)',            css: 'fono'    },
      { key: 'outros',  label: 'Outros / Consultas Gerais',                 css: 'outros'  },
    ];

    const totais = { fisio: 0, pilates: 0, fono: 0, psico: 0, outros: 0 };
    const clinicaTotais = { fisio: 0, pilates: 0, fono: 0, psico: 0, outros: 0 };

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
      } else if (cat.includes('psico') || cat.includes('neuro') || prof.includes('cleópatra') || prof.includes('cleopatra')) {
        totais.psico += d.valor_total;
        clinicaTotais.psico += d.valor_clinica;
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
            <span>Retenção Clínica (Líquido): <strong style="color:#D97706;">${formatarMoeda(cli)}</strong></span>
            <span>Repasse Profissional: <strong style="color:#10B981;">${formatarMoeda(rep)}</strong></span>
          </div>
        </div>`;
    }).join('');
  }

  // ======================================
  // 7. MODAL: HISTÓRICO DE ATENDIMENTOS CONFIRMADOS
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
      const rep = t.repasse_profissional || Math.max(0, t.valor_total - t.valor_clinica);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="Data">${formatarDataBR(t.data)}</td>
        <td data-label="Paciente"><strong>${t.paciente}</strong></td>
        <td data-label="Especialidade / Plano">${t.especialidade} &mdash; <span style="font-size:0.82rem; color:#64748B;">${t.plano_nome}</span></td>
        <td data-label="Profissional">${t.profissional}</td>
        <td data-label="Status / Pagamento"><span class="status-badge presente" style="background:#DCFCE7; color:#166534; padding:3px 8px; border-radius:6px; font-size:0.78rem; font-weight:600;">&#10003; ${t.status}</span></td>
        <td data-label="Valor" class="td-valor receita" style="color:#10B981; font-weight:700;">
          + ${formatarMoeda(t.valor_total)}
          <div style="font-size:0.72rem; font-weight:600; color:#475569; margin-top:2px;">
            <span style="color:#D97706;">Líq. Clínica: ${formatarMoeda(t.valor_clinica)}</span> | <span style="color:#2563EB;">Repasse: ${formatarMoeda(rep)}</span>
          </div>
        </td>
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

      // Calcular retenção da clínica (ex: 35% clínica, 65% profissional)
      const valClinicaNum = Math.round(valor * 0.35 * 100) / 100;

      const novo = {
        id: 'fin-' + Date.now(),
        data,
        paciente: descricao,
        descricao,
        categoria,
        pagamento,
        valor: valor.toFixed(2).replace('.', ','),
        valor_clinica: valClinicaNum.toFixed(2).replace('.', ','),
        tipo: 'receita',
        status: 'pago'
      };

      ValeStore.addFinanceiro(novo);
      atualizarDashboardFinanceiro();
      if (modalLancamento) modalLancamento.classList.remove('active');
    });
  }

  // ======================================
  // 8. FETCH ASSÍNCRONO & SINGLE SOURCE OF TRUTH
  // ======================================
  async function fetchDadosFinanceiro() {
    try {
      if (typeof ValeStore !== 'undefined') {
        if (ValeStore.syncAgendamentos) await ValeStore.syncAgendamentos();
        if (ValeStore.syncPlanosServicos) await ValeStore.syncPlanosServicos();
      }
      atualizarDashboardFinanceiro();
    } catch (err) {
      console.error('[Financeiro] Erro ao sincronizar dados do Supabase:', err);
      atualizarDashboardFinanceiro();
    }
  }

  // Sincronização reativa com Supabase
  document.addEventListener('valeclinic:dataSynced', (e) => {
    if (e.detail && (e.detail.table === 'agendamentos' || e.detail.table === 'financeiro' || e.detail.table === 'planos_servicos')) {
      atualizarDashboardFinanceiro();
    }
  });

  // Inicialização no carregamento
  await fetchDadosFinanceiro();

});
