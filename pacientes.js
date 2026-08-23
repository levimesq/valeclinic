document.addEventListener('DOMContentLoaded', () => {
    const openModalBtn = document.getElementById('openModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const patientModal = document.getElementById('patientModal');
    const modalTitle = document.getElementById('modalTitle');
    const saveModalBtn = document.getElementById('saveModalBtn');
    const searchInput = document.getElementById('searchInput');
    const patientsTable = document.getElementById('patientsTable');

    // Elementos do formulário do modal
    const fullNameInput = document.getElementById('fullName');
    const birthDateInput = document.getElementById('birthDate');
    const phoneInput = document.getElementById('phone');
    const notesInput = document.getElementById('notes');

    // Elementos de Notificação
    const btnNotification = document.querySelector('.btn-notification');
    const notificationsPopover = document.getElementById('notificationsPopover');

    function updatePatientCounter() {
      const tbody = patientsTable ? patientsTable.querySelector('tbody') : null;
      const counterEl = document.getElementById('patientCounter');
      if (!counterEl || !tbody) return;
      const count = tbody.querySelectorAll('tr:not([style*="display: none"])').length;
      counterEl.textContent = 'Total de ' + count + ' paciente(s) cadastrado(s)';
    }

    // Máscara automática DD/MM/YYYY para o campo de nascimento
    if (birthDateInput) {
      birthDateInput.setAttribute('type', 'text');
      birthDateInput.setAttribute('inputmode', 'numeric');
      birthDateInput.setAttribute('placeholder', 'DD/MM/AAAA');
      birthDateInput.setAttribute('maxlength', '10');
      birthDateInput.addEventListener('input', function() {
        let v = this.value.replace(/\D/g, '');
        if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2);
        if (v.length >= 6) v = v.slice(0,5) + '/' + v.slice(5,9);
        this.value = v;
      });
    }

    function openNewModal() {
      modalTitle.textContent = 'Cadastrar Novo Paciente';
      saveModalBtn.textContent = 'Salvar Paciente';
      document.getElementById('newPatientForm').reset();
      patientModal.classList.add('active');
    }

    function openEditModal(tr) {
      modalTitle.textContent = 'Editar Cadastro de Paciente';
      saveModalBtn.textContent = 'Atualizar Paciente';

      fullNameInput.value = tr.dataset.name || '';
      phoneInput.value = tr.dataset.phone || '';
      birthDateInput.value = tr.dataset.birth || '';
      notesInput.value = tr.dataset.notes || '';

      patientModal.classList.add('active');
    }

    function closeModal() {
      patientModal.classList.remove('active');
    }

    if (openModalBtn) openModalBtn.addEventListener('click', openNewModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

    patientModal.addEventListener('click', (e) => {
      if (e.target === patientModal) closeModal();
    });

    // Submeter Cadastro / Edição de Paciente
    const newPatientForm = document.getElementById('newPatientForm');
    if (newPatientForm) {
      newPatientForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = fullNameInput ? fullNameInput.value.trim() : '';
        const phoneVal = phoneInput ? phoneInput.value.trim() : '';

        if (!name) return;

        if (typeof ValeStore !== 'undefined') {
          ValeStore.addPaciente({
            id: 'pac-' + Date.now(),
            name: name,
            phone: phoneVal,
            birth: birthDateInput ? birthDateInput.value : '',
            notes: notesInput ? notesInput.value : ''
          });
          updatePatientCounter();
        }

        const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
        const tbody = patientsTable ? patientsTable.querySelector('tbody') : null;

        if (tbody) {
          const newRow = document.createElement('tr');
          newRow.dataset.name = name;
          newRow.dataset.phone = phoneVal;
          newRow.dataset.notes = notesInput ? notesInput.value : '';

          newRow.innerHTML = `
            <td>
              <div class="patient-profile-cell">
                <div class="patient-avatar-lg">${initials}</div>
                <div class="patient-details-text">
                  <span class="patient-name-title">${name}</span>
                  <span class="patient-cpf-subtext">${phoneVal || 'Sem telefone'}</span>
                </div>
              </div>
            </td>
            <td class="contact-text">${phoneVal || 'N/A'}</td>
            <td><span class="specialty-badge">Novo Paciente</span></td>
            <td><span class="status-badge active">Ativo</span></td>
            <td>
              <div class="action-buttons-group" style="justify-content: flex-end;">
                <button class="btn-action-icon btn-history-patient" title="Histórico de Prontuário">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </button>
                <button class="btn-action-icon btn-edit-patient" title="Editar Cadastro">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <a href="https://wa.me/55${phoneVal.replace(/\D/g, '')}" target="_blank" class="btn-whatsapp-sm" title="WhatsApp">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" width="16" height="16" style="margin-right:4px;"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
                </a>
              </div>
            </td>
          `;

          newRow.querySelector('.btn-edit-patient').addEventListener('click', () => openEditModal(newRow));
          newRow.querySelector('.btn-history-patient').addEventListener('click', () => openHistoryModal(newRow));
          tbody.insertBefore(newRow, tbody.firstChild);
          updatePatientCounter();
        }

        alert(`✅ Paciente ${name} cadastrado com sucesso!`);
        closeModal();
      });
    }

    // Eventos de clique nos botões de Editar Cadastro
    document.querySelectorAll('.btn-edit-patient').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tr = e.target.closest('tr');
        if (tr) openEditModal(tr);
      });
    });

    // LÓGICA DO SININHO DE NOTIFICAÇO (posição calculada dinamicamente)
    if (btnNotification && notificationsPopover) {
      btnNotification.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = notificationsPopover.style.display === 'block';
        if (!isVisible) {
          const rect = btnNotification.getBoundingClientRect();
          notificationsPopover.style.top  = (rect.bottom + 10) + 'px';
          notificationsPopover.style.right = (window.innerWidth - rect.right) + 'px';
        }
        notificationsPopover.style.display = isVisible ? 'none' : 'block';
      });

      document.addEventListener('click', (e) => {
        if (!notificationsPopover.contains(e.target) && !btnNotification.contains(e.target)) {
          notificationsPopover.style.display = 'none';
        }
      });
    }

    // LÓGICA DE PESQUISA RÁPIDA EM TEMPO REAL (Nome, CPF ou Telefone)
    if (searchInput && patientsTable) {
      searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        const rows = patientsTable.querySelectorAll('tbody tr');

        rows.forEach(row => {
          // Search smarter using data attributes or textContent
          const name = (row.dataset.name || '').toLowerCase();
          const phone = (row.dataset.phone || '').toLowerCase();
          const notes = (row.dataset.notes || '').toLowerCase();
          const text = row.textContent.toLowerCase();
          
          if (name.includes(query) || phone.includes(query) || notes.includes(query) || text.includes(query)) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      });
    }

    // Lógica para abrir/fechar Sidebar no Mobile
    const btnHamburger = document.getElementById('btnHamburger');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (btnHamburger && sidebar && sidebarOverlay) {
      function toggleSidebar() {
        // Previne conflito com o modal aberto
        if (patientModal && patientModal.classList.contains('active')) {
          closeModal();
          return;
        }
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('active');
        document.body.classList.toggle('sidebar-open');
      }
      
      btnHamburger.addEventListener('click', toggleSidebar);
      sidebarOverlay.addEventListener('click', toggleSidebar);
    }
});

// Tornar a função acessível globalmente
window.openHistoryModal = async function(tr) {
  const modal = document.getElementById('modalHistoricoProntuario');
  if (!modal) return;
  
  const nome = tr.dataset.name || 'Paciente';
  document.getElementById('histPatientName').textContent = nome;
  
  const timeline = document.getElementById('histTimeline');
  timeline.innerHTML = '<div style="padding: 20px; text-align: center;">Carregando histórico do Supabase...</div>';
  modal.classList.add('active');

  try {
    const db = window.supabase?.createClient('https://nzlwmlieznykmlkcfmsp.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56bHdtbGllem55a21sa2NmbXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNjExODUsImV4cCI6MjEwMDkzNzE4NX0.SumL1Iu4G9Y1pNb0nsqirC1CqJs8x2gtqke_pFvQhJM');
    if (!db) throw new Error('Supabase Client indisponível');
    
    const { data, error } = await db.from('evolucoes').select('*').eq('paciente', nome).order('data', { ascending: false });
    if (error) throw error;

    if (!data || data.length === 0) {
      timeline.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--color-text-muted);">Nenhuma evolução encontrada para este paciente.</div>';
      return;
    }

    timeline.innerHTML = '';
    data.forEach(ev => {
      timeline.innerHTML += `
        <div style="border-left: 2px solid var(--color-primary); padding-left: 16px; margin-bottom: 20px; position: relative;">
          <div style="position: absolute; left: -6px; top: 0; width: 10px; height: 10px; border-radius: 50%; background: var(--color-primary);"></div>
          <div style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 4px;">${ev.data} - Módulo: ${ev.modulo || 'Geral'}</div>
          <div style="font-size: 0.95rem; font-weight: 500; margin-bottom: 6px;">${ev.procedimentos || 'Sem descrição'}</div>
          ${ev.dor ? `<div style="font-size: 0.8rem; background: #fee2e2; color: #991b1b; display: inline-block; padding: 2px 8px; border-radius: 4px;">Dor: ${ev.dor}</div>` : ''}
        </div>
      `;
    });
  } catch (err) {
    timeline.innerHTML = '<div style="padding: 20px; text-align: center; color: #991b1b;">Erro ao carregar histórico: ' + err.message + '</div>';
  }
};