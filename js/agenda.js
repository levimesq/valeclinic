/* ==========================================
   ValeClinic - Gestão da Agenda e Recepção
   Sincronização com Catálogo de Planos e Profissionais Oficiais
   Versão 5.0 - Produção
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {

  // Inicializa o date picker com a data de hoje (fuso local seguro)
  const todayStr = (typeof ValeStore !== 'undefined' && ValeStore.getTodayDate) ? ValeStore.getTodayDate() : new Date().toLocaleDateString('en-CA');
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

  function formatarMoeda(num) {
    const n = parseFloat(num) || 0;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatarDataBR(dateStr) {
    if (!dateStr) return '';
    if (dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  }

  // -----------------------------------------------
  // POPULAR DROPDOWNS DE PACIENTES
  // -----------------------------------------------
  function populatePatientSelects() {
    if (typeof ValeStore === 'undefined') return;
    const pacientesAtivos = ValeStore.getPacientesAtivos() || [];

    const datalist = document.getElementById('pacientesDatalist');
    if (datalist) {
      datalist.innerHTML = '';
      pacientesAtivos.forEach(p => {
        const nome = p.name || p.nome || '';
        const tel  = p.phone || p.telefone || '';
        const opt  = document.createElement('option');
        opt.value = nome;
        if (tel) opt.label = `${nome} (${tel})`;
        datalist.appendChild(opt);
      });
    }

    const newSel  = document.getElementById('newPatient');
    const editSel = document.getElementById('editPatient');

    [newSel, editSel].forEach(sel => {
      if (!sel || sel.tagName !== 'SELECT') return;
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

  // -----------------------------------------------
  // POPULAR DROPDOWNS DE PLANOS / SERVIÇOS (Supabase)
  // -----------------------------------------------
  function populatePlanSelects(specialty, targetSelectId = 'newPlanService', currentVal = '') {
    if (typeof ValeStore === 'undefined') return;
    const planos = ValeStore.getPlanosServicos() || [];
    const sel = document.getElementById(targetSelectId);
    if (!sel) return;

    sel.innerHTML = '<option value="">Selecione o plano ou serviço...</option>';

    if (planos.length === 0) {
      sel.innerHTML = '<option value="">Nenhum plano cadastrado</option>';
      return;
    }

    // Filtragem inteligente por especialidade (se houver correspondência)
    const specLower = (specialty || '').toLowerCase();
    let filtrados = planos;
    if (specLower.includes('pilates')) {
      const match = planos.filter(p => (p.nome_servico || '').toLowerCase().includes('pilates'));
      if (match.length > 0) filtrados = match;
    } else if (specLower.includes('fisio')) {
      const match = planos.filter(p => (p.nome_servico || '').toLowerCase().includes('fisio'));
      if (match.length > 0) filtrados = match;
    } else if (specLower.includes('fono')) {
      const match = planos.filter(p => (p.nome_servico || '').toLowerCase().includes('fono'));
      if (match.length > 0) filtrados = match;
    } else if (specLower.includes('psico') || specLower.includes('neuro')) {
      const match = planos.filter(p => {
        const n = (p.nome_servico || '').toLowerCase();
        return n.includes('psico') || n.includes('neuro');
      });
      if (match.length > 0) filtrados = match;
    }

    filtrados.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      const sessoesText = p.quantidade_sessoes > 1 ? ` (${p.quantidade_sessoes}x)` : ' (Avulso)';
      opt.textContent = `${p.nome_servico}${sessoesText} - ${formatarMoeda(p.valor_total)}`;
      opt.dataset.nome = p.nome_servico;
      opt.dataset.valorTotal = p.valor_total || 0;
      opt.dataset.valorClinica = p.valor_clinica || 0;
      opt.dataset.sessoes = p.quantidade_sessoes || 1;
      sel.appendChild(opt);
    });

    if (currentVal) sel.value = currentVal;
  }

  // -----------------------------------------------
  // POPULAR DROPDOWNS DE PROFISSIONAIS POR ESPECIALIDADE
  // -----------------------------------------------
  function populateDoctorSelects(specialty, targetSelectId = 'newDoctor', currentVal = '') {
    if (typeof ValeStore === 'undefined') return;
    const profs = ValeStore.getProfissionaisPorEspecialidade(specialty);
    const sel = document.getElementById(targetSelectId);
    if (!sel) return;

    sel.innerHTML = '';
    profs.forEach(prof => {
      const opt = document.createElement('option');
      opt.value = prof;
      opt.textContent = prof;
      sel.appendChild(opt);
    });

    if (currentVal && profs.includes(currentVal)) {
      sel.value = currentVal;
    } else if (profs.length > 0) {
      sel.value = profs[0];
    }
  }

  // -----------------------------------------------
  // PREVIEW DE VALORES DO PLANO SELECIONADO
  // -----------------------------------------------
  function updatePlanPricePreview(selectId, previewBoxId, totalId, clinicaId, repasseId) {
    const sel = document.getElementById(selectId);
    const box = document.getElementById(previewBoxId);
    const elTot = document.getElementById(totalId);
    const elCli = document.getElementById(clinicaId);
    const elRep = document.getElementById(repasseId);

    if (!sel || !box) return;

    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) {
      box.style.display = 'none';
      return;
    }

    const valTot = parseFloat(opt.dataset.valorTotal) || 0;
    const valCli = parseFloat(opt.dataset.valorClinica) || 0;
    const valRep = Math.max(0, valTot - valCli);

    if (elTot) elTot.textContent = formatarMoeda(valTot);
    if (elCli) elCli.textContent = formatarMoeda(valCli);
    if (elRep) elRep.textContent = formatarMoeda(valRep);

    box.style.display = 'flex';
  }

  // Listeners de mudança de Especialidade nos Modais
  const newSpecSel = document.getElementById('newSpecialty');
  if (newSpecSel) {
    newSpecSel.addEventListener('change', () => {
      populatePlanSelects(newSpecSel.value, 'newPlanService');
      populateDoctorSelects(newSpecSel.value, 'newDoctor');
      updatePlanPricePreview('newPlanService', 'newPlanPreviewBox', 'newPreviewTotal', 'newPreviewClinica', 'newPreviewRepasse');
    });
  }

  const editSpecSel = document.getElementById('editSpecialty');
  if (editSpecSel) {
    editSpecSel.addEventListener('change', () => {
      populatePlanSelects(editSpecSel.value, 'editPlanService');
      populateDoctorSelects(editSpecSel.value, 'editDoctor');
      updatePlanPricePreview('editPlanService', 'editPlanPreviewBox', 'editPreviewTotal', 'editPreviewClinica', 'editPreviewRepasse');
    });
  }

  const newPlanSel = document.getElementById('newPlanService');
  if (newPlanSel) {
    newPlanSel.addEventListener('change', () => {
      updatePlanPricePreview('newPlanService', 'newPlanPreviewBox', 'newPreviewTotal', 'newPreviewClinica', 'newPreviewRepasse');
    });
  }

  const editPlanSel = document.getElementById('editPlanService');
  if (editPlanSel) {
    editPlanSel.addEventListener('change', () => {
      updatePlanPricePreview('editPlanService', 'editPlanPreviewBox', 'editPreviewTotal', 'editPreviewClinica', 'editPreviewRepasse');
    });
  }

  // Inicialização dos Selects
  populatePatientSelects();
  populatePlanSelects('Pilates Studio', 'newPlanService');
  populateDoctorSelects('Pilates Studio', 'newDoctor');

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
    const spec = document.getElementById('newSpecialty')?.value || 'Pilates Studio';
    populatePlanSelects(spec, 'newPlanService');
    populateDoctorSelects(spec, 'newDoctor');
    updatePlanPricePreview('newPlanService', 'newPlanPreviewBox', 'newPreviewTotal', 'newPreviewClinica', 'newPreviewRepasse');

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
      const planSel       = document.getElementById('newPlanService');

      if (!paciente) {
        showToast('Por favor, selecione um paciente cadastrado.', 'error');
        return;
      }

      const selectedYear = new Date(date + 'T12:00:00').getFullYear();
      if (!date || isNaN(selectedYear) || selectedYear < 2026) {
        showToast('Erro: A data do agendamento deve ser a partir do ano de 2026.', 'error');
        return;
      }

      // Verificar conflito de horário
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

      // Dados do Plano Selecionado
      let planoId = null;
      let planoNome = '';
      let valorTotal = 0;
      let valorClinica = 0;

      if (planSel && planSel.selectedIndex > 0) {
        const opt = planSel.options[planSel.selectedIndex];
        planoId = opt.value;
        planoNome = opt.dataset.nome || opt.textContent;
        valorTotal = parseFloat(opt.dataset.valorTotal) || 0;
        valorClinica = parseFloat(opt.dataset.valorClinica) || 0;
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
        horarioChegada: null,
        plano_id: planoId,
        plano_nome: planoNome,
        valor_total: valorTotal,
        valor_clinica: valorClinica
      };

      ValeStore.addAgendamento(novoRegistro);

      closeNewModal();
      showToast('Agendamento registrado com sucesso! Presença aguardada na recepção.', 'success');

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

    const curSpec = row.dataset.especialidade || row.dataset.specialty || 'Pilates Studio';
    const curDoc  = row.dataset.profissional || row.dataset.doctor || '';

    if (editPat)  editPat.value  = row.dataset.paciente || row.dataset.patient || '';
    if (editDt)   editDt.value   = row.dataset.date || '';
    if (editTm)   editTm.value   = row.dataset.hora || row.dataset.time || '';
    if (editSpec) editSpec.value = curSpec;

    populateDoctorSelects(curSpec, 'editDoctor', curDoc);
    populatePlanSelects(curSpec, 'editPlanService');
    updatePlanPricePreview('editPlanService', 'editPlanPreviewBox', 'editPreviewTotal', 'editPreviewClinica', 'editPreviewRepasse');

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
      const planSel       = document.getElementById('editPlanService');

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

      let planoId = null;
      let planoNome = '';
      let valorTotal = null;
      let valorClinica = null;

      if (planSel && planSel.selectedIndex > 0) {
        const opt = planSel.options[planSel.selectedIndex];
        planoId = opt.value;
        planoNome = opt.dataset.nome || opt.textContent;
        valorTotal = parseFloat(opt.dataset.valorTotal) || 0;
        valorClinica = parseFloat(opt.dataset.valorClinica) || 0;
      }

      ValeStore.updateAgendamento(editingSlotId, {
        date,
        hora,
        time: hora,
        paciente,
        especialidade,
        profissional,
        plano_id: planoId,
        plano_nome: planoNome,
        valor_total: valorTotal,
        valor_clinica: valorClinica
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

  // Helper para construir link de confirmação do WhatsApp
  function buildWhatsAppConfirmationLink(paciente, dataStr, hora) {
    const pacientes = (typeof ValeStore !== 'undefined' ? ValeStore.getPacientes() : []) || [];
    const pacClean = (paciente || '').trim().toLowerCase();

    const pacObj = pacientes.find(p => {
      const n = (p.name || p.nome || '').trim().toLowerCase();
      return n === pacClean || (n && pacClean && (n.includes(pacClean) || pacClean.includes(n)));
    });

    const rawPhone = pacObj && (pacObj.phone || pacObj.telefone) ? String(pacObj.phone || pacObj.telefone) : '';
    let cleanTel = rawPhone.replace(/\D/g, '');

    const dataFormatada = formatarDataBR(dataStr);
    const msg = `Olá, ${paciente}! Passando para confirmar seu agendamento no dia ${dataFormatada} às ${hora}.`;

    if (cleanTel) {
      if (cleanTel.length >= 10 && !cleanTel.startsWith('55')) {
        cleanTel = '55' + cleanTel;
      }
      return {
        url: `https://api.whatsapp.com/send?phone=${cleanTel}&text=${encodeURIComponent(msg)}`,
        hasPhone: true,
        phone: cleanTel,
        message: msg
      };
    }

    return {
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`,
      hasPhone: false,
      phone: '',
      message: msg
    };
  }

  // -----------------------------------------------
  // CONSTRUTOR DO HTML DO CARD DE AGENDAMENTO
  // -----------------------------------------------
  function buildCardHTML(id, hora, especialidade, paciente, profissional, status, waData, planoNome, valorTotal) {
    const initials = paciente.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'VC';
    const statusId = 'status-slot-' + id;
    const isPresente = status.includes('Presente');
    const isFaltou   = status.includes('Faltou') || status.includes('Faltoso');

    const statusClass = isPresente ? 'checked-in' : isFaltou ? 'absent' : 'waiting';
    const statusText  = status;

    const specClass = especialidade === 'Pilates Studio' ? 'spec-pilates' :
                      especialidade === 'Fisioterapia'   ? 'spec-fisio' :
                      especialidade === 'Fonoaudiologia' ? 'spec-fono' : 'spec-psico';

    const buttonsHtml = isPresente
      ? `<button type="button" class="btn-checkin done btn-presenca-ok" disabled style="cursor: default;">
           ✓ Chegada Confirmada
         </button>`
      : `<button type="button" class="btn-checkin btn-do-checkin" data-status-id="${statusId}" data-slot-id="${id}" data-paciente="${paciente}" data-especialidade="${especialidade}">
           Confirmar Chegada
         </button>
         <button type="button" class="btn-faltou btn-do-faltou" data-status-id="${statusId}" data-slot-id="${id}" data-paciente="${paciente}" data-especialidade="${especialidade}">
           Faltou
         </button>`;

    const planoBadge = planoNome ? `<span style="font-size:0.75rem; background: rgba(197,160,89,0.15); color: var(--color-secondary); padding: 2px 6px; border-radius: 4px; font-weight: 600; margin-left: 6px;">${planoNome}</span>` : '';

    const waHref = waData ? waData.url : '#';
    const hasPhone = waData ? waData.hasPhone : false;
    const waMsg = waData ? waData.message : '';

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
                <h4>${paciente} ${planoBadge}</h4>
                <p>${especialidade} • <strong>${profissional}</strong></p>
              </div>
            </div>
            <div class="card-quick-actions">
              <button class="btn-icon-quick btn-edit-appointment" title="Editar Agendamento">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button class="btn-icon-quick cancel btn-cancel-appointment" title="Cancelar Horário">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
              <a href="${waHref}" target="_blank" class="btn-icon-quick whatsapp btn-whatsapp-action" data-has-phone="${hasPhone}" data-paciente="${paciente}" data-msg="${waMsg}" title="Confirmar Agendamento via WhatsApp">
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

    // Filtrar por data e excluir cancelados
    let filtrados = allAgendamentos.filter(a => a.date === selectedDate && a.status !== 'Cancelado');

    if (currentFilter !== 'Todos') {
      filtrados = filtrados.filter(a => {
        const spec = (a.especialidade || '').toLowerCase();
        const filt = currentFilter.toLowerCase();
        return spec.includes(filt) || filt.includes(spec);
      });
    }

    scheduleList.innerHTML = '';

    if (filtrados.length === 0) {
      const outrasDatas = [...new Set(allAgendamentos.filter(a => a.status !== 'Cancelado' && a.date !== selectedDate).map(a => a.date))].filter(Boolean).sort();
      let outrasDatasHtml = '';

      if (outrasDatas.length > 0) {
        outrasDatasHtml = `
          <div style="margin-top: 18px; padding-top: 14px; border-top: 1px dashed var(--color-border-input);">
            <div style="font-size: 0.85rem; font-weight: 600; color: var(--color-primary); margin-bottom: 8px;">
              💡 Foram encontrados agendamentos ativos em outras datas:
            </div>
            <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;">
              ${outrasDatas.map(dt => {
                const count = allAgendamentos.filter(a => a.date === dt && a.status !== 'Cancelado').length;
                const diaSem = ValeStore.getDiaSemana(dt);
                return `<button type="button" class="btn-jump-agenda-date" data-date="${dt}" style="background: var(--color-primary); color: #FFF; border: none; padding: 7px 14px; border-radius: 6px; font-size: 0.82rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">📅 Ver ${diaSem} (${formatarDataBR(dt)}) &mdash; <strong>${count} paciente(s)</strong></button>`;
              }).join('')}
            </div>
          </div>
        `;
      }

      scheduleList.innerHTML = `
        <div style="padding: 40px 20px; text-align: center; color: var(--color-text-muted); background: var(--color-card-bg); border-radius: var(--radius-card); border: 1px dashed var(--color-border-input); width: 100%;">
          <h4 style="color: var(--color-primary); font-size: 1.05rem;">Nenhum agendamento para ${formatarDataBR(selectedDate)} (${ValeStore.getDiaSemana(selectedDate)})</h4>
          <p style="font-size: 0.85rem; margin-top: 6px;">Clique em "NOVO AGENDAMENTO" para marcar uma consulta com o profissional.</p>
          ${outrasDatasHtml}
        </div>
      `;
      return;
    }

    // Ordenar por hora
    filtrados.sort((a, b) => (a.hora || a.time || '').localeCompare(b.hora || b.time || ''));

    filtrados.forEach(a => {
      const hora = a.hora || a.time || '08:00';
      const paciente = a.paciente || '';
      const especialidade = a.especialidade || 'Pilates Studio';
      const profissional = a.profissional || (especialidade === 'Fonoaudiologia' ? 'Dr. Jorge Linhares' : 'Dra. Katiane');
      const status = a.status || 'Aguardando Chegada';
      const planoNome = a.plano_nome || '';
      const valorTotal = a.valor_total || 0;

      // Link dinâmico com API oficial do WhatsApp
      const waData = buildWhatsAppConfirmationLink(paciente, a.date, hora);

      const rowHTML = buildCardHTML(a.id, hora, especialidade, paciente, profissional, status, waData, planoNome, valorTotal);
      scheduleList.insertAdjacentHTML('beforeend', rowHTML);
    });
  }

  // -----------------------------------------------
  // DELEGAÇÃO DE EVENTOS NA GRADE
  // -----------------------------------------------
  const scheduleList = document.getElementById('scheduleList');
  if (scheduleList) {
    scheduleList.addEventListener('click', function(e) {

      // Clique no botão WhatsApp com verificação de telefone
      const waBtn = e.target.closest('.btn-whatsapp-action');
      if (waBtn) {
        const hasPhone = waBtn.dataset.hasPhone === 'true';
        const pacNome = waBtn.dataset.paciente;
        const msg = waBtn.dataset.msg;

        if (!hasPhone) {
          e.preventDefault();
          const telInput = prompt(`⚠️ O paciente "${pacNome}" não possui telefone cadastrado.\n\nDigite o número de WhatsApp com DDD (Ex: 88999998888) para enviar a confirmação agora:`);
          if (telInput && telInput.trim()) {
            let clean = telInput.replace(/\D/g, '');
            if (clean.length >= 10 && !clean.startsWith('55')) clean = '55' + clean;
            window.open(`https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(msg)}`, '_blank');
          }
        }
      }

      // Botão Confirmar Chegada
      const checkinBtn = e.target.closest('.btn-do-checkin');
      if (checkinBtn) {
        const slotId = checkinBtn.dataset.slotId;
        const now = new Date();
        const hh  = String(now.getHours()).padStart(2, '0');
        const mm  = String(now.getMinutes()).padStart(2, '0');
        const newStatus = `Presente (${hh}:${mm}h)`;

        ValeStore.updateAgendamento(slotId, { status: newStatus, horarioChegada: `${hh}:${mm}` });

        // Lançamento financeiro automático SOMENTE na confirmação de presença
        const agendamentos = ValeStore.getAgendamentos() || [];
        const agConfirmado = agendamentos.find(a => String(a.id) === String(slotId));
        if (agConfirmado) {
          const planos = ValeStore.getPlanosServicos() || [];
          let valTotal = parseFloat(agConfirmado.valor_total) || 0;
          let valClinica = parseFloat(agConfirmado.valor_clinica) || 0;
          let planoNome = agConfirmado.plano_nome || '';

          // Se não tem valores no agendamento, buscar no catálogo de planos
          if (valTotal === 0) {
            const esp = (agConfirmado.especialidade || '').toLowerCase();
            const matchPlano = planos.find(p => {
              const n = (p.nome_servico || '').toLowerCase();
              if (esp.includes('pilates') && n.includes('pilates')) return true;
              if (esp.includes('fisio') && n.includes('fisio')) return true;
              if (esp.includes('fono') && n.includes('fono')) return true;
              if (esp.includes('psico') && n.includes('psico')) return true;
              return false;
            });
            if (matchPlano) {
              valTotal = parseFloat(matchPlano.valor_total) || 0;
              valClinica = parseFloat(matchPlano.valor_clinica) || 0;
              planoNome = planoNome || matchPlano.nome_servico;
            }
          }

          if (valTotal > 0) {
            const categoriaMap = {
              'Pilates Studio': 'pilates',
              'Fisioterapia': 'fisio',
              'Fonoaudiologia': 'fono',
              'Psicopedagogia': 'psico'
            };
            ValeStore.addFinanceiro({
              id: 'fin-' + Date.now(),
              data: agConfirmado.date || new Date().toISOString().split('T')[0],
              paciente: agConfirmado.paciente,
              descricao: planoNome ? `Consulta: ${planoNome}` : `Consulta: ${agConfirmado.especialidade}`,
              categoria: categoriaMap[agConfirmado.especialidade] || 'geral',
              pagamento: 'PIX',
              valor: valTotal,
              valor_clinica: valClinica,
              tipo: 'receita',
              status: 'pago',
              profissional: agConfirmado.profissional
            });
          }
        }

        showToast('Presença confirmada! Receita lançada no financeiro.', 'success');

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

      // Botão Cancelar / Excluir Horário
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

      // Botão Navegação Rápida para outra Data com Agendamentos
      const jumpBtn = e.target.closest('.btn-jump-agenda-date');
      if (jumpBtn) {
        const targetDate = jumpBtn.dataset.date;
        if (targetDate) {
          const dp = document.getElementById('agendaDatePicker');
          if (dp) dp.value = targetDate;
          updateDateDisplay(targetDate);
          renderTimeline(targetDate);
          showToast(`Exibindo agendamentos para ${formatarDataBR(targetDate)}`, 'success');
        }
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
      populatePlanSelects('Pilates Studio', 'newPlanService');
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
    populatePlanSelects('Pilates Studio', 'newPlanService');
    const dp = document.getElementById('agendaDatePicker');
    renderTimeline(dp ? dp.value : todayStr);
  });

});