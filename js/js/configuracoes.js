/* ==========================================
   ValeClinic - Módulo de Configurações & Equipe (JS)
   Gestão de Usuários, Cargos e Permissões
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ======================================
  // 1. ESTADO DE USUÁRIOS/EQUIPE
  // ======================================
  let colaboradores = ValeStore.getEquipe();

  let idEdicao = null;
  let idParaInativar = null;

  // ======================================
  // 2. FUNÇÕES DE CÁLCULO E KPIS
  // ======================================
  function atualizarKPIs() {
    const total = colaboradores.length;
    const clinico = colaboradores.filter(c => ['fisio', 'fono', 'pilates'].includes(c.cargo)).length;
    const adminRecepcao = colaboradores.filter(c => ['recepcao', 'gerencia'].includes(c.cargo)).length;
    const ativos = colaboradores.filter(c => c.status === 'ativo').length;

    const elTotal = document.getElementById('kpiTotalEquipe');
    const elClinico = document.getElementById('kpiCorpoClinico');
    const elAdmin = document.getElementById('kpiRecepcaoAdmin');
    const elAtivos = document.getElementById('kpiUsuariosAtivos');

    if (elTotal) elTotal.textContent = total;
    if (elClinico) elClinico.textContent = clinico;
    if (elAdmin) elAdmin.textContent = adminRecepcao;
    if (elAtivos) elAtivos.textContent = ativos;
  }

  // ======================================
  // 3. RENDERIZAÇO DA TABELA
  // ======================================
  function renderizarTabela(termoBusca = '') {
    const tbody = document.getElementById('configTbody');
    if (!tbody) return;

    let filtrados = colaboradores;
    if (termoBusca.trim() !== '') {
      const q = termoBusca.toLowerCase();
      filtrados = colaboradores.filter(c =>
        c.nome.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.cargoLabel.toLowerCase().includes(q) ||
        c.registro.toLowerCase().includes(q)
      );
    }

    tbody.innerHTML = '';

    if (filtrados.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding: 32px; color: var(--color-text-muted);">
            Nenhum profissional cadastrado
          </td>
        </tr>
      `;
      return;
    }

    filtrados.forEach(c => {
      const tr = document.createElement('tr');

      const statusBadge = c.status === 'ativo'
        ? `<span class="user-status-badge ativo">● Ativo</span>`
        : `<span class="user-status-badge inativo">○ Inativo</span>`;

      const btnInativarLabel = c.status === 'ativo' ? 'Inativar' : 'Ativar';
      const btnInativarClass = c.status === 'ativo' ? 'btn-tbl-delete' : 'btn-tbl-edit';

      tr.innerHTML = `
        <td data-label="Colaborador">
          <div class="user-cell">
            <div class="user-avatar-circle">${c.iniciais}</div>
            <div class="user-cell-meta">
              <span class="user-cell-name">${c.nome}</span>
              <span class="user-cell-email">${c.email}</span>
            </div>
          </div>
        </td>
        <td data-label="Cargo / Especialidade">
          <span class="cargo-badge ${c.cargo}">${c.cargoLabel}</span>
        </td>
        <td data-label="Registro Profissional">
          <span class="registro-text">${c.registro}</span>
        </td>
        <td data-label="Nível de Acesso">
          <span class="access-badge ${c.acesso}">${c.acessoLabel}</span>
        </td>
        <td data-label="Status">${statusBadge}</td>
        <td data-label="Ações">
          <div class="action-buttons-group">
            <button class="btn-tbl-edit" data-id="${c.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Editar
            </button>
            <button class="${btnInativarClass}" data-inativar-id="${c.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
              ${btnInativarLabel}
            </button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Event Listeners para Editar
    document.querySelectorAll('.btn-tbl-edit[data-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-id'), 10);
        abrirModalEdicao(id);
      });
    });

    // Event Listeners para Inativar/Ativar
    document.querySelectorAll('[data-inativar-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-inativar-id'), 10);
        const user = colaboradores.find(item => item.id === id);
        if (!user) return;

        if (user.status === 'ativo') {
          idParaInativar = id;
          abrirModalConfirmacao(user.nome);
        } else {
          user.status = 'ativo';
          mostrarToast(`${user.nome} reativado(a) com sucesso!`);
          atualizarKPIs();
          renderizarTabela(searchInput ? searchInput.value : '');
        }
      });
    });
  }

  // ======================================
  // 4. TOAST NOTIFICATION
  // ======================================
  function mostrarToast(msg) {
    let toast = document.getElementById('cfgToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cfgToast';
      toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px;
        background: #0B1B36; color: #FFFFFF;
        padding: 14px 24px; border-radius: 14px;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 0.88rem; font-weight: 600;
        box-shadow: 0 10px 30px rgba(11,27,54,0.3);
        z-index: 9999; opacity: 0; transition: opacity 0.3s ease;
        display: flex; align-items: center; gap: 10px;
        max-width: 420px;
      `;
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span style="color:#10B981;font-size:1.2rem;">✓</span> ${msg}`;
    toast.style.opacity = '1';

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
  }

  // ======================================
  // 5. MODAL NOVO / EDITAR
  // ======================================
  const modalColaborador = document.getElementById('modalColaborador');
  const formColaborador = document.getElementById('formColaborador');
  const modalTitle = document.getElementById('modalTitle');
  const btnNovoUser = document.getElementById('btnNovoUser');

  const inputNome = document.getElementById('cfgNome');
  const inputEmail = document.getElementById('cfgEmail');
  const selectCargo = document.getElementById('cfgCargo');
  const inputRegistro = document.getElementById('cfgRegistro');
  const selectAcesso = document.getElementById('cfgAcesso');
  const helpTextAcesso = document.getElementById('helpTextAcesso');

  const descricoesAcesso = {
    admin: '👑 <strong>Administrador:</strong> Acesso total ao sistema, prontuários, cadastros e relatórios financeiros.',
    saude: '🩺 <strong>Profissional de Saúde:</strong> Acesso a prontuários, agendamentos e evoluções clínicas dos pacientes.',
    recepcao: '🛎️ <strong>Recepção:</strong> Confirma presenças (check-in), agenda horários e cadastra pacientes (SEM acesso ao financeiro total).'
  };

  if (selectAcesso && helpTextAcesso) {
    selectAcesso.addEventListener('change', (e) => {
      const val = e.target.value;
      helpTextAcesso.innerHTML = descricoesAcesso[val] || '';
    });
  }

  function abrirModalNovo() {
    idEdicao = null;
    if (modalTitle) modalTitle.textContent = 'Novo Colaborador / Usuário';
    if (formColaborador) formColaborador.reset();
    if (helpTextAcesso) helpTextAcesso.innerHTML = descricoesAcesso['saude'];
    if (modalColaborador) modalColaborador.classList.add('active');
  }

  function abrirModalEdicao(id) {
    const c = colaboradores.find(item => item.id === id);
    if (!c) return;

    idEdicao = id;
    if (modalTitle) modalTitle.textContent = 'Editar Colaborador';
    
    inputNome.value = c.nome;
    inputEmail.value = c.email;
    selectCargo.value = c.cargo;
    inputRegistro.value = c.registro === 'N/A' ? '' : c.registro;
    selectAcesso.value = c.acesso;
    
    if (helpTextAcesso) helpTextAcesso.innerHTML = descricoesAcesso[c.acesso] || '';

    if (modalColaborador) modalColaborador.classList.add('active');
  }

  if (btnNovoUser) {
    btnNovoUser.addEventListener('click', abrirModalNovo);
  }

  // Fechar Modal Colaborador
  if (modalColaborador) {
    modalColaborador.querySelectorAll('.config-modal-close, .btn-cfg-cancel').forEach(b => {
      b.addEventListener('click', () => modalColaborador.classList.remove('active'));
    });
    modalColaborador.addEventListener('click', (e) => {
      if (e.target === modalColaborador) modalColaborador.classList.remove('active');
    });
  }

  // Salvar Form Colaborador
  if (formColaborador) {
    formColaborador.addEventListener('submit', (e) => {
      e.preventDefault();

      const nome = inputNome.value.trim();
      const email = inputEmail.value.trim();
      const cargo = selectCargo.value;
      const registro = inputRegistro.value.trim() || 'N/A';
      const acesso = selectAcesso.value;

      const cargoMap = {
        fisio: 'Fisioterapeuta',
        fono: 'Fonoaudióloga',
        pilates: 'Instrutor de Pilates',
        recepcao: 'Recepcionista',
        gerencia: 'Gerente / Admin'
      };

      const acessoMap = {
        admin: '👑 Admin (Total)',
        saude: '🩺 Prof. de Saúde',
        recepcao: '🛎️ Recepção'
      };

      // Gerar iniciais
      const partes = nome.split(' ');
      const iniciais = partes.length >= 2
        ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
        : nome.substring(0, 2).toUpperCase();

      if (idEdicao) {
        // Editar
        const item = colaboradores.find(c => c.id === idEdicao);
        if (item) {
          item.nome = nome;
          item.email = email;
          item.cargo = cargo;
          item.cargoLabel = cargoMap[cargo] || cargo;
          item.registro = registro;
          item.acesso = acesso;
          item.acessoLabel = acessoMap[acesso] || acesso;
          item.iniciais = iniciais;
        }
        mostrarToast(`Colaborador ${nome} atualizado com sucesso!`);
      } else {
        // Novo
        const novo = {
          id: Date.now(),
          nome,
          email,
          cargo,
          cargoLabel: cargoMap[cargo] || cargo,
          registro,
          acesso,
          acessoLabel: acessoMap[acesso] || acesso,
          status: 'ativo',
          iniciais
        };
        colaboradores.unshift(novo);
        mostrarToast(`Novo colaborador ${nome} cadastrado com sucesso!`);
      }
      
      ValeStore.saveEquipe(colaboradores);

      atualizarKPIs();
      renderizarTabela(searchInput ? searchInput.value : '');
      modalColaborador.classList.remove('active');
    });
  }

  // ======================================
  // 6. MODAL DE CONFIRMAÇO DE INATIVAÇO
  // ======================================
  const modalConfirm = document.getElementById('modalConfirm');
  const confirmUserName = document.getElementById('confirmUserName');
  const btnConfirmDelete = document.getElementById('btnConfirmDelete');

  function abrirModalConfirmacao(nomeUsuario) {
    if (confirmUserName) confirmUserName.textContent = nomeUsuario;
    if (modalConfirm) modalConfirm.classList.add('active');
  }

  if (modalConfirm) {
    modalConfirm.querySelectorAll('.config-modal-close, .btn-cfg-cancel').forEach(b => {
      b.addEventListener('click', () => modalConfirm.classList.remove('active'));
    });
    modalConfirm.addEventListener('click', (e) => {
      if (e.target === modalConfirm) modalConfirm.classList.remove('active');
    });
  }

  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', () => {
      if (idParaInativar) {
        const item = colaboradores.find(c => c.id === idParaInativar);
        if (item) {
          item.status = 'inativo';
          ValeStore.saveEquipe(colaboradores);
          mostrarToast(`Acesso de ${item.nome} foi inativado.`);
        }
        idParaInativar = null;
        atualizarKPIs();
        renderizarTabela(searchInput ? searchInput.value : '');
      }
      modalConfirm.classList.remove('active');
    });
  }

  // ======================================
  // 7. BUSCA EM TEMPO REAL
  // ======================================
  const searchInput = document.getElementById('cfgSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderizarTabela(e.target.value);
    });
  }

  // ======================================
  // 8. CONTROLES GLOBAIS (Sidebar & Notificações)
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
  // 9. INICIALIZAÇO
  // ======================================
  atualizarKPIs();
  renderizarTabela();

  // Atualiza tela automaticamente quando o Supabase responde
  document.addEventListener('valeclinic:dataSynced', (e) => {
    if (e.detail.table === 'equipe') {
      colaboradores = ValeStore.getEquipe();
      atualizarKPIs();
      renderizarTabela(searchInput ? searchInput.value : '');
    }
  });

});
