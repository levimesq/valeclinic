document.addEventListener('DOMContentLoaded', () => {

  // Inicializa o date picker com a data de hoje
  const todayStr = new Date().toISOString().split('T')[0];
  const agendaDP = document.getElementById('agendaDatePicker');
  if (agendaDP) {
    agendaDP.value = todayStr;
    updateDateDisplay(todayStr);
  }

  function updateDateDisplay(dateStr) {
    const el = document.getElementById('agenda-date-display');
    if (!el || !dateStr) return;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day, 12, 0, 0);
      const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const formatted = d.toLocaleDateString('pt-BR', opts);
      el.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
  }

  // -----------------------------------------------
  // TOAST NOTIFICATION
  // -----------------------------------------------
  function showToast(message, type = 'error') {
    const toast = document.getElementById('toastNotification');
    const msg   = document.getElementById('toastMessage');
    if (!toast || !msg) return;
    msg.textContent = message;
    toast.className = `toast-notification ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 4500);
  }

  // -----------------------------------------------
  // POPULAR DROPDOWNS DE PACIENTES (EXCLUSIVAMENTE ATIVOS)
  // -----------------------------------------------
  function populatePatientSelects() {
    if (typeof ValeStore === 'undefined') return;
    const pacientesAtivos = ValeStore.getPacientesAtivos() || [];

    const newSel  = document.getElementById('newPatient');
    const editSel = document.getElementById('editPatient');

    [newSel, editSel].forEach(sel => {
      if (!sel) return;
      const currVal = sel.value;
      sel.innerHTML = '<option value="">Selecione o paciente cadastrado...</option>';

      if (pacientesAtivos.length === 0) {
        sel.innerHTML = '<option value="">Nenhum paciente ativo cadastrado</option>';
        return;
      }

      pacientesAtivos.forEach(p => {
        const nome = p.name || p.nome || '';
        const tel  = p.phone || p.telefone || '';
        const opt  = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome + (tel ? ` (${tel})` : '');
        sel.appendChild(opt);
      });

      if (currVal) sel.value = currVal;
    });
  }

  populatePatientSelects();

  // -----------------------------------------------
  // MODAL 1: NOVO AGENDAMENTO
  // -----------------------------------------------
  const appointmentModal   = document.getElementById('appointmentModal');
  const newAppointmentForm = document.getElementById('newAppointmentForm');

  function openNewModal() {
    populatePatientSelects();
    newAppointmentForm.reset();
    const dp = document.getElementById('agendaDatePicker');
    const newDateInput = document.getElementById('newDate');
    if (newDateInput) {
      newDateInput.value = dp && dp.value ? dp.value : todayStr;
    }
    appointmentModal.classList.add('active');
  }

  function closeNewModal() {
    appointmentModal.classList.remove('active');
  }

  const openNewBtn = document.getElementById('openNewAppointmentBtn');
  if (openNewBtn) openNewBtn.addEventListener('click', openNewModal);
  const closeNewBtn = document.getElementById('closeNewModalBtn');
  if (closeNewBtn) closeNewBtn.addEventListener('click', closeNewModal);
  const cancelNewBtn = document.getElementById('cancelNewModalBtn');
  if (cancelNewBtn) cancelNewBtn.addEventListener('click', closeNewModal);
  if (appointmentModal) {
    appointmentModal.addEventListener('click', (e) => {
      if (e.target === appointmentModal) closeNewModal();
    });
  }

  // SUBMIT NOVO AGENDAMENTO
  if (newAppointmentForm) {
    newAppointmentForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const paciente      = document.getElementById('newPatient').value;
      const date          = document.getElementById('newDate').value;
      const hora          = document.getElementById('newTime').value;
      const especialidade = document.getElementById('newSpecialty').value;
      const profissional  = document.getElementById('newDoctor').value;

      if (!paciente) {
        showToast('Por favor, selecione um paciente cadastrado.', 'error');
        return;
      }

      // Validação de data: ano menor que 2026 não permitido
      const selectedYear = new Date(date + 'T12:00:00').getFullYear();
      if (!date || isNaN(selectedYear) || selectedYear < 2026) {
        showToast('Erro: A data do agendamento deve ser a partir do ano de 2026.', 'error');
        return;
      }

      // Verificar conflito de horário no mesmo módulo (ignorar cancelados)
      const agendamentos = ValeStore.getAgendamentos() || [];
      const conflito = agendamentos.find(a =>
        a.date === date &&
        (a.hora === hora || a.time === hora) &&
        a.especialidade === especialidade &&
        a.status !== 'Cancelado'
      );

      if (conflito) {
        showToast(`Conflito de Horário: Já existe agendamento de ${especialidade} às ${hora}h com ${conflito.paciente}.`, 'error');
        return;
      }

      // Salvar via ValeStore (Supabase + LocalStorage)
      const newId = 'slot-' + Date.now();
      const novoRegistro = {
        id: newId,
        date: date,
        hora: hora,
        time: hora,
        paciente: paciente,
        especialidade: especialidade,
        profissional: profissional,
        status: 'Aguardando Chegada',
        horarioChegada: null
      };

      ValeStore.addAgendamento(novoRegistro);

      closeNewModal();
      showToast('Agendamento realizado com sucesso!', 'success');

      // Se a data do agendamento for diferente da visualizada, atualizar o datepicker
      const dp = document.getElementById('agendaDatePicker');
      if (dp) {
        dp.value = date;
        updateDateDisplay(date);
      }

      renderTimeline(date);
    });
  }

  // -----------------------------------------------
  // MODAL 2: EDITAR AGENDAMENTO
  // -----------------------------------------------
  let editingSlotId = null;
  const editAppointmentModal = document.getElementById('editAppointmentModal');
  const editAppointmentForm  = document.getElementById('editAppointmentForm');

  function openEditModal(row) {
    if (!row) return;
    editingSlotId = row.dataset.slotId;
    populatePatientSelects();

    const editPat  = document.getElementById('editPatient');
    const editDt   = document.getElementById('editDate');
    const editTm   = document.getElementById('editTime');
    const editSpec = document.getElementById('editSpecialty');
    const editDoc  = document.getElementById('editDoctor');

    if (editPat)  editPat.value  = row.dataset.paciente || row.dataset.patient || '';
    if (editDt)   editDt.value   = row.dataset.date || '';
    if (editTm)   editTm.value   = row.dataset.hora || row.dataset.time || '';
    if (editSpec) editSpec.value = row.dataset.especialidade || row.dataset.specialty || '';
    if (editDoc)  editDoc.value  = row.dataset.profissional || row.dataset.doctor || '';

    editAppointmentModal.classList.add('active');
  }

  function closeEditModal() {
    editAppointmentModal.classList.remove('active');
    editingSlotId = null;
  }

  const closeEditBtn = document.getElementById('closeEditModalBtn');
  if (closeEditBtn) closeEditBtn.addEventListener('click', closeEditModal);
  const cancelEditBtn = document.getElementById('cancelEditModalBtn');
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModal);
  if (editAppointmentModal) {
    editAppointmentModal.addEventListener('click', (e) => {
      if (e.target === editAppointmentModal) closeEditModal();
    });
  }

  if (editAppointmentForm) {
    editAppointmentForm.addEventListener('submit', function(e) {
      e.preventDefault();
      if (!editingSlotId) return;

      const paciente      = document.getElementById('editPatient').value;
      const date          = document.getElementById('editDate').value;
      const hora          = document.getElementById('editTime').value;
      const especialidade = document.getElementById('editSpecialty').value;
      const profissional  = document.getElementById('editDoctor').value;

      const selectedYear = new Date(date + 'T12:00:00').getFullYear();
      if (!date || isNaN(selectedYear) || selectedYear < 2026) {
        showToast('Erro: A data do agendamento deve ser a partir do ano de 2026.', 'error');
        return;
      }

      // Verificar conflito com outros horários
      const agendamentos = ValeStore.getAgendamentos() || [];
      const conflito = agendamentos.find(a =>
        String(a.id) !== String(editingSlotId) &&
        a.date === date &&
        (a.hora === hora || a.time === hora) &&
        a.especialidade === especialidade &&
        a.status !== 'Cancelado'
      );

      if (conflito) {
        showToast(`Conflito de Horário: Já existe agendamento de ${especialidade} às ${hora}h com ${conflito.paciente}.`, 'error');
        return;
      }

      ValeStore.updateAgendamento(editingSlotId, {
        date,
        hora,
        time: hora,
        paciente,
        especialidade,
        profissional
      });

      closeEditModal();
      showToast('Agendamento atualizado com sucesso!', 'success');

      const dp = document.getElementById('agendaDatePicker');
      renderTimeline(dp ? dp.value : date);
    });
  }

  // -----------------------------------------------
  // MODAL JUSTIFICATIVA DE FALTA
  // -----------------------------------------------
  let activeFaltaSlotId = null;
  let activeFaltaPatientName = null;
  let activeFaltaSpecialty = null;
  const modalJustificativa = document.getElementById('modalJustificativa');

  const btnJustSim = document.getElementById('btnJustificativaSim');
  if (btnJustSim) {
    btnJustSim.addEventListener('click', function() {
      if (activeFaltaSlotId) {
        ValeStore.updateAgendamento(activeFaltaSlotId, { status: 'Faltoso (Justificado)' });

        const dateStr = document.getElementById('agendaDatePicker') ? document.getElementById('agendaDatePicker').value : todayStr;
        ValeStore.addFalta({
          id: 'flt-' + Date.now(),
          paciente: activeFaltaPatientName,
          data: dateStr,
          modulo: activeFaltaSpecialty || 'Geral',
          justificada: true,
          justificativa: 'Paciente apresentou justificativa médica/pessoal'
        });

        showToast('Falta registrada com justificativa.', 'success');
        renderTimeline(dateStr);
      }
      if (modalJustificativa) modalJustificativa.classList.remove('active');
      activeFaltaSlotId = null;
    });
  }

  const btnJustNao = document.getElementById('btnJustificativaNao');
  if (btnJustNao) {
    btnJustNao.addEventListener('click', function() {
      if (activeFaltaSlotId) {
        ValeStore.updateAgendamento(activeFaltaSlotId, { status: 'Faltoso (Sem Justificativa)' });

        const dateStr = document.getElementById('agendaDatePicker') ? document.getElementById('agendaDatePicker').value : todayStr;
        ValeStore.addFalta({
          id: 'flt-' + Date.now(),
          paciente: activeFaltaPatientName,
          data: dateStr,
          modulo: activeFaltaSpecialty || 'Geral',
          justificada: false,
          justificativa: 'Sem justificativa informada'
        });

        // Verificar regra estrita de abandono (2 faltas consecutivas)
        const alertas = ValeStore.getAlertasAbandono() || [];
        const pacienteEmRisco = alertas.find(al => al.nome === activeFaltaPatientName);

        if (pacienteEmRisco) {
          showToast(`⚠️ Alerta de Abandono: ${activeFaltaPatientName} faltou a 2 sessões consecutivas sem justificativa!`, 'error');
          const badge = document.querySelector('.notification-badge');
          if (badge) badge.classList.add('active');
        } else {
          showToast('Falta registrada sem justificativa.', 'success');
        }

        renderTimeline(dateStr);
      }
      if (modalJustificativa) modalJustificativa.classList.remove('active');
      activeFaltaSlotId = null;
    });
  }

  if (modalJustificativa) {
    modalJustificativa.addEventListener('click', (e) => {
      if (e.target === modalJustificativa) {
        modalJustificativa.classList.remove('active');
        activeFaltaSlotId = null;
      }
    });
  }

  // -----------------------------------------------
  // HELPER: CARD HTML DA TIMELINE
  // -----------------------------------------------
  function buildCardHTML(id, hora, especialidade, paciente, profissional, status, waHref) {
    const initials = (paciente || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const specClass = (especialidade || '').toLowerCase().includes('pilates') ? 'pilates' :
                      (especialidade || '').toLowerCase().includes('fisio') ? 'fisio' : 'fono';
    const statusId = 'status-' + id;

    let statusClass = 'waiting';
    let statusText  = 'Aguardando Chegada';

    if (status.includes('Presente')) {
      statusClass = 'checked-in';
      statusText = status;
    } else if (status.includes('Faltoso') || status.includes('Ausente') || status.includes('Faltou')) {
      statusClass = 'absent';
      statusText = status;
    }

    const isDone = status.includes('Presente') || status.includes('Faltoso') || status.includes('Ausente') || status.includes('Faltou');

    const buttonsHtml = isDone
      ? `<button type="button" class="btn-checkin done" disabled>${statusText}</button>`
      : `<button type="button" class="btn-checkin btn-do-checkin" data-status-id="${statusId}" data-slot-id="${id}">
           <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Confirmar Chegada
         </button>
         <button type="button" class="btn-faltou btn-do-faltou" data-status-id="${statusId}" data-slot-id="${id}" data-paciente="${paciente}" data-especialidade="${especialidade}">
           Faltou
         </button>`;

    return `
      <div class="timeline-row"
           data-especialidade="${especialidade}"
           data-paciente="${paciente}"
           data-hora="${hora}"
           data-date="${document.getElementById('agendaDatePicker') ? document.getElementById('agendaDatePicker').value : todayStr}"
           data-profissional="${profissional}"
           data-slot-id="${id}">
        <div class="timeline-time-block"><span class="time-display">${hora}</span></div>
        <div class="timeline-dot"></div>
        <article class="timeline-card ${specClass}">
          <div class="card-top-bar">
            <div class="patient-header-group">
              <div class="patient-avatar-badge">${initials}</div>
              <div class="patient-meta-info">
                <h4>${paciente}</h4>
                <p>${especialidade} • Prof. ${profissional}</p>
              </div>
            </div>
            <div class="card-quick-actions">
              <button class="btn-icon-quick btn-edit-appointment" title="Editar Agendamento">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button class="btn-icon-quick cancel btn-cancel-appointment" title="Cancelar Horário">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
              <a href="${waHref}" target="_blank" class="btn-icon-quick whatsapp" title="WhatsApp">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" width="16" height="16"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
              </a>
            </div>
          </div>
          <div class="card-bottom-bar">
            <span class="slot-status ${statusClass}" id="${statusId}">${statusText}</span>
            <div style="display: flex; gap: 8px;">
              ${buttonsHtml}
            </div>
          </div>
        </article>
      </div>`;
  }

  // -----------------------------------------------
  // RENDER DA GRADE DA AGENDA
  // -----------------------------------------------
  function renderTimeline(selectedDate) {
    const scheduleList = document.getElementById('scheduleList');
    if (!scheduleList) return;

    const currentFilter = document.getElementById('specialtyFilter') ? document.getElementById('specialtyFilter').value : 'Todos';
    const allAgendamentos = ValeStore.getAgendamentos() || [];

    // Filtrar por data e excluir cancelados/inválidos
    let filtrados = allAgendamentos.filter(a => a.date === selectedDate && a.status !== 'Cancelado');

    // Filtrar por especialidade se não for 'Todos'
    if (currentFilter !== 'Todos') {
      filtrados = filtrados.filter(a => a.especialidade === currentFilter);
    }

    scheduleList.innerHTML = '';

    if (filtrados.length === 0) {
      scheduleList.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--color-text-muted); background: var(--color-card-bg); border-radius: var(--radius-card); border: 1px dashed var(--color-border-input); width: 100%;">
          <h4>Nenhum agendamento para este dia</h4>
          <p style="font-size: 0.85rem; margin-top: 6px;">Clique em "NOVO AGENDAMENTO" para marcar uma consulta.</p>
        </div>
      `;
      return;
    }

    // Ordenar por hora
    filtrados.sort((a, b) => (a.hora || a.time || '').localeCompare(b.hora || b.time || ''));

    const pacientes = ValeStore.getPacientes() || [];

    filtrados.forEach(a => {
      const hora = a.hora || a.time || '08:00';
      const paciente = a.paciente || '';
      const especialidade = a.especialidade || 'Pilates Studio';
      const profissional = a.profissional || 'Dra. Leonarda Vale';
      const status = a.status || 'Aguardando Chegada';

      // Link do WhatsApp
      const pacObj = pacientes.find(p => (p.name || p.nome) === paciente);
      const tel = pacObj && (pacObj.phone || pacObj.telefone) ? (pacObj.phone || pacObj.telefone).replace(/\D/g, '') : '';
      const waHref = tel ? `https://wa.me/55${tel}` : '#';

      const rowHTML = buildCardHTML(a.id, hora, especialidade, paciente, profissional, status, waHref);
      scheduleList.insertAdjacentHTML('beforeend', rowHTML);
    });
  }

  // -----------------------------------------------
  // DELEGAÇÃO DE EVENTOS NA GRADE
  // -----------------------------------------------
  const scheduleList = document.getElementById('scheduleList');
  if (scheduleList) {
    scheduleList.addEventListener('click', function(e) {

      // Botão Confirmar Chegada
      const checkinBtn = e.target.closest('.btn-do-checkin');
      if (checkinBtn) {
        const slotId = checkinBtn.dataset.slotId;
        const now = new Date();
        const hh  = String(now.getHours()).padStart(2, '0');
        const mm  = String(now.getMinutes()).padStart(2, '0');
        const newStatus = `Presente (${hh}:${mm}h)`;

        ValeStore.updateAgendamento(slotId, { status: newStatus, horarioChegada: `${hh}:${mm}` });
        showToast('Presença do paciente confirmada no sistema!', 'success');

        const dp = document.getElementById('agendaDatePicker');
        renderTimeline(dp ? dp.value : todayStr);
        return;
      }

      // Botão Faltou
      const faltouBtn = e.target.closest('.btn-do-faltou');
      if (faltouBtn) {
        activeFaltaSlotId = faltouBtn.dataset.slotId;
        activeFaltaPatientName = faltouBtn.dataset.paciente;
        activeFaltaSpecialty = faltouBtn.dataset.especialidade;
        if (modalJustificativa) modalJustificativa.classList.add('active');
        return;
      }

      // Botão Cancelar / Excluir Horário (DELETE no Supabase e em cascata)
      const cancelBtn = e.target.closest('.btn-cancel-appointment');
      if (cancelBtn) {
        const row = cancelBtn.closest('.timeline-row');
        if (row) {
          const slotId = row.dataset.slotId;
          const paciente = row.dataset.paciente || 'este paciente';
          if (confirm(`Deseja realmente excluir o agendamento de ${paciente}? O registro será apagado do Supabase e o horário liberado em todos os módulos.`)) {
            ValeStore.deleteAgendamento(slotId);
            showToast('Agendamento excluído do sistema! Horário liberado.', 'success');

            const dp = document.getElementById('agendaDatePicker');
            renderTimeline(dp ? dp.value : todayStr);
          }
        }
        return;
      }

      // Botão Editar Agendamento
      const editBtn = e.target.closest('.btn-edit-appointment');
      if (editBtn) {
        const row = editBtn.closest('.timeline-row');
        openEditModal(row);
        return;
      }
    });
  }

  // Filtro de especialidade
  const specFilter = document.getElementById('specialtyFilter');
  if (specFilter) {
    specFilter.addEventListener('change', () => {
      const dp = document.getElementById('agendaDatePicker');
      renderTimeline(dp ? dp.value : todayStr);
    });
  }

  // Date picker listener com validação de ano
  if (agendaDP) {
    agendaDP.addEventListener('change', function() {
      const selDate = this.value;
      const selYear = new Date(selDate + 'T12:00:00').getFullYear();
      if (isNaN(selYear) || selYear < 2026) {
        showToast('Erro: O ano selecionado não pode ser menor que 2026.', 'error');
        this.value = todayStr;
        updateDateDisplay(todayStr);
        renderTimeline(todayStr);
        return;
      }
      updateDateDisplay(selDate);
      renderTimeline(selDate);
    });
  }

  // Sincronização inicial ativa com o Supabase
  if (typeof ValeStore !== 'undefined' && ValeStore.syncAgendamentos) {
    ValeStore.syncAgendamentos().then(() => {
      populatePatientSelects();
      renderTimeline(agendaDP ? agendaDP.value : todayStr);
    });
  } else {
    renderTimeline(agendaDP ? agendaDP.value : todayStr);
  }

  // -----------------------------------------------
  // SININHO DE NOTIFICAÇÕES & MENU MOBILE
  // -----------------------------------------------
  const bellBtn   = document.getElementById('bellBtn');
  const notifPop  = document.getElementById('notificationsPopover');

  if (bellBtn && notifPop) {
    bellBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      const isVisible = notifPop.style.display === 'block';
      if (!isVisible) {
        const rect = bellBtn.getBoundingClientRect();
        notifPop.style.top  = (rect.bottom + 10) + 'px';
        notifPop.style.right = (window.innerWidth - rect.right) + 'px';
      }
      notifPop.style.display = isVisible ? 'none' : 'block';
    });

    document.addEventListener('click', function(e) {
      if (!notifPop.contains(e.target) && !bellBtn.contains(e.target)) {
        notifPop.style.display = 'none';
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

  // Atualização automática quando Supabase sincronizar
  document.addEventListener('valeclinic:dataSynced', (e) => {
    populatePatientSelects();
    const dp = document.getElementById('agendaDatePicker');
    renderTimeline(dp ? dp.value : todayStr);
  });

});