/* ==========================================
   ValeClinic - Módulo Pilates Studio
   Sincronização Supabase + Gestão Inteligente de 4 Vagas (Encaixes)
   Versão 5.0 - Produção / Soft Launch
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {

  const moduloNome = 'Pilates Studio';
  let activeDay = 'Segunda';

  // 1. Determinar dia atual com blindagem de fuso local
  const hojeDateStr = new Date().toISOString().split('T')[0];
  const hojeDiaSemana = typeof ValeStore !== 'undefined' ? ValeStore.getDiaSemana(hojeDateStr) : 'Segunda';
  if (hojeDiaSemana && hojeDiaSemana !== 'Domingo') {
    activeDay = hojeDiaSemana;
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

  // Helper para calcular a data ISO correspondente ao dia da semana selecionado
  function getDateForWeekday(weekdayName) {
    const diasMap = { 'Domingo': 0, 'Segunda': 1, 'Terça': 2, 'Quarta': 3, 'Quinta': 4, 'Sexta': 5, 'Sábado': 6 };
    const targetDayIndex = diasMap[weekdayName] ?? 1;

    const now = new Date();
    const currentDayIndex = now.getDay();
    let diff = targetDayIndex - currentDayIndex;

    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + diff);
    return targetDate.toISOString().split('T')[0];
  }

  // Popular seletor de pacientes ativos (100% Supabase / Store)
  function populatePatientSelects() {
    if (typeof ValeStore === 'undefined') return;
    const pacientesAtivos = ValeStore.getPacientesAtivos() || [];

    const pacSelect = document.getElementById('matricularPacienteSelect');
    if (pacSelect) {
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

      const vagasLivres = Math.max(0, 4 - enrolledCount);
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

    const pilatesAg = allAg.filter(a =>
      (a.especialidade === moduloNome || a.especialidade === 'Pilates') &&
      a.status !== 'Cancelado'
    );

    const diaAg = pilatesAg.filter(a => ValeStore.getDiaSemana(a.date) === dia);

    const turmasMap = new Map();

    // 1. Adicionar turmas criadas explicitamente
    customTurmas.filter(t => t.dia === dia).forEach(t => {
      turmasMap.set(t.hora, {
        id: t.id,
        nome: t.nome || 'Pilates Studio',
        dia: t.dia || dia,
        hora: t.hora,
        profissional: t.profissional || 'Dra. Leonarda Vale',
        capacidade: 4,
        isCustom: true
      });
    });

    // 2. Adicionar turmas derivadas de agendamentos
    diaAg.forEach(a => {
      const hora = a.hora || a.time || '08:00';
      if (!turmasMap.has(hora)) {
        turmasMap.set(hora, {
          id: 'turma-slot-' + hora,
          nome: a.especialidade || 'Pilates Studio',
          dia: dia,
          hora: hora,
          profissional: a.profissional || 'Dra. Leonarda Vale',
          capacidade: 4,
          isCustom: false
        });
      }
    });

    // Ordenar cronologicamente
    return Array.from(turmasMap.values()).sort((a, b) => a.hora.localeCompare(b.hora));
  }

  // 5. Renderização dos Cards do Pilates com 4 Slots Fixos (Lógica de Encaixe)
  function renderPilatesCards() {
    if (typeof ValeStore === 'undefined') return;
    const container = document.getElementById('pilatesClassesList');
    if (!container) return;

    const allAgendamentos = ValeStore.getAgendamentos() || [];

    // Filtrar por especialidade Pilates e status ativo
    const pilatesAgendamentos = allAgendamentos.filter(a =>
      (a.especialidade === moduloNome || a.especialidade === 'Pilates') &&
      a.status !== 'Cancelado'
    );

    const diaAgendamentos = pilatesAgendamentos.filter(a =>
      ValeStore.getDiaSemana(a.date) === activeDay
    );

    const turmasDoDia = getTurmasDoDia(activeDay);

    // Atualizar KPIs
    const alunosDistintos = new Set(pilatesAgendamentos.map(a => a.paciente)).size;
    let totalVagasLivresDia = 0;

    turmasDoDia.forEach(t => {
      const enrolled = diaAgendamentos.filter(a => (a.hora || a.time || '08:00') === t.hora);
      totalVagasLivresDia += Math.max(0, 4 - enrolled.length);
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
          <p style="font-size: 0.88rem; margin-top: 6px;">Clique no botão "+ Nova Turma" acima para abrir um novo horário de 4 vagas.</p>
        </div>
      `;
      return;
    }

    // Renderizar cada Turma com 4 Slots
    turmasDoDia.forEach(turma => {
      const enrolled = diaAgendamentos.filter(a => (a.hora || a.time || '08:00') === turma.hora);
      const totalAlunos = enrolled.length;
      const vagasLivres = Math.max(0, 4 - totalAlunos);
      const ocupacaoPct = Math.min(100, Math.round((totalAlunos / 4) * 100));

      let occupancyColor = 'green';
      let occupancyText = `${totalAlunos}/4 Vagas Preenchidas (${vagasLivres} livre${vagasLivres === 1 ? '' : 's'})`;

      if (totalAlunos === 3) {
        occupancyColor = 'orange';
        occupancyText = `3/4 Vagas Preenchidas (1 Vaga Livre para Encaixe!)`;
      } else if (totalAlunos >= 4) {
        occupancyColor = 'red';
        occupancyText = `4/4 Turma Lotada (100%)`;
      } else if (totalAlunos === 0) {
        occupancyText = `0/4 Vagas Preenchidas (4 Vagas Livres)`;
      }

      const card = document.createElement('article');
      card.className = 'class-card';
      card.dataset.day = activeDay;
      card.dataset.hora = turma.hora;

      // Montar slots: sempre exatamente 4 slots
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

        slotsHTML += `
          <div class="student-pill" data-slot-id="${aluno.id}">
            <div class="student-pill-avatar">${initials}</div>
            <div class="student-pill-info">
              <span class="student-pill-name">${pacienteNome}</span>
              <span class="student-pill-status ${statusClass}">● ${statusText}</span>
            </div>
            <div class="student-pill-actions">
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
          <div class="class-occupancy">
            <span class="occupancy-text">${occupancyText}</span>
            <div class="occupancy-bar-bg">
              <div class="occupancy-bar-fill ${occupancyColor}" style="width: ${ocupacaoPct}%;"></div>
            </div>
          </div>
        </div>

        <div class="enrolled-students-grid">
          ${slotsHTML}
        </div>
      `;

      // Event Listeners dentro do card

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
      const prof = document.getElementById('turmaProfSelect')?.value || 'Dra. Leonarda Vale';

      if (!dia) {
        alert('Por favor, selecione o dia da semana.');
        return;
      }

      // Salvar turma no Store
      ValeStore.addPilatesTurma({
        nome: nome,
        dia: dia,
        hora: hora,
        profissional: prof,
        capacidade: 4
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

      alert(`✅ Turma de Pilates (${nome}) criada para ${dia} às ${hora} com 4 vagas livres!`);
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
      const profDestino = contextEncaixe ? contextEncaixe.prof : 'Dra. Leonarda Vale';
      const dataCalculada = getDateForWeekday(diaDestino);

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
        horarioChegada: null
      };

      ValeStore.addAgendamento(novoAgendamento);

      if (modalMatricular) modalMatricular.classList.remove('active');
      formMatricular.reset();
      contextEncaixe = null;
      renderPilatesCards();

      alert(`✅ Paciente ${pac} encaixado com sucesso na turma de ${diaDestino} às ${horaDestino}!`);
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

  // 11. Boot inicial e sincronização ativa com o Supabase
  populatePatientSelects();
  if (typeof ValeStore !== 'undefined' && ValeStore.syncAgendamentos) {
    ValeStore.syncAgendamentos().then(() => {
      populatePatientSelects();
      renderPilatesCards();
    });
  } else {
    renderPilatesCards();
  }

  document.addEventListener('valeclinic:dataSynced', () => {
    populatePatientSelects();
    renderPilatesCards();
  });

});

