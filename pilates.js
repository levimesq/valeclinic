/* ==========================================
   ValeClinic - Módulo Pilates Studio
   Sincronização Supabase + Gestão Inteligente de 6 Vagas (Encaixes)
   Versão 5.0 - Produção / Soft Launch
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {

  const moduloNome = 'Pilates Studio';
  let activeDay = 'Segunda';

  // 1. Determinar dia atual com persistência de sessão ou fuso local
  const savedDay = sessionStorage.getItem('valeclinic_pilates_active_day');
  if (savedDay) {
    activeDay = savedDay;
  } else {
    const hojeDateStr = typeof ValeStore !== 'undefined' ? ValeStore.getTodayDate() : new Date().toLocaleDateString('en-CA');
    const hojeDiaSemana = typeof ValeStore !== 'undefined' ? ValeStore.getDiaSemana(hojeDateStr) : 'Segunda';
    if (hojeDiaSemana && hojeDiaSemana !== 'Domingo') {
      activeDay = hojeDiaSemana;
    }
  }

  // 2. Configurar abas de dias da semana
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
      sessionStorage.setItem('valeclinic_pilates_active_day', activeDay);
      renderPilatesCards();
    });
  });

  // 3. Notificações & Menu Mobile
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

  // 4. Modais
  const modalNovaTurma = document.getElementById('modalNovaTurma');
  const modalMatricular = document.getElementById('modalMatricular');
  const modalEvoluirProntuario = document.getElementById('modalEvoluirProntuario');
  const modalGraficoProgresso = document.getElementById('modalGraficoProgresso');

  const btnNovaTurma = document.getElementById('btnNovaTurma');
  const btnMatricular = document.getElementById('btnMatricular');

  // Variável para armazenar contexto do slot de encaixe clicado
  let contextEncaixe = null;

  // Botão Superior: Nova Turma
  if (btnNovaTurma && modalNovaTurma) {
    btnNovaTurma.addEventListener('click', () => {
      const diaSelect = document.getElementById('turmaDiaSelect');
      if (diaSelect) diaSelect.value = activeDay;
      modalNovaTurma.classList.add('active');
    });
  }

  // Botão Superior: Matricular Aluno (Geral)
  if (btnMatricular && modalMatricular) {
    btnMatricular.addEventListener('click', () => {
      contextEncaixe = null;
      const titleEl = document.getElementById('modalMatricularTitle');
      if (titleEl) titleEl.textContent = 'Matricular / Encaixar Aluno';
      populatePatientSelects();
      populateTurmasSelect();
      modalMatricular.classList.add('active');
    });
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

  // Helper para somar dias a uma data YYYY-MM-DD
  function addDaysToDate(dateStr, days = 7) {
    if (!dateStr) return dateStr;
    const parts = dateStr.split('-').map(Number);
    const target = new Date(parts[0], parts[1] - 1, parts[2] + days, 12, 0, 0);
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, '0');
    const d = String(target.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Popular seletor de pacientes ativos (100% Supabase / Store)
  function populatePatientSelects() {
    if (typeof ValeStore === 'undefined') return;
    const pacientesAtivos = ValeStore.getPacientesAtivos() || [];

    const datalist = document.getElementById('pilatesPacientesDatalist');
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

    const pacSelect = document.getElementById('matricularPacienteSelect');
    if (pacSelect && pacSelect.tagName === 'SELECT') {
      const currentVal = pacSelect.value;
      pacSelect.innerHTML = '<option value="">Selecione o paciente cadastrado...</option>';

      if (pacientesAtivos.length === 0) {
        pacSelect.innerHTML = '<option value="">Nenhum paciente ativo cadastrado</option>';
      } else {
        pacientesAtivos.forEach(p => {
          const nome = p.name || p.nome || '';
          const tel  = p.phone || p.telefone || '';
          const opt  = document.createElement('option');
          opt.value = nome;
          opt.textContent = nome + (tel ? ` (${tel})` : '');
          pacSelect.appendChild(opt);
        });
      }

      if (currentVal) pacSelect.value = currentVal;
    }
  }

  // Popular seletor de turmas disponíveis
  function populateTurmasSelect(selectedHora = null) {
    const turmaSelect = document.getElementById('matricularTurmaSelect');
    if (!turmaSelect || typeof ValeStore === 'undefined') return;

    turmaSelect.innerHTML = '';
    const turmas = getTurmasDoDia(activeDay);

    if (turmas.length === 0) {
      turmaSelect.innerHTML = `<option value="">Nenhuma turma criada para ${activeDay}</option>`;
      return;
    }

    turmas.forEach(t => {
      const allAg = ValeStore.getAgendamentos() || [];
      const enrolledCount = allAg.filter(a =>
        (a.especialidade === moduloNome || a.especialidade === 'Pilates') &&
        a.status !== 'Cancelado' &&
        ValeStore.getDiaSemana(a.date) === activeDay &&
        (a.hora || a.time || '08:00') === t.hora
      ).length;

      const vagasLivres = Math.max(0, 6 - enrolledCount);
      const opt = document.createElement('option');
      opt.value = t.hora;
      opt.textContent = `${activeDay} às ${t.hora} (${t.nome}) — ${vagasLivres} vaga(s) livre(s)`;
      if (selectedHora && t.hora === selectedHora) {
        opt.selected = true;
      }
      turmaSelect.appendChild(opt);
    });
  }

  // Obter turmas unificadas do dia (Criadas + Agendamentos existentes)
  function getTurmasDoDia(dia) {
    if (typeof ValeStore === 'undefined') return [];

    const customTurmas = ValeStore.getPilatesTurmas() || [];
    const allAg = ValeStore.getAgendamentos() || [];

    const pilatesAg = allAg.filter(a => {
      const esp = (a.especialidade || '').toLowerCase();
      return (esp.includes('pilates') || (a.profissional || '').toLowerCase().includes('katiane')) && a.status !== 'Cancelado';
    });

    const diaAg = pilatesAg.filter(a => {
      const d = ValeStore.getDiaSemana(a.date);
      return d === dia || d.startsWith(dia);
    });

    const turmasMap = new Map();

    // 1. Adicionar turmas salvas
    customTurmas.filter(t => t.dia === dia || (t.dia && t.dia.startsWith(dia))).forEach(t => {
      turmasMap.set(t.hora, {
        id: t.id,
        nome: t.nome || 'Pilates Studio',
        dia: t.dia || dia,
        hora: t.hora,
        profissional: t.profissional || 'Dra. Katiane',
        capacidade: parseInt(t.capacidade || 6, 10) || 6,
        isCustom: true
      });
    });

    // 2. Adicionar turmas derivadas de agendamentos existentes
    diaAg.forEach(a => {
      const hora = a.hora || a.time || '08:00';
      if (!turmasMap.has(hora)) {
        turmasMap.set(hora, {
          id: 'turma-slot-' + hora,
          nome: a.plano_nome || 'Pilates Studio',
          dia: dia,
          hora: hora,
          profissional: a.profissional || 'Dra. Katiane',
          capacidade: 6,
          isCustom: false
        });
      }
    });

    // Ordenar cronologicamente
    return Array.from(turmasMap.values()).sort((a, b) => a.hora.localeCompare(b.hora));
  }

  // 5. Renderização dos Cards do Pilates com 6 Slots Fixos (Lógica de Encaixe)
  function renderPilatesCards() {
    if (typeof ValeStore === 'undefined') return;
    const container = document.getElementById('pilatesClassesList');
    if (!container) return;

    const allAgendamentos = ValeStore.getAgendamentos() || [];

    // Filtrar por especialidade Pilates e status ativo
    const pilatesAgendamentos = allAgendamentos.filter(a => {
      const esp = (a.especialidade || '').toLowerCase();
      return (esp.includes('pilates') || (a.profissional || '').toLowerCase().includes('katiane')) && a.status !== 'Cancelado';
    });

    const diaAgendamentos = pilatesAgendamentos.filter(a => {
      const d = ValeStore.getDiaSemana(a.date);
      return d === activeDay || d.startsWith(activeDay);
    });

    const turmasDoDia = getTurmasDoDia(activeDay);

    // Atualizar KPIs
    const alunosDistintos = new Set(pilatesAgendamentos.map(a => a.paciente)).size;
    let totalVagasLivresDia = 0;

    turmasDoDia.forEach(t => {
      const enrolled = diaAgendamentos.filter(a => (a.hora || a.time || '08:00') === t.hora);
      totalVagasLivresDia += Math.max(0, 6 - enrolled.length);
    });

    const elAlunos = document.getElementById('kpiPilatesAlunos');
    const elTurmas = document.getElementById('kpiPilatesTurmas');
    const elVagas  = document.getElementById('kpiPilatesVagas');
    const elRepo   = document.getElementById('kpiPilatesRepo');

    if (elAlunos) elAlunos.textContent = alunosDistintos;
    if (elTurmas) elTurmas.textContent = turmasDoDia.length;
    if (elVagas)  elVagas.textContent  = totalVagasLivresDia;
    if (elRepo)   elRepo.textContent   = pilatesAgendamentos.filter(a => a.status.includes('Aguardando')).length;

    container.innerHTML = '';

    if (turmasDoDia.length === 0) {
      container.innerHTML = `
        <div style="padding: 48px 24px; text-align: center; color: var(--color-text-muted); background: var(--color-card-bg); border-radius: var(--radius-card); border: 1px dashed var(--color-border-input); width: 100%;">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">🧘</div>
          <h4 style="color: var(--color-primary); font-size: 1.1rem;">Nenhuma turma de Pilates cadastrada para ${activeDay}</h4>
          <p style="font-size: 0.88rem; margin-top: 6px;">Clique no botão "+ Nova Turma" acima para abrir um novo horário de 6 vagas.</p>
        </div>
      `;
      return;
    }

    // Renderizar cada Turma com 6 Slots
    turmasDoDia.forEach(turma => {
      const enrolled = diaAgendamentos.filter(a => (a.hora || a.time || '08:00') === turma.hora);
      const totalAlunos = enrolled.length;
      const vagasLivres = Math.max(0, 6 - totalAlunos);
      const ocupacaoPct = Math.min(100, Math.round((totalAlunos / 6) * 100));

      let occupancyColor = 'green';
      let occupancyText = `${totalAlunos}/6 Vagas Preenchidas (${vagasLivres} livre${vagasLivres === 1 ? '' : 's'})`;

      if (totalAlunos === 5) {
        occupancyColor = 'orange';
        occupancyText = `5/6 Vagas Preenchidas (1 Vaga Livre para Encaixe!)`;
      } else if (totalAlunos >= 6) {
        occupancyColor = 'red';
        occupancyText = `6/6 Turma Lotada (100%)`;
      } else if (totalAlunos === 0) {
        occupancyText = `0/6 Vagas Preenchidas (6 Vagas Livres)`;
      }

      const card = document.createElement('article');
      card.className = 'class-card';
      card.dataset.day = activeDay;
      card.dataset.hora = turma.hora;

      // Montar slots: sempre exatamente 6 slots
      let slotsHTML = '';

      // 1. Slots preenchidos por alunos
      enrolled.forEach(aluno => {
        const pacienteNome = aluno.paciente || 'Paciente';
        const initials = pacienteNome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
        const status = aluno.status || 'Aguardando Chegada';

        let statusClass = 'status-agendado';
        let statusText = 'Agendado';
        if (status.includes('Presente')) {
          statusClass = 'status-presente';
          statusText = status;
        } else if (status.includes('Faltou') || status.includes('Faltoso')) {
          statusClass = 'status-faltou';
          statusText = status;
        }

        // Link dinâmico do WhatsApp
        const pacientes = (typeof ValeStore !== 'undefined' ? ValeStore.getPacientes() : []) || [];
        const pacClean = (pacienteNome || '').trim().toLowerCase();
        const pacObj = pacientes.find(p => {
          const n = (p.name || p.nome || '').trim().toLowerCase();
          return n === pacClean || (n && pacClean && (n.includes(pacClean) || pacClean.includes(n)));
        });
        const rawPhone = pacObj && (pacObj.phone || pacObj.telefone) ? String(pacObj.phone || pacObj.telefone) : '';
        let cleanTel = rawPhone.replace(/\D/g, '');
        if (cleanTel.length >= 10 && !cleanTel.startsWith('55')) cleanTel = '55' + cleanTel;

        const dataFormatada = aluno.date ? aluno.date.split('-').reverse().join('/') : '';
        const msg = `Olá, ${pacienteNome}! Passando para confirmar sua aula de Pilates no dia ${dataFormatada} às ${turma.hora}.`;
        const waHref = cleanTel ? `https://api.whatsapp.com/send?phone=${cleanTel}&text=${encodeURIComponent(msg)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

        slotsHTML += `
          <div class="student-pill" data-slot-id="${aluno.id}">
            <div class="student-pill-avatar">${initials}</div>
            <div class="student-pill-info">
              <span class="student-pill-name">${pacienteNome}</span>
              <span class="student-pill-status ${statusClass}">● ${statusText}</span>
            </div>
            <div class="student-pill-actions">
              <a href="${waHref}" target="_blank" class="btn-icon-pill btn-whatsapp-pill" title="Confirmar via WhatsApp" style="background: rgba(16,185,129,0.12); color: #10B981; text-decoration: none; display: inline-flex; align-items: center; justify-content: center;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" width="11" height="11"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
              </a>
              <button type="button" class="btn-icon-pill btn-evoluir-pill" data-paciente="${pacienteNome}" data-data="${aluno.date}" data-hora="${turma.hora}" data-prof="${turma.profissional}" title="Evoluir Prontuário" style="background: rgba(11,27,54,0.06); color: var(--color-primary);">
                📝 Evoluir
              </button>
              <button type="button" class="btn-icon-pill btn-grafico-pill" data-paciente="${pacienteNome}" title="Gráfico de Progresso" style="background: rgba(197,160,89,0.12); color: var(--color-secondary);">
                📊
              </button>
              <button type="button" class="btn-icon-pill btn-desencaixar-pill" data-slot-id="${aluno.id}" data-paciente="${pacienteNome}" title="Desencaixar / Excluir Aluno" style="background: rgba(239,68,68,0.08); color: #EF4444;">
                ✕
              </button>
            </div>
          </div>
        `;
      });

      // 2. Slots vazios (botão chamativo de Encaixe de Paciente)
      for (let i = 0; i < vagasLivres; i++) {
        slotsHTML += `
          <button type="button" class="empty-slot-btn btn-encaixar-slot" data-dia="${activeDay}" data-hora="${turma.hora}" data-prof="${turma.profissional}" data-turma-nome="${turma.nome}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>+ Encaixar Paciente</span>
          </button>
        `;
      }

      card.innerHTML = `
        <div class="class-card-header">
          <div class="class-title-group">
            <h4>Turma das ${turma.hora} <span class="modality-badge">${turma.nome}</span></h4>
            <p>Profissional: <strong>${turma.profissional}</strong> · ${activeDay}-feira</p>
          </div>
          <div class="class-header-right">
            <div class="class-occupancy">
              <span class="occupancy-text">${occupancyText}</span>
              <div class="occupancy-bar-bg">
                <div class="occupancy-bar-fill ${occupancyColor}" style="width: ${ocupacaoPct}%;"></div>
              </div>
            </div>
            <button type="button" class="btn-renovar-turma" data-turma-id="${turma.id}" data-hora="${turma.hora}" data-dia="${activeDay}" title="Renovar agendamentos desta turma para a próxima semana (+7 dias)" style="background: rgba(16, 185, 129, 0.12); color: #059669; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 5px 10px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              <span>Renovar (+7 dias)</span>
            </button>
            <button type="button" class="btn-delete-turma" data-turma-id="${turma.id}" data-hora="${turma.hora}" data-dia="${activeDay}" title="Excluir Turma">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              <span>Excluir Turma</span>
            </button>
          </div>
        </div>

        <div class="enrolled-students-grid">
          ${slotsHTML}
        </div>
      `;

      // Event Listeners dentro do card

      // 0) Botão Excluir Turma (Exclui a turma e seus agendamentos no Supabase)
      const btnDeleteTurma = card.querySelector('.btn-delete-turma');
      if (btnDeleteTurma) {
        btnDeleteTurma.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const horaTurma = btnDeleteTurma.dataset.hora;
          const diaTurma = btnDeleteTurma.dataset.dia;
          const turmaId = btnDeleteTurma.dataset.turmaId;

          const msg = enrolled.length > 0
            ? `Deseja realmente excluir a Turma das ${horaTurma} de ${diaTurma}?\n\nEsta turma possui ${enrolled.length} aluno(s) agendado(s). Todos os agendamentos vinculados a esta turma serão removidos permanentemente do Supabase e da Agenda Geral.`
            : `Deseja realmente excluir a Turma das ${horaTurma} de ${diaTurma}?`;

          if (confirm(msg)) {
            // Deletar a turma salva no store
            if (turma.id) {
              ValeStore.deletePilatesTurma(turma.id);
            }
            // Deletar todos os agendamentos do Supabase
            enrolled.forEach(aluno => {
              ValeStore.deleteAgendamento(aluno.id);
            });
            // Re-renderizar
            renderPilatesCards();
          }
        });
      }

      // 0.1) Botão Renovar Turma (+7 dias no Supabase)
      const btnRenovarTurma = card.querySelector('.btn-renovar-turma');
      if (btnRenovarTurma) {
        btnRenovarTurma.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          if (enrolled.length === 0) {
            alert(`A Turma das ${turma.hora} não possui alunos matriculados nesta semana para renovar.\n\nMatricule ou encaixe alunos na turma antes de renovar.`);
            return;
          }

          const baseDate = enrolled[0].date || getDateForWeekday(activeDay);
          const nextDate = addDaysToDate(baseDate, 7);
          const nextDataFormatada = nextDate.split('-').reverse().join('/');

          if (confirm(`Deseja renovar a Turma das ${turma.hora} (${activeDay}) para a próxima semana (${nextDataFormatada})?\n\n${enrolled.length} aluno(s) serão agendados automaticamente com +7 dias no Supabase.`)) {
            let renovados = 0;
            enrolled.forEach(aluno => {
              const novoAg = {
                id: 'slot-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
                date: addDaysToDate(aluno.date || baseDate, 7),
                hora: turma.hora,
                time: turma.hora,
                paciente: aluno.paciente,
                especialidade: moduloNome,
                profissional: turma.profissional || aluno.profissional || 'Dra. Katiane',
                status: 'Aguardando Chegada',
                horarioChegada: null,
                plano_id: aluno.plano_id || null,
                plano_nome: aluno.plano_nome || 'Pilates Studio',
                valor_total: aluno.valor_total || 100,
                valor_clinica: aluno.valor_clinica || 60
              };
              ValeStore.addAgendamento(novoAg);
              renovados++;
            });

            alert(`✅ Sucesso! ${renovados} aluno(s) da Turma das ${turma.hora} foram renovados para ${nextDataFormatada} e sincronizados com a Agenda Geral!`);
            renderPilatesCards();
          }
        });
      }

      // A) Botões de Encaixar Paciente na Vaga Livre
      card.querySelectorAll('.btn-encaixar-slot').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const horaSlot = btn.dataset.hora;
          const diaSlot = btn.dataset.dia;
          const profSlot = btn.dataset.prof;
          const nomeSlot = btn.dataset.turmaNome;

          contextEncaixe = { hora: horaSlot, dia: diaSlot, prof: profSlot, nome: nomeSlot };

          const titleEl = document.getElementById('modalMatricularTitle');
          if (titleEl) titleEl.textContent = `Encaixar Paciente — ${diaSlot} às ${horaSlot}`;

          populatePatientSelects();
          populateTurmasSelect(horaSlot);

          if (modalMatricular) modalMatricular.classList.add('active');
        });
      });

      // B) Botões de Evoluir Prontuário
      card.querySelectorAll('.btn-evoluir-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const pac = btn.dataset.paciente;
          const initials = pac.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

          if (modalEvoluirProntuario) {
            const nameTarget = modalEvoluirProntuario.querySelector('#modalEvolucaoNome');
            const avatarTarget = modalEvoluirProntuario.querySelector('#modalEvolucaoAvatar');
            const dataTarget = modalEvoluirProntuario.querySelector('#modalEvolucaoData');
            const profTarget = modalEvoluirProntuario.querySelector('#modalEvolucaoProf');

            if (nameTarget) nameTarget.textContent = pac;
            if (avatarTarget) avatarTarget.textContent = initials;
            if (dataTarget) dataTarget.textContent = `${btn.dataset.data || hojeDateStr} - ${btn.dataset.hora}`;
            if (profTarget) profTarget.textContent = btn.dataset.prof || turma.profissional;

            modalEvoluirProntuario.classList.add('active');
          }
        });
      });

      // C) Botões de Gráfico de Progresso
      card.querySelectorAll('.btn-grafico-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const pac = btn.dataset.paciente;
          const initials = pac.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

          if (modalGraficoProgresso) {
            const nameTarget = modalGraficoProgresso.querySelector('#modalGraficoNome');
            const avatarTarget = modalGraficoProgresso.querySelector('#modalGraficoAvatar');
            if (nameTarget) nameTarget.textContent = pac;
            if (avatarTarget) avatarTarget.textContent = initials;
            modalGraficoProgresso.classList.add('active');
          }
        });
      });

      // D) Botões de Desencaixar / Cancelar Paciente (Exclusão no Supabase)
      card.querySelectorAll('.btn-desencaixar-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const slotId = btn.dataset.slotId;
          const pac = btn.dataset.paciente;

          if (confirm(`Deseja desencaixar/cancelar o agendamento de ${pac}? A vaga será liberada imediatamente no Pilates e na Agenda Geral.`)) {
            ValeStore.deleteAgendamento(slotId);
            renderPilatesCards();
          }
        });
      });

      container.appendChild(card);
    });
  }

  // 6. Formulário Nova Turma
  const formNovaTurma = document.getElementById('formNovaTurma');
  if (formNovaTurma) {
    formNovaTurma.addEventListener('submit', (e) => {
      e.preventDefault();

      const nome = document.getElementById('turmaNomeInput')?.value || 'Pilates Studio';
      const dia = document.getElementById('turmaDiaSelect')?.value || activeDay;
      const hora = document.getElementById('turmaHoraInput')?.value || '08:00';
      const prof = document.getElementById('turmaProfSelect')?.value || 'Dra. Katiane';

      if (!dia) {
        alert('Por favor, selecione o dia da semana.');
        return;
      }

      const recorrente = document.getElementById('turmaRecorrenteInput')?.checked ?? true;

      // Salvar turma no Store
      ValeStore.addPilatesTurma({
        nome: nome,
        dia: dia,
        hora: hora,
        profissional: prof,
        capacidade: 6,
        recorrente: recorrente
      });

      // Mudar para a aba do dia criado
      activeDay = dia;
      dayTabs.forEach(tab => {
        const tabText = tab.textContent.trim().replace('-feira', '');
        if (tabText === activeDay || activeDay.startsWith(tabText)) {
          dayTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
        }
      });

      if (modalNovaTurma) modalNovaTurma.classList.remove('active');
      formNovaTurma.reset();
      renderPilatesCards();

      alert(`✅ Turma de Pilates (${nome}) criada para ${dia} às ${hora} com 6 vagas livres!`);
    });
  }

  // 7. Formulário Matricular / Encaixar Aluno
  const formMatricular = document.getElementById('formMatricularAluno');
  if (formMatricular) {
    formMatricular.addEventListener('submit', (e) => {
      e.preventDefault();

      const pac = document.getElementById('matricularPacienteSelect')?.value;
      const horaEscolhida = document.getElementById('matricularTurmaSelect')?.value;
      const plano = document.getElementById('matricularPlanoSelect')?.value || 'Encaixe Avulso';

      if (!pac) {
        alert('Por favor, selecione um paciente cadastrado.');
        return;
      }

      const diaDestino = contextEncaixe ? contextEncaixe.dia : activeDay;
      const horaDestino = contextEncaixe ? contextEncaixe.hora : (horaEscolhida || '08:00');
      const profDestino = contextEncaixe ? contextEncaixe.prof : 'Dra. Katiane';
      const dataCalculada = getDateForWeekday(diaDestino);

      // Buscar plano correspondente no catálogo do Supabase
      const planos = (typeof ValeStore !== 'undefined' ? ValeStore.getPlanosServicos() : []) || [];
      const planoPilates = planos.find(p => (p.nome_servico || '').toLowerCase().includes('pilates'));
      const valTot = planoPilates ? planoPilates.valor_total : 100;
      const valCli = planoPilates ? planoPilates.valor_clinica : 60;

      // Criar agendamento real e enviar ao Supabase
      const novoAgendamento = {
        id: 'slot-' + Date.now(),
        date: dataCalculada,
        hora: horaDestino,
        time: horaDestino,
        paciente: pac,
        especialidade: moduloNome,
        profissional: profDestino,
        status: 'Aguardando Chegada',
        horarioChegada: null,
        plano_id: planoPilates ? planoPilates.id : null,
        plano_nome: planoPilates ? planoPilates.nome_servico : plano,
        valor_total: valTot,
        valor_clinica: valCli
      };

      ValeStore.addAgendamento(novoAgendamento);

      if (modalMatricular) modalMatricular.classList.remove('active');
      formMatricular.reset();
      contextEncaixe = null;
      renderPilatesCards();

      alert(`✅ Paciente ${pac} matriculado com sucesso na turma de ${diaDestino} às ${horaDestino}!`);
    });
  }

  // 8. Salvar Evolução do Prontuário no Supabase
  const formEvolucao = document.getElementById('formEvolucaoProntuario');
  if (formEvolucao) {
    formEvolucao.addEventListener('submit', async (e) => {
      e.preventDefault();

      const pacienteNome = document.getElementById('modalEvolucaoNome')?.textContent || 'Paciente';
      const conduta = formEvolucao.querySelector('textarea')?.value || '';
      const activePain = document.querySelector('.pain-btn.active-green, .pain-btn.active-yellow, .pain-btn.active-red');
      const nivelDor = activePain ? parseInt(activePain.dataset.level || '0', 10) : 0;

      if (typeof ValeStore !== 'undefined') {
        ValeStore.addEvolucao({
          paciente: pacienteNome,
          modulo: 'pilates studio',
          procedimentos: conduta,
          nivel_dor: nivelDor,
          data: new Date().toLocaleDateString('pt-BR')
        });
      }

      alert(`✅ Evolução do Prontuário de ${pacienteNome} salva com sucesso!`);
      if (modalEvoluirProntuario) modalEvoluirProntuario.classList.remove('active');
      formEvolucao.reset();
      renderPilatesCards();
    });
  }

  // 9. Escala de Dor
  const painBtns = document.querySelectorAll('.pain-btn');
  painBtns.forEach(pBtn => {
    pBtn.addEventListener('click', () => {
      painBtns.forEach(b => b.className = 'pain-btn');
      const level = parseInt(pBtn.getAttribute('data-level') || '0', 10);
      if (level <= 2) pBtn.classList.add('active-green');
      else if (level <= 5) pBtn.classList.add('active-yellow');
      else pBtn.classList.add('active-red');
    });
  });

  // 10. Fechamento de Modais
  const allModals = [modalNovaTurma, modalMatricular, modalEvoluirProntuario, modalGraficoProgresso];
  allModals.forEach(modal => {
    if (!modal) return;
    const closeBtns = modal.querySelectorAll('.btn-close-modal, .btn-modal-cancel');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modal.classList.remove('active');
        contextEncaixe = null;
      });
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        contextEncaixe = null;
      }
    });
  });

  // 11. FETCH ASSÍNCRONO & SINGLE SOURCE OF TRUTH (Supabase)
  async function fetchDados() {
    try {
      if (typeof ValeStore !== 'undefined') {
        if (ValeStore.syncAgendamentos) await ValeStore.syncAgendamentos();
      }
      populatePatientSelects();
      renderPilatesCards();
    } catch (err) {
      console.error('[Pilates] Erro ao sincronizar dados do Supabase:', err);
      populatePatientSelects();
      renderPilatesCards();
    }
  }

  // Executar fetch inicial
  fetchDados();

  // Reagir a sincronizações em tempo real
  document.addEventListener('valeclinic:dataSynced', () => {
    populatePatientSelects();
    renderPilatesCards();
  });

});

