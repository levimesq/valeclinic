/* ==========================================
   ValeClinic - Sistema de Permissões RBAC
   Controle Dinmico de Acesso, Perfis e Logout Real
   ========================================== */

const ValePermissions = (() => {

  const ROLES = {
    ADMIN: {
      id: 'admin',
      label: '👑 Admin (Dra. Leonarda)',
      user: 'Dra. Leonarda Vale',
      userRole: 'Diretora Clínica',
      allowedPages: ['dashboard', 'pacientes', 'agenda', 'fisio', 'pilates', 'fono', 'psicopedagogia', 'financeiro', 'financeiro-config', 'configuracoes', 'dashboard.html', 'pacientes.html', 'agenda.html', 'fisio.html', 'pilates.html', 'fono.html', 'psicopedagogia.html', 'financeiro.html', 'financeiro-config.html', 'configuracoes.html'],
      defaultPage: 'dashboard.html'
    },
    RECEPCAO: {
      id: 'recepcao',
      label: '🛎️ Recepção (Leiriane / Fernanda)',
      user: 'Leiriane / Fernanda',
      userRole: 'Recepção & Atendimento',
      allowedPages: ['dashboard', 'pacientes', 'agenda', 'fisio', 'pilates', 'fono', 'psicopedagogia', 'financeiro-config', 'dashboard.html', 'pacientes.html', 'agenda.html', 'fisio.html', 'pilates.html', 'fono.html', 'psicopedagogia.html', 'financeiro-config.html'],
      defaultPage: 'dashboard.html'
    },
    PSICO: {
      id: 'psico',
      label: '🧠 Psicopedagoga (Dra. Cleópatra)',
      user: 'Dra. Cleópatra',
      userRole: 'Psicopedagoga / Neuropsicopedagoga',
      allowedPages: ['dashboard', 'agenda', 'psicopedagogia', 'dashboard.html', 'agenda.html', 'psicopedagogia.html'],
      defaultPage: 'psicopedagogia.html'
    },
    FONO: {
      id: 'fono',
      label: '🩺 Fonoaudiólogo (Dr. Jorge Linhares)',
      user: 'Dr. Jorge Linhares',
      userRole: 'Fonoaudiólogo',
      allowedPages: ['dashboard', 'agenda', 'fono', 'dashboard.html', 'agenda.html', 'fono.html'],
      defaultPage: 'fono.html'
    },
    PILATES: {
      id: 'pilates',
      label: '🧘 Pilates (Dra. Katiane / Dra. Mirela)',
      user: 'Dra. Katiane',
      userRole: 'Instrutora de Pilates',
      allowedPages: ['dashboard', 'agenda', 'pilates', 'dashboard.html', 'agenda.html', 'pilates.html'],
      defaultPage: 'pilates.html'
    },
    FISIO: {
      id: 'fisio',
      label: '💆 Fisioterapeuta (Dr. Lucas Andrade)',
      user: 'Dr. Lucas Andrade',
      userRole: 'Fisioterapeuta',
      allowedPages: ['dashboard', 'agenda', 'fisio', 'dashboard.html', 'agenda.html', 'fisio.html'],
      defaultPage: 'fisio.html'
    }
  };

  function getActiveRoleId() {
    return localStorage.getItem('valeclinic_active_role') || 'admin';
  }

  function setActiveRoleId(roleId) {
    localStorage.setItem('valeclinic_active_role', roleId);
  }

  function getActiveRoleConfig() {
    const id = getActiveRoleId();
    const roleConfig = ROLES[id.toUpperCase()] || ROLES.ADMIN;
    
    // Sobrescreve o nome se houver usuário salvo no localStorage
    const savedName = localStorage.getItem('valeclinic_user_name');
    if (savedName) {
      return { ...roleConfig, user: savedName };
    }
    return roleConfig;
  }

  // Obter nome da página atual (normalizado sem .html)
  function getCurrentPageName() {
    const path = window.location.pathname;
    let page = path.substring(path.lastIndexOf('/') + 1);
    page = page.replace(/\.html$/, '');
    return page || 'index';
  }

  // Guard de Navegação (Verifica se está logado e se tem permissão)
  function checkPageAccess() {
    const currentPage = getCurrentPageName();

    // Se estiver na tela de login, ignora verificação
    if (currentPage === 'index' || currentPage === '' || currentPage === '/') return;

    // Se não houver e-mail/sessão salva, obriga a fazer login
    const userEmail = localStorage.getItem('valeclinic_user_email');
    const activeRole = localStorage.getItem('valeclinic_active_role');
    if (!userEmail && !activeRole) {
      window.location.href = '/';
      return;
    }

    const roleConfig = getActiveRoleConfig();
    const isAllowed = roleConfig.allowedPages.includes(currentPage);

    if (!isAllowed) {
      alert(`⚠️ Acesso Restrito!\n\nO perfil "${roleConfig.label}" não possui acesso à tela "${currentPage}". Redirecionando para sua página inicial.`);
      window.location.href = roleConfig.defaultPage;
    }
  }

  // Atualiza a Sidebar mostrando apenas os links permitidos
  function updateSidebarNavigation() {
    const roleConfig = getActiveRoleConfig();
    const navItems = document.querySelectorAll('.sidebar-nav .nav-list .nav-item');

    navItems.forEach(item => {
      const link = item.querySelector('a');
      if (!link) return;
      
      const href = link.getAttribute('href');
      if (!href || href === '#' || href === '/' || href === 'index' || href === 'index.html') return;

      const pageName = href.substring(href.lastIndexOf('/') + 1).replace(/\.html$/, '');
      if (roleConfig.allowedPages.includes(pageName)) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  }

  // Restrição do Financeiro no Dashboard (Esconde métricas financeiras se não for Admin)
  function restrictDashboardFinancials() {
    const currentPage = getCurrentPageName();
    if (currentPage !== 'dashboard') return;

    const roleId = getActiveRoleId();
    const isMasterAdmin = (roleId === 'admin');

    // Procura cards com R$ ou faturamento no dashboard
    const kpiCards = document.querySelectorAll('.kpi-card');
    kpiCards.forEach(card => {
      const titleEl = card.querySelector('h3, h4, p, span');
      const text = card.textContent || '';
      if (text.includes('Faturamento') || text.includes('FATURAMENTO') || text.includes('R$')) {
        card.style.display = isMasterAdmin ? '' : 'none';
      }
    });
  }

  // Atualiza as informações do usuário no Header Superior + Botão de Logout
  function updateHeaderUserProfile() {
    const roleConfig = getActiveRoleConfig();

    const userNameEl = document.querySelector('.user-info .user-name');
    const userRoleEl = document.querySelector('.user-info .user-role');

    if (userNameEl) userNameEl.textContent = roleConfig.user;
    if (userRoleEl) userRoleEl.textContent = roleConfig.userRole;

    injectQuickRoleSelector(roleConfig);
    injectLogoutButton();
  }

  // Injeta Botão de Logout no Header
  function injectLogoutButton() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions || document.getElementById('btnLogoutHeader')) return;

    const btnLogout = document.createElement('button');
    btnLogout.id = 'btnLogoutHeader';
    btnLogout.title = 'Sair do Sistema';
    btnLogout.style.cssText = `
      display: flex; align-items: center; justify-content: center;
      width: 38px; height: 38px; border-radius: 50%;
      background: var(--color-bg-page, #F8FAFC);
      border: 1px solid var(--color-border-input, #E2E8F0);
      color: #EF4444; cursor: pointer; transition: all 0.2s ease;
      margin-left: 8px;
    `;
    btnLogout.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`;

    btnLogout.addEventListener('mouseenter', () => {
      btnLogout.style.background = '#FEF2F2';
      btnLogout.style.borderColor = '#FCA5A5';
    });
    btnLogout.addEventListener('mouseleave', () => {
      btnLogout.style.background = 'var(--color-bg-page, #F8FAFC)';
      btnLogout.style.borderColor = 'var(--color-border-input, #E2E8F0)';
    });

    btnLogout.addEventListener('click', async () => {
      if (confirm('Deseja realmente sair do ValeClinic?')) {
        localStorage.removeItem('valeclinic_active_role');
        localStorage.removeItem('valeclinic_user_email');
        localStorage.removeItem('valeclinic_user_name');
        try {
          const db = window.supabase ? window.supabase.createClient(
            'https://nzlwmlieznykmlkcfmsp.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56bHdtbGllem55a21sa2NmbXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNjExODUsImV4cCI6MjEwMDkzNzE4NX0.SumL1Iu4G9Y1pNb0nsqirC1CqJs8x2gtqke_pFvQhJM'
          ) : null;
          if (db) await db.auth.signOut();
        } catch (e) {}
        window.location.href = '/';
      }
    });

    headerActions.appendChild(btnLogout);
  }

  // Exibe a Badge Fixa do Perfil no Header (Sem permissão de alterar de conta pelo header)
  function injectQuickRoleSelector(currentRoleConfig) {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    // Se já existir a badge antiga/dropdown, remove
    const existingWrapper = headerActions.querySelector('.quick-role-wrapper');
    if (existingWrapper) existingWrapper.remove();

    const wrapper = document.createElement('div');
    wrapper.className = 'quick-role-wrapper';
    wrapper.style.cssText = `
      display: flex; align-items: center; gap: 6px;
      background: rgba(197, 160, 89, 0.12);
      border: 1px solid rgba(197, 160, 89, 0.35);
      border-radius: 20px; padding: 6px 14px;
      margin-right: 8px; font-family: var(--font-body);
      font-size: 0.8rem; font-weight: 700; color: var(--color-primary);
      user-select: none;
    `;

    wrapper.textContent = currentRoleConfig.label;
    headerActions.insertBefore(wrapper, headerActions.firstChild);
  }


  // Inicialização Automática ao carregar o script
  document.addEventListener('DOMContentLoaded', () => {
    checkPageAccess();
    updateSidebarNavigation();
    updateHeaderUserProfile();
    restrictDashboardFinancials();
  });

  return {
    getActiveRole: getActiveRoleConfig,
    setActiveRole: setActiveRoleId,
    checkAccess: checkPageAccess
  };

})();
