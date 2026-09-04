/* ==========================================
   ValeClinic - Módulo Psicopedagogia / Neuropsicopedagogia
   Sincronização Supabase + Agenda Geral + Blindagem de Timezone
   Versão 4.0 - Dra. Cleópatra
   ========================================== */

document.addEventListener('DOMContentLoaded', async () => {

  const moduloNome = 'Psicopedagogia';
  const profPadrao = 'Dra. Cleópatra';
  let activeDay = 'Segunda';

  // Determinar dia atual com persistência de sessão ou fuso local
  const savedDay = sessionStorage.getItem('valeclinic_psico_active_day');
  if (savedDay) {
    activeDay = savedDay;
  } else {
    const hojeDateStr = typeof ValeStore !== 'undefined' ? ValeStore.getTodayDate() : new Date().toLocaleDateString('en-CA');
    const hojeDiaSemana = typeof ValeStore !== 'undefined' ? ValeStore.getDiaSemana(hojeDateStr) : 'Segunda';
    if (hojeDiaSemana && hojeDiaSemana !== 'Domingo') {
      activeDay = hojeDiaSemana;
    }
  }

  // 1. Configurar abas de dias da semana
  const dayTabs = document.querySelectorAll('.days-tabs .day-tab');
  dayTabs.forEach(tab => {
    const tabText = tab.textContent.trim().replace('-feira', '');
    if (tabText === activeDay || activeDay.startsWith(tabText)) {
      dayTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    }

    tab.addEventListener('click', () => {
      dayTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeDay = tab.textContent.trim().replace('-feira', '');
      sessionStorage.setItem('valeclinic_psico_active_day', activeDay);
      renderPsicoCards();
    });
  });

  // 2. Notificações & Menu Mobile
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

  // Helper para calcular a data local correspondente ao dia da semana selecionado
  function getDateForWeekday(weekdayName) {
    const diasMap = { 'Domingo': 0, 'Segunda': 1, 'Terça': 2, 'Quarta': 3, 'Quinta': 4, 'Sexta': 5, 'Sábado': 6 };
    const targetDayIndex = diasMap[weekdayName] ?? 1;

    const now = new Date();
    const currentDayIndex = now.getDay();
    let diff = targetDayIndex - currentDayIndex;

    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 3. Modais
  const modalNovoAtendimento = document.getElementById('modalNovaTurma');
  const modalVincular = document.getElementById('modalMatricular');
  const modalEvoluirProntuario = document.getElementById('modalEvoluirProntuario');
  const modalGraficoProgresso = document.getElementById('modalGraficoProgresso');
  const modalGerarLaudo = document.getElementById('modalGerarLaudo');

  const btnNovoAtendimento = document.getElementById('btnNovaTurma');
  const btnVincular = document.getElementById('btnMatricular');

  if (btnNovoAtendimento && modalNovoAtendimento) {
    btnNovoAtendimento.addEventListener('click', () => {
      populatePatientSelects();
      const inputData = document.getElementById('novoAtdDataPsico');
      if (inputData) inputData.value = getDateForWeekday(activeDay);
      modalNovoAtendimento.classList.add('active');
    });
  }

  if (btnVincular && modalVincular) {
    btnVincular.addEventListener('click', () => {
      populatePatientSelects();
      modalVincular.classList.add('active');
    });
  }

  // 4. Popular dropdowns e datalists de pacientes (exclusivamente ativos)
  function populatePatientSelects() {
    if (typeof ValeStore === 'undefined') return;
    const pacientesAtivos = ValeStore.getPacientesAtivos() || [];

    const datalist = document.getElementById('psicoPacientesDatalist');
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

    const selects = [
      document.getElementById('novoAtdPacientePsico'),
      document.getElementById('vincPacientePsico'),
      document.getElementById('laudoPaciente')
    ];

    selects.forEach(sel => {
      if (!sel || sel.tagName !== 'SELECT') return;
      const currentVal = sel.value;
      sel.innerHTML = '<option value="">Selecione o paciente cadastrado...</option>';

      pacientesAtivos.forEach(p => {
        const nome = p.name || p.nome || '';
        const tel  = p.phone || p.telefone || '';
        const opt  = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome + (tel ? ` (${tel})` : '');
        sel.appendChild(opt);
      });

      if (currentVal) sel.value = currentVal;
    });
  }

  // 5. Renderização dos Cards de Psicopedagogia
  function renderPsicoCards() {
    if (typeof ValeStore === 'undefined') return;
    const container = document.getElementById('psicoClassesList');
    if (!container) return;

    const allAgendamentos = ValeStore.getAgendamentos() || [];

    // Filtrar por especialidade Psicopedagogia / Neuropsicopedagogia e status ativo
    const psicoAgendamentos = allAgendamentos.filter(a => {
      const esp = (a.especialidade || '').toLowerCase();
      return (esp.includes('psico') || esp.includes('neuro')) && a.status !== 'Cancelado';
    });

    // Filtrar pela aba de dia selecionada usando o helper de timezone
    const diaAgendamentos = psicoAgendamentos.filter(a => {
      const diaDaSemana = ValeStore.getDiaSemana(a.date);
      return diaDaSemana === activeDay || diaDaSemana.startsWith(activeDay);
    });

    // Atualizar KPIs
    const hojeAgendamentos = psicoAgendamentos.filter(a => a.date === hojeDateStr);
    const pacientesDistintos = new Set(psicoAgendamentos.map(a => a.paciente)).size;
    const faltasPsico = psicoAgendamentos.filter(a => a.status.includes('Faltou') || a.status.includes('Faltoso')).length;

    const elPacientes = document.getElementById('kpiPsicoPacientes');
    const elHoje      = document.getElementById('kpiPsicoHoje');
    const elLaudos    = document.getElementById('kpiPsicoLaudos');
    const elFaltas    = document.getElementById('kpiPsicoFaltas');

    if (elPacientes) elPacientes.textContent = pacientesDistintos;
    if (elHoje)      elHoje.textContent      = hojeAgendamentos.length;
    if (elLaudos)    elLaudos.textContent    = '0';
    if (elFaltas)    elFaltas.textContent    = faltasPsico;

    container.innerHTML = '';

    if (diaAgendamentos.length === 0) {
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--color-text-muted); background: var(--color-card-bg); border-radius: var(--radius-card); border: 1px dashed var(--color-border-input); width: 100%;">
          <h4>Nenhum atendimento de Psicopedagogia agendado para ${activeDay}</h4>
          <p style="font-size: 0.85rem; margin-top: 6px;">Os agendamentos realizados para este dia aparecerão aqui automaticamente.</p>
        </div>
      `;
      return;
    }

    // Ordenar por horário
    diaAgendamentos.sort((a, b) => (a.hora || a.time || '').localeCompare(b.hora || b.time || ''));

    diaAgendamentos.forEach(a => {
      const hora = a.hora || a.time || '08:00';
      const paciente = a.paciente || '';
      const profissional = a.profissional || profPadrao;
      const status = a.status || 'Aguardando Chegada';
      const initials = paciente.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

      const statusColor = status.includes('Presente') ? '#10B981' :
                          status.includes('Faltou') || status.includes('Faltoso') ? '#EF4444' : '#F59E0B';
      const statusText  = status.includes('Presente') ? status :
                          status.includes('Faltou') || status.includes('Faltoso') ? status : 'Aguardando na Recepção';

      // Link dinâmico do WhatsApp
      const pacientes = (typeof ValeStore !== 'undefined' ? ValeStore.getPacientes() : []) || [];
      const pacClean = (paciente || '').trim().toLowerCase();
      const pacObj = pacientes.find(p => {
        const n = (p.name || p.nome || '').trim().toLowerCase();
        return n === pacClean || (n && pacClean && (n.includes(pacClean) || pacClean.includes(n)));
      });
      const rawPhone = pacObj && (pacObj.phone || pacObj.telefone) ? String(pacObj.phone || pacObj.telefone) : '';
      let cleanTel = rawPhone.replace(/\D/g, '');
      if (cleanTel.length >= 10 && !cleanTel.startsWith('55')) cleanTel = '55' + cleanTel;

      const dataFormatada = a.date ? a.date.split('-').reverse().join('/') : '';
      const msg = `Olá, ${paciente}! Passando para confirmar seu agendamento no dia ${dataFormatada} às ${hora}.`;
      const waHref = cleanTel ? `https://api.whatsapp.com/send?phone=${cleanTel}&text=${encodeURIComponent(msg)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

      const card = document.createElement('article');
      card.className = 'class-card';
      card.dataset.day = activeDay;

      card.innerHTML = `
        <div class="class-card-header">
          <div class="class-title-group">
            <h4>${paciente} <span class="modality-badge">${moduloNome}</span></h4>
            <p>Profissional: <strong>${profissional}</strong></p>
            <p style="font-weight: 600; color: var(--color-primary); margin-top: 4px;">Horário: ${hora} | Data: ${a.date}</p>
          </div>
          <div class="class-occupancy" style="display:flex; align-items:center; gap:8px;">
            <span class="occupancy-text" style="color: ${statusColor}; font-weight: 700;">${statusText}</span>
            <a href="${waHref}" target="_blank" class="btn-icon-quick whatsapp btn-wa-spec" data-has-phone="${!!cleanTel}" data-paciente="${paciente}" data-msg="${msg}" title="Confirmar via WhatsApp" style="width:28px; height:28px; border-radius:6px; border:1px solid #10B981; background:rgba(16,185,129,0.12); color:#10B981; display:inline-flex; align-items:center; justify-content:center; text-decoration:none;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" width="13" height="13"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
            </a>
            <button class="btn-icon-quick cancel btn-delete-slot" data-slot-id="${a.id}" title="Excluir / Liberar Horário" style="width:28px; height:28px; border-radius:6px; border:1px solid var(--color-border-input); background:transparent; color:#EF4444; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <div class="enrolled-students-grid" style="grid-template-columns: 1fr 1fr; gap: 8px;">
          <button class="empty-slot-btn btn-evoluir-modal" style="border-style: solid; background-color: var(--color-primary); color: #FFF; justify-content: center; font-weight: 600;">
            📝 Evoluir Prontuário
          </button>
          <button class="empty-slot-btn btn-grafico-modal" style="border-style: solid; justify-content: center; font-weight: 600;">
            📊 Progresso Cognitivo
          </button>
        </div>
      `;

      // Botão de exclusão do agendamento
      const delBtn = card.querySelector('.btn-delete-slot');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (confirm(`Deseja excluir o agendamento de ${paciente}? O registro será removido permanentemente do Supabase e o horário liberado na Agenda Geral.`)) {
            ValeStore.deleteAgendamento(a.id);
            renderPsicoCards();
          }
        });
      }

      card.querySelector('.btn-evoluir-modal').addEventListener('click', (e) => {
        e.preventDefault();
        if (modalEvoluirProntuario) {
          const nameTarget = modalEvoluirProntuario.querySelector('#modalEvolucaoNome');
          const avatarTarget = modalEvoluirProntuario.querySelector('#modalEvolucaoAvatar');
          const dataTarget = modalEvoluirProntuario.querySelector('#modalEvolucaoData');
          const profTarget = modalEvoluirProntuario.querySelector('#modalEvolucaoProf');
          if (nameTarget) nameTarget.textContent = paciente;
          if (avatarTarget) avatarTarget.textContent = initials;
          if (dataTarget) dataTarget.textContent = `${a.date} - ${hora}`;
          if (profTarget) profTarget.textContent = profissional;
          modalEvoluirProntuario.classList.add('active');
        }
      });

      card.querySelector('.btn-grafico-modal').addEventListener('click', (e) => {
        e.preventDefault();
        if (modalGraficoProgresso) {
          const nameTarget = modalGraficoProgresso.querySelector('#modalGraficoNome');
          const avatarTarget = modalGraficoProgresso.querySelector('#modalGraficoAvatar');
          if (nameTarget) nameTarget.textContent = paciente;
          if (avatarTarget) avatarTarget.textContent = initials;
          modalGraficoProgresso.classList.add('active');
        }
      });

      container.appendChild(card);
    });
  }

  // 6. Formulário Novo Atendimento Psicopedagogia
  const formNovoPsico = document.getElementById('formNovoAtendimentoPsico');
  if (formNovoPsico) {
    formNovoPsico.addEventListener('submit', (e) => {
      e.preventDefault();

      const pac = document.getElementById('novoAtdPacientePsico')?.value || '';
      const hora = document.getElementById('novoAtdHorarioPsico')?.value || '08:00';
      const tipo = document.getElementById('novoAtdTipoPsico')?.value || 'Atendimento Psicopedagógico';
      const prof = document.getElementById('novoAtdProfPsico')?.value || profPadrao;
      const dataEscolhida = document.getElementById('novoAtdDataPsico')?.value || getDateForWeekday(activeDay);

      if (!pac) {
        alert('Por favor, selecione um paciente cadastrado.');
        return;
      }

      // Buscar plano correspondente no catálogo do Supabase
      const planos = (typeof ValeStore !== 'undefined' ? ValeStore.getPlanosServicos() : []) || [];
      const planoPsico = planos.find(p => (p.nome_servico || '').toLowerCase().includes('psico'));
      const valTot = planoPsico ? planoPsico.valor_total : 150;
      const valCli = planoPsico ? planoPsico.valor_clinica : 30;

      const novoRegistro = {
        id: 'slot-' + Date.now(),
        date: dataEscolhida,
        hora: hora,
        time: hora,
        paciente: pac,
        especialidade: moduloNome,
        profissional: prof,
        status: 'Aguardando Chegada',
        horarioChegada: null,
        plano_id: planoPsico ? planoPsico.id : null,
        plano_nome: planoPsico ? planoPsico.nome_servico : tipo,
        valor_total: valTot,
        valor_clinica: valCli
      };

      ValeStore.addAgendamento(novoRegistro);
      alert(`✅ Atendimento de ${pac} agendado para ${dataEscolhida} às ${hora}! Sincronizado com a Agenda Geral.`);
      if (modalNovoAtendimento) modalNovoAtendimento.classList.remove('active');
      formNovoPsico.reset();
      renderPsicoCards();
    });
  }

  // 7. Formulário Vincular Paciente
  const formVincPsico = document.getElementById('formVincularPacientePsico');
  if (formVincPsico) {
    formVincPsico.addEventListener('submit', (e) => {
      e.preventDefault();
      const pac = document.getElementById('vincPacientePsico')?.value || '';
      if (!pac) {
        alert('Por favor, selecione um paciente cadastrado.');
        return;
      }

      alert(`✅ Paciente ${pac} vinculado ao módulo Psicopedagogia!`);
      if (modalVincular) modalVincular.classList.remove('active');
      formVincPsico.reset();
      renderPsicoCards();
    });
  }

  // 8. Formulário Gerar Laudo
  const formLaudo = document.getElementById('formGerarLaudo');
  if (formLaudo) {
    formLaudo.addEventListener('submit', (e) => {
      e.preventDefault();
      const pac = document.getElementById('laudoPaciente')?.value || 'Paciente';
      const tipo = document.getElementById('laudoTipo')?.value || 'Laudo';
      alert(`✅ ${tipo} para ${pac} gerado com sucesso!`);
      if (modalGerarLaudo) modalGerarLaudo.classList.remove('active');
      formLaudo.reset();
    });
  }

  // 9. Salvar Evolução
  const formEvolucao = document.getElementById('formEvolucaoProntuario');
  if (formEvolucao) {
    formEvolucao.addEventListener('submit', async (e) => {
      e.preventDefault();

      const pacienteNome = document.getElementById('modalEvolucaoNome')?.textContent || 'Paciente';
      const conduta = formEvolucao.querySelector('textarea')?.value || '';
      const activePain = document.querySelector('.pain-btn.active-green, .pain-btn.active-yellow, .pain-btn.active-red');
      const nivelDor = activePain ? parseInt(activePain.dataset.level || '10', 10) : 10;

      if (typeof ValeStore !== 'undefined') {
        ValeStore.addEvolucao({
          paciente: pacienteNome,
          modulo: 'psicopedagogia',
          procedimentos: conduta,
          nivel_dor: nivelDor,
          data: new Date().toLocaleDateString('pt-BR')
        });
      }

      alert(`✅ Evolução Psicopedagógica de ${pacienteNome} salva com sucesso!`);
      if (modalEvoluirProntuario) modalEvoluirProntuario.classList.remove('active');
      formEvolucao.reset();
      renderPsicoCards();
    });
  }

  // 10. Escala de Engajamento
  const painBtns = document.querySelectorAll('.pain-btn');
  painBtns.forEach(pBtn => {
    pBtn.addEventListener('click', () => {
      painBtns.forEach(b => b.className = 'pain-btn');
      const level = parseInt(pBtn.getAttribute('data-level') || '0', 10);
      if (level <= 3) pBtn.classList.add('active-red');
      else if (level <= 6) pBtn.classList.add('active-yellow');
      else pBtn.classList.add('active-green');
    });
  });

  // 11. Fechamento de Modais
  const allModals = [modalNovoAtendimento, modalVincular, modalEvoluirProntuario, modalGraficoProgresso, modalGerarLaudo];
  allModals.forEach(modal => {
    if (!modal) return;
    const closeBtns = modal.querySelectorAll('.btn-close-modal, .btn-modal-cancel');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => modal.classList.remove('active'));
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

  // 12. FETCH ASSÍNCRONO & SINGLE SOURCE OF TRUTH (Supabase)
  async function fetchDados() {
    try {
      if (typeof ValeStore !== 'undefined' && ValeStore.syncAgendamentos) {
        await ValeStore.syncAgendamentos();
      }
      populatePatientSelects();
      renderPsicoCards();
    } catch (err) {
      console.error('[Psicopedagogia] Erro ao sincronizar dados do Supabase:', err);
      populatePatientSelects();
      renderPsicoCards();
    }
  }

  // Executar fetch inicial
  await fetchDados();

  // Reagir a eventos de sincronização em tempo real
  document.addEventListener('valeclinic:dataSynced', () => {
    populatePatientSelects();
    renderPsicoCards();
  });

});
