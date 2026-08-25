/* ==========================================
   ValeClinic - Módulo Configuração de Valores e Serviços
   CRUD Inteligente da Tabela planos_servicos (Supabase + LocalStorage)
   Versão 1.0 - Isolamento Seguro
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {

  const SUPABASE_URL = 'https://nzlwmlieznykmlkcfmsp.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56bHdtbGllem55a21sa2NmbXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNjExODUsImV4cCI6MjEwMDkzNzE4NX0.SumL1Iu4G9Y1pNb0nsqirC1CqJs8x2gtqke_pFvQhJM';
  const LOCAL_STORAGE_KEY = 'valeclinic_planos_servicos';

  let _supabaseClient = null;
  let servicosData = [];

  function getSupabase() {
    if (_supabaseClient) return _supabaseClient;
    try {
      if (window.supabase && window.supabase.createClient) {
        _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      }
    } catch (e) {
      console.warn('[FinanceiroConfig] Supabase não inicializado:', e);
    }
    return _supabaseClient;
  }

  // ------------------------------------------
  // TOAST NOTIFICATION
  // ------------------------------------------
  function showToast(message, type = 'error') {
    const toast = document.getElementById('toastNotification');
    const msg   = document.getElementById('toastMessage');
    if (!toast || !msg) return;
    msg.textContent = message;
    toast.className = `toast-notification ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 4000);
  }

  // ------------------------------------------
  // PARSING & FORMATAÇÃO DE MOEDA (PT-BR)
  // ------------------------------------------
  function parseMoney(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }

  function formatMoney(num) {
    const n = typeof num === 'number' ? num : parseMoney(num);
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatInputValue(num) {
    const n = typeof num === 'number' ? num : parseMoney(num);
    return n.toFixed(2).replace('.', ',');
  }

  // ------------------------------------------
  // CARREGAR E SINCRONIZAR SERVIÇOS
  // ------------------------------------------
  async function carregarServicos() {
    const db = getSupabase();
    let dadosCarregados = [];

    if (db) {
      try {
        const { data, error } = await db
          .from('planos_servicos')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[FinanceiroConfig] Tabela planos_servicos não encontrada ou sem permissão:', error.message);
          // Fallback para localStorage
          const local = localStorage.getItem(LOCAL_STORAGE_KEY);
          dadosCarregados = local ? JSON.parse(local) : getServicosExemplo();
        } else {
          dadosCarregados = data || [];
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dadosCarregados));
        }
      } catch (err) {
        console.warn('[FinanceiroConfig] Erro ao carregar do Supabase:', err);
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        dadosCarregados = local ? JSON.parse(local) : getServicosExemplo();
      }
    } else {
      const local = localStorage.getItem(LOCAL_STORAGE_KEY);
      dadosCarregados = local ? JSON.parse(local) : getServicosExemplo();
    }

    servicosData = dadosCarregados;
    renderizarTabela();
    atualizarKPIs();
  }

  function getServicosExemplo() {
    return [
      {
        id: 'ex-1',
        nome_servico: 'Sessão Avulsa - Pilates',
        tipo_cobranca: 'avulso',
        quantidade_sessoes: 1,
        valor_total: 120.00,
        valor_clinica: 40.00
      },
      {
        id: 'ex-2',
        nome_servico: 'Pacote Mensal Pilates (2x/semana - 8 sessões)',
        tipo_cobranca: 'pacote',
        quantidade_sessoes: 8,
        valor_total: 450.00,
        valor_clinica: 150.00
      },
      {
        id: 'ex-3',
        nome_servico: 'Consulta Avaliativa - Fisioterapia',
        tipo_cobranca: 'avulso',
        quantidade_sessoes: 1,
        valor_total: 180.00,
        valor_clinica: 60.00
      }
    ];
  }

  // ------------------------------------------
  // ATUALIZAR KPIS
  // ------------------------------------------
  function atualizarKPIs() {
    const totalEl   = document.getElementById('kpiTotalServicos');
    const avulsosEl = document.getElementById('kpiAvulsos');
    const pacotesEl = document.getElementById('kpiPacotes');

    const total = servicosData.length;
    const avulsos = servicosData.filter(s => s.tipo_cobranca === 'avulso').length;
    const pacotes = servicosData.filter(s => s.tipo_cobranca === 'pacote').length;

    if (totalEl) totalEl.textContent = total;
    if (avulsosEl) avulsosEl.textContent = avulsos;
    if (pacotesEl) pacotesEl.textContent = pacotes;
  }

  // ------------------------------------------
  // RENDERIZAR TABELA COM FILTROS
  // ------------------------------------------
  function renderizarTabela() {
    const tbody = document.getElementById('tabelaServicosBody');
    if (!tbody) return;

    const termoBusca = (document.getElementById('inputSearchServico')?.value || '').toLowerCase().trim();
    const filtroTipo = document.getElementById('filterTipo')?.value || 'todos';

    let filtrados = servicosData.filter(s => {
      const matchNome = (s.nome_servico || '').toLowerCase().includes(termoBusca);
      const matchTipo = (filtroTipo === 'todos') || (s.tipo_cobranca === filtroTipo);
      return matchNome && matchTipo;
    });

    if (filtrados.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="padding: 48px 20px; text-align: center; color: var(--color-text-muted);">
            <div style="font-size: 1.1rem; font-weight: 600; color: var(--color-primary); margin-bottom: 6px;">
              Nenhum serviço ou plano encontrado
            </div>
            <p style="font-size: 0.85rem;">Clique em <strong>"Novo Serviço / Plano"</strong> para parametrizar um novo item no catálogo.</p>
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    filtrados.forEach(s => {
      const isAvulso = s.tipo_cobranca === 'avulso';
      const badgeClass = isAvulso ? 'avulso' : 'pacote';
      const badgeText = isAvulso ? 'Avulso' : 'Pacote';

      const valTotal = parseMoney(s.valor_total);
      const valClinica = parseMoney(s.valor_clinica);
      const valRepasse = Math.max(0, valTotal - valClinica);

      html += `
        <tr style="border-bottom: 1px solid var(--color-border-table);">
          <td style="padding: 16px 20px;">
            <strong style="color: var(--color-primary); font-size: 0.95rem;">${escapeHtml(s.nome_servico)}</strong>
          </td>
          <td style="padding: 16px 20px; text-align: center;">
            <span class="type-badge ${badgeClass}">${badgeText}</span>
          </td>
          <td style="padding: 16px 20px; text-align: center; font-weight: 600; color: var(--color-text-main);">
            ${s.quantidade_sessoes || 1} ${s.quantidade_sessoes === 1 ? 'sessão' : 'sessões'}
          </td>
          <td style="padding: 16px 20px; text-align: right; font-weight: 700; color: var(--color-primary);">
            ${formatMoney(valTotal)}
          </td>
          <td style="padding: 16px 20px; text-align: right; font-weight: 600; color: #D97706;">
            ${formatMoney(valClinica)}
          </td>
          <td style="padding: 16px 20px; text-align: right; font-weight: 700; color: #10B981;">
            ${formatMoney(valRepasse)}
          </td>
          <td style="padding: 16px 20px;">
            <div class="action-btn-group">
              <button type="button" class="btn-action-icon btn-edit-service" data-id="${s.id}" title="Editar Serviço">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button type="button" class="btn-action-icon delete btn-delete-service" data-id="${s.id}" title="Excluir Serviço">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ------------------------------------------
  // MODAL & FORMULÁRIO (CRIAR / EDITAR)
  // ------------------------------------------
  const modalServico = document.getElementById('modalServico');
  const formServico  = document.getElementById('formServico');
  const modalTitle   = document.getElementById('modalTitle');

  const inputId       = document.getElementById('serviceId');
  const inputNome     = document.getElementById('nomeServico');
  const selectTipo    = document.getElementById('tipoCobranca');
  const inputQtd      = document.getElementById('qtdSessoes');
  const inputTotal    = document.getElementById('valorTotal');
  const inputClinica  = document.getElementById('valorClinica');
  const previewRepasse = document.getElementById('previewRepasse');

  function openModal(isEdit = false, item = null) {
    formServico.reset();
    if (isEdit && item) {
      modalTitle.textContent = 'Editar Serviço / Plano';
      inputId.value      = item.id;
      inputNome.value    = item.nome_servico || '';
      selectTipo.value   = item.tipo_cobranca || 'avulso';
      inputQtd.value     = item.quantidade_sessoes || 1;
      inputTotal.value   = formatInputValue(item.valor_total);
      inputClinica.value = formatInputValue(item.valor_clinica);
    } else {
      modalTitle.textContent = 'Novo Serviço / Plano';
      inputId.value      = '';
      selectTipo.value   = 'avulso';
      inputQtd.value     = 1;
      inputTotal.value   = '';
      inputClinica.value = '';
    }
    atualizarPreviewRepasse();
    modalServico.classList.add('active');
    inputNome.focus();
  }

  function closeModal() {
    modalServico.classList.remove('active');
  }

  function atualizarPreviewRepasse() {
    const total = parseMoney(inputTotal.value);
    const clinica = parseMoney(inputClinica.value);
    const repasse = Math.max(0, total - clinica);
    previewRepasse.textContent = formatMoney(repasse);
  }

  // Event Listeners dos botões de abrir/fechar modal
  document.getElementById('btnOpenNewService')?.addEventListener('click', () => openModal(false));
  document.getElementById('btnCloseModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelModal')?.addEventListener('click', closeModal);

  if (modalServico) {
    modalServico.addEventListener('click', (e) => {
      if (e.target === modalServico) closeModal();
    });
  }

  // Listener para ajuste dinâmico quando tipo de cobrança muda
  selectTipo?.addEventListener('change', () => {
    if (selectTipo.value === 'avulso') {
      inputQtd.value = 1;
    } else if (parseInt(inputQtd.value, 10) <= 1) {
      inputQtd.value = 8;
    }
  });

  inputTotal?.addEventListener('input', atualizarPreviewRepasse);
  inputClinica?.addEventListener('input', atualizarPreviewRepasse);

  // ------------------------------------------
  // SALVAR SERVIÇO (INSERT OU UPDATE)
  // ------------------------------------------
  formServico?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = inputId.value;
    const nome = inputNome.value.trim();
    const tipo = selectTipo.value;
    const qtd = parseInt(inputQtd.value, 10) || 1;
    const valTotal = parseMoney(inputTotal.value);
    const valClinica = parseMoney(inputClinica.value);

    if (!nome) {
      showToast('Por favor, informe o nome do serviço.', 'error');
      return;
    }

    if (valTotal <= 0) {
      showToast('O valor total pago pelo paciente deve ser maior que zero.', 'error');
      return;
    }

    if (valClinica > valTotal) {
      showToast('O valor da clínica não pode ser maior que o valor total do serviço.', 'error');
      return;
    }

    const payload = {
      nome_servico: nome,
      tipo_cobranca: tipo,
      quantidade_sessoes: qtd,
      valor_total: valTotal,
      valor_clinica: valClinica
    };

    const db = getSupabase();

    if (id) {
      // UPDATE
      if (db) {
        try {
          const { error } = await db
            .from('planos_servicos')
            .update(payload)
            .eq('id', id);
          if (error) throw error;
        } catch (err) {
          console.warn('[FinanceiroConfig] Erro update Supabase:', err.message);
        }
      }

      const idx = servicosData.findIndex(s => String(s.id) === String(id));
      if (idx !== -1) {
        servicosData[idx] = { ...servicosData[idx], ...payload };
      }
      showToast('Serviço atualizado com sucesso!', 'success');
    } else {
      // INSERT
      let newRecord = { ...payload, id: 'ps-' + Date.now(), created_at: new Date().toISOString() };

      if (db) {
        try {
          const { data, error } = await db
            .from('planos_servicos')
            .insert([payload])
            .select();
          if (error) {
            console.warn('[FinanceiroConfig] Erro insert Supabase:', error.message);
          } else if (data && data[0]) {
            newRecord = data[0];
          }
        } catch (err) {
          console.warn('[FinanceiroConfig] Exceção insert Supabase:', err.message);
        }
      }

      servicosData.unshift(newRecord);
      showToast('Novo serviço cadastrado com sucesso!', 'success');
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(servicosData));
    closeModal();
    renderizarTabela();
    atualizarKPIs();
  });

  // ------------------------------------------
  // EVENT DELEGATION NA TABELA (EDITAR / EXCLUIR)
  // ------------------------------------------
  const tabelaBody = document.getElementById('tabelaServicosBody');
  if (tabelaBody) {
    tabelaBody.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('.btn-edit-service');
      const delBtn  = e.target.closest('.btn-delete-service');

      if (editBtn) {
        const id = editBtn.dataset.id;
        const item = servicosData.find(s => String(s.id) === String(id));
        if (item) openModal(true, item);
        return;
      }

      if (delBtn) {
        const id = delBtn.dataset.id;
        const item = servicosData.find(s => String(s.id) === String(id));
        const nome = item ? item.nome_servico : 'este serviço';

        if (confirm(`Tem certeza que deseja excluir "${nome}" do catálogo?`)) {
          const db = getSupabase();
          if (db) {
            try {
              const { error } = await db
                .from('planos_servicos')
                .delete()
                .eq('id', id);
              if (error) console.warn('[FinanceiroConfig] Erro delete Supabase:', error.message);
            } catch (err) {
              console.warn('[FinanceiroConfig] Exceção delete Supabase:', err.message);
            }
          }

          servicosData = servicosData.filter(s => String(s.id) !== String(id));
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(servicosData));
          showToast('Serviço removido com sucesso!', 'success');
          renderizarTabela();
          atualizarKPIs();
        }
        return;
      }
    });
  }

  // ------------------------------------------
  // BUSCA E FILTROS EM TEMPO REAL
  // ------------------------------------------
  document.getElementById('inputSearchServico')?.addEventListener('input', renderizarTabela);
  document.getElementById('filterTipo')?.addEventListener('change', renderizarTabela);

  // ------------------------------------------
  // MENU MOBILE (HAMBURGER)
  // ------------------------------------------
  const btnHamburger   = document.getElementById('btnHamburger');
  const sidebar        = document.querySelector('.sidebar');
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

  // Inicialização
  carregarServicos();

});
