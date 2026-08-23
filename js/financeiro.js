/* ==========================================
   ValeClinic - Módulo Financeiro (JavaScript)
   KPIs Clicáveis com Modais de Detalhe
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ======================================
  // 1. DADOS FINANCEIROS (ESTADO CENTRAL)
  // ======================================
  let transacoes = ValeStore.getFinanceiro();

  // Sincronizar quando Supabase enviar dados novos
  document.addEventListener('valeclinic:dataSynced', (e) => {
    if (e.detail && e.detail.table === 'financeiro') {
      transacoes = ValeStore.getFinanceiro();
      atualizarKPIs();
    }
  });

  // ======================================
  // 2. FUNÇÕES DE CÁLCULO DOS KPIs
  // ======================================
  function parseValor(v) {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    const clean = String(v).replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  }

  function calcularKPIs() {
    let totalRecebido = 0;
    let totalAReceber = 0;
    let totalDespesas = 0;

    transacoes.forEach(t => {
      const val = parseValor(t.valor);
      if (t.tipo === 'receita') {
        if (t.status === 'pago') totalRecebido += val;
        if (t.status === 'pendente') totalAReceber += val;
      } else {
        totalDespesas += val;
      }
    });

    const faturamento = totalRecebido + totalAReceber;
    return { faturamento, totalRecebido, totalAReceber, totalDespesas };
  }

  function formatarMoeda(valor) {
    return 'R$ ' + valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function atualizarKPIs() {
    const kpis = calcularKPIs();
    const elFaturamento = document.getElementById('kpiFaturamento');
    const elRecebido = document.getElementById('kpiRecebido');
    const elAReceber = document.getElementById('kpiAReceber');
    const elDespesas = document.getElementById('kpiDespesas');

    if (elFaturamento) elFaturamento.textContent = formatarMoeda(kpis.faturamento);
    if (elRecebido) elRecebido.textContent = formatarMoeda(kpis.totalRecebido);
    if (elAReceber) elAReceber.textContent = formatarMoeda(kpis.totalAReceber);
    if (elDespesas) elDespesas.textContent = formatarMoeda(kpis.totalDespesas);

    renderChartEvolucao();
    renderChartEspecialidade();
  }

  // ======================================
  // 2b. GRÁFICOS DINMICOS
  // ======================================

  function renderChartEvolucao() {
    const container = document.getElementById('chartEvolucao');
    if (!container) return;

    // Montar últimos 6 meses
    const meses = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      meses.push({ ano: d.getFullYear(), mes: d.getMonth() + 1, label: d.toLocaleDateString('pt-BR', { month: 'short' }) });
    }

    // Calcular receitas e despesas por mês
    const dados = meses.map(m => {
      let receita = 0, despesa = 0;
      transacoes.forEach(t => {
        const raw = t.data || t.date || '';
        let ano, mes;
        if (raw.includes('/')) {
          const parts = raw.split('/');
          ano = parseInt(parts[2]); mes = parseInt(parts[1]);
        } else if (raw.includes('-')) {
          const parts = raw.split('-');
          ano = parseInt(parts[0]); mes = parseInt(parts[1]);
        } else return;
        if (ano === m.ano && mes === m.mes) {
          if (t.tipo === 'receita') receita += parseFloat(t.valor) || 0;
          else despesa += parseFloat(t.valor) || 0;
        }
      });
      return { ...m, receita, despesa };
    });

    const maxVal = Math.max(...dados.map(d => Math.max(d.receita, d.despesa)), 1);

    if (dados.every(d => d.receita === 0 && d.despesa === 0)) {
      container.innerHTML = `<div style="width:100%;text-align:center;padding:32px 0;color:#94A3B8;font-size:0.88rem;">Nenhum lançamento financeiro registrado ainda.</div>`;
      return;
    }

    container.innerHTML = dados.map(d => `
      <div class="chart-month-col">
        <div class="chart-bar-pair">
          <div class="chart-bar receita" style="height:${Math.max((d.receita/maxVal)*100, d.receita > 0 ? 4 : 0)}%" title="Receita: ${formatarMoeda(d.receita)}"></div>
          <div class="chart-bar despesa" style="height:${Math.max((d.despesa/maxVal)*100, d.despesa > 0 ? 4 : 0)}%" title="Despesa: ${formatarMoeda(d.despesa)}"></div>
        </div>
        <span class="chart-month-label">${d.label}</span>
      </div>`).join('');
  }

  function renderChartEspecialidade() {
    const container = document.getElementById('chartEspecialidade');
    if (!container) return;

    const especialidades = [
      { key: 'fisio',   label: 'Fisioterapia',   css: 'fisio'   },
      { key: 'pilates', label: 'Pilates Studio',  css: 'pilates' },
      { key: 'fono',    label: 'Fonoaudiologia',  css: 'fono'    },
      { key: 'despesa', label: 'Outros / Avulsos', css: 'outros'  },
    ];

    const totais = {};
    especialidades.forEach(e => { totais[e.key] = 0; });

    transacoes.filter(t => t.tipo === 'receita' && t.status === 'pago').forEach(t => {
      const cat = t.categoria || t.category || 'despesa';
      if (totais[cat] !== undefined) totais[cat] += parseFloat(t.valor) || 0;
      else totais['despesa'] += parseFloat(t.valor) || 0;
    });

    const totalGeral = Object.values(totais).reduce((a, b) => a + b, 0);

    if (totalGeral === 0) {
      container.innerHTML = `<div style="width:100%;text-align:center;padding:32px 0;color:#94A3B8;font-size:0.88rem;">Nenhuma receita confirmada para distribuir.</div>`;
      return;
    }

    container.innerHTML = especialidades.map(e => {
      const pct = Math.round((totais[e.key] / totalGeral) * 100);
      return `
        <div class="specialty-bar-item">
          <div class="specialty-bar-header">
            <span>${e.label}</span>
            <span>${pct}% — ${formatarMoeda(totais[e.key])}</span>
          </div>
          <div class="specialty-bar-track">
            <div class="specialty-bar-fill ${e.css}" style="width:${Math.max(pct, pct > 0 ? 2 : 0)}%"></div>
          </div>
        </div>`;
    }).join('');
  }

  // ======================================
  // 3. MODAIS DE DETALHE DOS KPIs
  // ======================================
  const modalRecebidos = document.getElementById('modalRecebidos');
  const modalAReceber = document.getElementById('modalAReceber');
  const modalDespesas = document.getElementById('modalDespesas');

  // Renderizar modal Total Recebido
  function renderRecebidos() {
    const tbody = document.getElementById('tbodyRecebidos');
    const empty = document.getElementById('emptyRecebidos');
    if (!tbody) return;

    const dados = transacoes.filter(t => t.tipo === 'receita' && t.status === 'pago');
    tbody.innerHTML = '';

    if (dados.length === 0) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    dados.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="Data">${t.data}</td>
        <td data-label="Paciente"><strong>${t.paciente}</strong></td>
        <td data-label="Descrição">${t.descricao}</td>
        <td data-label="Pagamento">${t.pagamento}</td>
        <td data-label="Valor" class="td-valor receita">+ ${formatarMoeda(t.valor)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Renderizar modal A Receber
  function renderAReceber() {
    const tbody = document.getElementById('tbodyAReceber');
    const empty = document.getElementById('emptyAReceber');
    if (!tbody) return;

    const dados = transacoes.filter(t => t.tipo === 'receita' && t.status === 'pendente');
    tbody.innerHTML = '';

    if (dados.length === 0) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    dados.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="Data da Consulta">${t.data}</td>
        <td data-label="Paciente"><strong>${t.paciente}</strong></td>
        <td data-label="Descrição">${t.descricao}</td>
        <td data-label="Valor" class="td-valor receita">+ ${formatarMoeda(t.valor)}</td>
        <td data-label="Status"><span class="status-badge pendente">◐ Pendente</span></td>
        <td data-label="Ação">
          <button class="btn-dar-baixa" data-id="${t.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Dar Baixa
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Event listeners para Dar Baixa
    tbody.querySelectorAll('.btn-dar-baixa[data-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.btn-dar-baixa');
        if (!targetBtn) return;
        const id = parseInt(targetBtn.getAttribute('data-id'), 10) || targetBtn.getAttribute('data-id');
        darBaixa(id);
      });
    });
  }

  // Renderizar modal Despesas
  function renderDespesas() {
    const tbody = document.getElementById('tbodyDespesas');
    const empty = document.getElementById('emptyDespesas');
    if (!tbody) return;

    const dados = transacoes.filter(t => t.tipo === 'despesa');
    tbody.innerHTML = '';

    if (dados.length === 0) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    dados.forEach(t => {
      const catLabel = t.categoria === 'fisio' ? 'Fisioterapia' :
                       t.categoria === 'pilates' ? 'Pilates Studio' :
                       t.categoria === 'fono' ? 'Fonoaudiologia' : 'Despesa Operacional';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="Data">${t.data}</td>
        <td data-label="Fornecedor"><strong>${t.paciente || t.descricao}</strong></td>
        <td data-label="Categoria"><span class="cat-badge ${t.categoria}">${catLabel}</span></td>
        <td data-label="Valor" class="td-valor despesa">- ${formatarMoeda(t.valor)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Click handlers for KPI cards
  const cardRecebido = document.getElementById('cardRecebido');
  const cardAReceber = document.getElementById('cardAReceber');
  const cardDespesas = document.getElementById('cardDespesas');

  if (cardRecebido && modalRecebidos) {
    cardRecebido.addEventListener('click', () => {
      renderRecebidos();
      modalRecebidos.classList.add('active');
    });
  }

  if (cardAReceber && modalAReceber) {
    cardAReceber.addEventListener('click', () => {
      renderAReceber();
      modalAReceber.classList.add('active');
    });
  }

  if (cardDespesas && modalDespesas) {
    cardDespesas.addEventListener('click', () => {
      renderDespesas();
      modalDespesas.classList.add('active');
    });
  }

  // ======================================
  // 4. LÓGICA "DAR BAIXA"
  // ======================================
  function darBaixa(id) {
    const transacao = transacoes.find(t => t.id == id);
    if (!transacao || transacao.status === 'pago') return;

    transacao.status = 'pago';
    ValeStore.saveFinanceiro(transacoes);

    mostrarToast(`"${transacao.descricao}" marcada como Pago!`);
    atualizarKPIs();
    renderAReceber();
  }

  // ======================================
  // 5. TOAST DE FEEDBACK
  // ======================================
  function mostrarToast(msg) {
    let toast = document.getElementById('finToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'finToast';
      toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px;
        background: #0B1B36; color: #FFFFFF;
        padding: 14px 24px; border-radius: 14px;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 0.88rem; font-weight: 600;
        box-shadow: 0 10px 30px rgba(11,27,54,0.3);
        z-index: 9999; opacity: 0; transition: opacity 0.3s ease;
        display: flex; align-items: center; gap: 10px;
        max-width: 400px;
      `;
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span style="color:#10B981;font-size:1.2rem;">✓</span> ${msg}`;
    toast.style.opacity = '1';

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
  }

  // ======================================
  // 6. MODAIS (Lançamento + Preços)
  // ======================================
  const modalLancamento = document.getElementById('modalLancamento');
  const modalPrecos = document.getElementById('modalPrecos');

  const btnLancamento = document.getElementById('btnLancamento');
  const btnPrecos = document.getElementById('btnPrecos');

  if (btnLancamento && modalLancamento) {
    btnLancamento.addEventListener('click', () => modalLancamento.classList.add('active'));
  }

  if (btnPrecos && modalPrecos) {
    btnPrecos.addEventListener('click', () => modalPrecos.classList.add('active'));
  }

  // Fechar modais
  [modalLancamento, modalPrecos, modalRecebidos, modalAReceber, modalDespesas].forEach(modal => {
    if (!modal) return;
    modal.querySelectorAll('.fin-modal-close, .btn-fin-cancel').forEach(btn => {
      btn.addEventListener('click', () => modal.classList.remove('active'));
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

  // Salvar Lançamento Manual
  const formLancamento = document.getElementById('formLancamento');
  if (formLancamento) {
    formLancamento.addEventListener('submit', (e) => {
      e.preventDefault();

      const tipo = document.getElementById('lancTipo').value;
      const valor = parseFloat(document.getElementById('lancValor').value);
      const data = document.getElementById('lancData').value;
      const categoria = document.getElementById('lancCategoria').value;
      const pagamento = document.getElementById('lancPagamento').value;
      const status = document.getElementById('lancStatus').value;
      const descricao = document.getElementById('lancDescricao').value || (tipo === 'receita' ? 'Receita Avulsa' : 'Despesa Avulsa');

      if (!valor || valor <= 0) {
        alert('Por favor, insira um valor válido.');
        return;
      }

      const partes = data.split('-');
      const dataFormatada = partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : data;

      const novaTransacao = {
        id: Date.now(),
        data: dataFormatada,
        paciente: descricao,
        descricao: descricao,
        categoria: categoria,
        pagamento: pagamento,
        valor: valor,
        tipo: tipo,
        status: status,
      };

      transacoes.unshift(novaTransacao);
      ValeStore.saveFinanceiro(transacoes);

      mostrarToast(`Lançamento de ${formatarMoeda(valor)} adicionado com sucesso!`);
      atualizarKPIs();

      modalLancamento.classList.remove('active');
      formLancamento.reset();
    });
  }

  // ======================================
  // 7. CONTROLES GLOBAIS
  // ======================================
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

  // ======================================
  // 8. INICIALIZAÇO
  // ======================================
  atualizarKPIs();

});
