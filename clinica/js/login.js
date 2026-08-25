/* ==========================================
   ValeClinic - Lógica de Autenticação Real
   Integração Supabase Auth + RBAC Profile
   ========================================== */

document.addEventListener('DOMContentLoaded', async () => {

  const loginForm         = document.getElementById('loginForm');
  const emailInput        = document.getElementById('email');
  const passwordInput     = document.getElementById('password');
  const btnSubmit         = document.getElementById('btnSubmit');
  const btnText           = document.getElementById('btnText');
  const loginError        = document.getElementById('loginError');
  const loginErrorText    = document.getElementById('loginErrorText');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const eyeIcon           = document.getElementById('eyeIcon');

  // 1. Alternar Visibilidade da Senha
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      eyeIcon.innerHTML = isPassword
        ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>'
        : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
    });
  }

  // Helper para exibir erro
  function showError(message) {
    if (loginError && loginErrorText) {
      loginErrorText.textContent = message;
      loginError.style.display = 'flex';
    }
  }

  function hideError() {
    if (loginError) loginError.style.display = 'none';
  }

  // Helper para estado de carregamento
  function setLoading(isLoading) {
    if (!btnSubmit || !btnText) return;
    if (isLoading) {
      btnSubmit.classList.add('loading');
      btnText.textContent = 'ENTRANDO...';
    } else {
      btnSubmit.classList.remove('loading');
      btnText.textContent = 'ENTRAR';
    }
  }

  // 2. Mapeamento do E-mail/Perfil para a função no sistema (RBAC)
  async function setupUserProfile(userEmail) {
    // Força atualização da equipe base para garantir e-mails corretos
    localStorage.setItem('valeclinic_equipe', JSON.stringify(ValeStore.getEquipe()));
    const equipe = ValeStore.getEquipe();
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    
    // Procura na equipe pelo e-mail exato ou contido
    let membro = equipe.find(e => cleanEmail.includes((e.email || '').toLowerCase()) || (e.email || '').toLowerCase().includes(cleanEmail));

    let activeRole = 'admin';
    let userName = 'Usuário ValeClinic';

    if (cleanEmail.includes('recep') || (membro && membro.acesso === 'recepcao')) {
      activeRole = 'recepcao';
      userName = membro ? membro.nome : 'Leiriane / Fernanda (Recepção)';
    } else if (cleanEmail.includes('fono') || (membro && membro.cargo === 'fono')) {
      activeRole = 'fono';
      userName = membro ? membro.nome : 'Dr. Jorge Linhares (Fono)';
    } else if (cleanEmail.includes('pilates') || (membro && membro.cargo === 'pilates')) {
      activeRole = 'pilates';
      userName = membro ? membro.nome : 'Dra. Katiane (Pilates)';
    } else if (cleanEmail.includes('fisio') || (membro && membro.cargo === 'fisio')) {
      activeRole = 'fisio';
      userName = membro ? membro.nome : 'Dr. Lucas Andrade (Fisio)';
    } else if (cleanEmail.includes('admin') || cleanEmail.includes('leonarda') || (membro && membro.acesso === 'admin')) {
      activeRole = 'admin';
      userName = membro ? membro.nome : 'Dra. Leonarda Vale (Diretora)';
    }

    localStorage.setItem('valeclinic_active_role', activeRole);
    localStorage.setItem('valeclinic_user_email', cleanEmail);
    localStorage.setItem('valeclinic_user_name', userName);
  }

  // 3. Submeter Login por E-mail e Senha
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value.trim() : '';

      if (!email || !password) {
        showError('Por favor, preencha o e-mail e a senha.');
        return;
      }

      setLoading(true);

      try {
        const supabase = window.supabase ? window.supabase.createClient(
          'https://nzlwmlieznykmlkcfmsp.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56bHdtbGllem55a21sa2NmbXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNjExODUsImV4cCI6MjEwMDkzNzE4NX0.SumL1Iu4G9Y1pNb0nsqirC1CqJs8x2gtqke_pFvQhJM'
        ) : null;

        if (!supabase) {
          throw new Error('Supabase nao inicializado.');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (error) {
          console.warn('[Login Error]', error);
          if (error.message.includes('Email not confirmed')) {
            showError('O e-mail ainda não foi confirmado no Supabase. Desative a confirmação no Supabase.');
          } else if (error.message.includes('Invalid login credentials')) {
            showError('E-mail ou senha incorretos (ou e-mail pendente de confirmação no Supabase).');
          } else {
            showError(error.message || 'Erro ao realizar login. Tente novamente.');
          }
          setLoading(false);
          return;
        }

        // Login Bem-sucedido
        await setupUserProfile(data.user ? data.user.email : email);
        const role = localStorage.getItem('valeclinic_active_role') || 'admin';
        const defaultPages = {
          admin: 'dashboard.html',
          recepcao: 'dashboard.html',
          fono: 'fono.html',
          pilates: 'pilates.html',
          fisio: 'fisio.html'
        };
        window.location.href = defaultPages[role] || 'dashboard.html';

      } catch (err) {
        console.error('[Login Catch]', err);
        showError('Falha ao conectar com o servidor. Tente novamente.');
        setLoading(false);
      }
    });
  }

});
