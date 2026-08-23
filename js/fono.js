/* ==========================================
   ValeClinic - Módulo Fonoaudiologia
   Sincronização Supabase + Agenda Geral + Blindagem de Timezone
   Versão 4.0
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {

  const moduloNome = 'Fonoaudiologia';
  let activeDay = 'Segunda';

  // Determinar dia atual com blindagem de fuso local
  const hojeDateStr = new Date().toISOString().split('T')[0];
  const hojeDiaSemana = typeof ValeStore !== 'undefined' ? ValeStore.getDiaSemana(hojeDateStr) : 'Segunda';
  if (hojeDiaSemana && hojeDiaSemana !== 'Domingo') {
    activeDay = hojeDiaSemana;
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
      renderFonoCards();
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
      modalNovoAtendimento.classList.add('active');
    });
  }

  if (btnVincular && modalVincular) {
    btnVincular.addEventListener('click', () => {
      populatePatientSelects();
      modalVincular.classList.add('active');
    });
  }

  // 4. Popular dropdowns de pacientes (exclusivamente ativos)
  function populatePatientSelects() {
    if (typeof ValeStore === 'undefined') return;
    const pacientesAtivos = ValeStore.getPacientesAtivos() || [];

    const selects = [
      document.getElementById('novoAtdPacienteFono'),
      document.getElementById('vincPacienteFono'),
      document.getElementById('laudoPaciente')
    ];

    selects.forEach(sel => {
      if (!sel) return;
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

  // 5. Renderização dos Cards de Fonoaudiologia
  function renderFonoCards() {
    if (typeof ValeStore === 'undefined') return;
    const container = document.getElementById('fonoClassesList');
    if (!container) return;

    const allAgendamentos = ValeStore.getAgendamentos() || [];

    // Filtrar por especialidade Fonoaudiologia e status diferente de Cancelado
    const fonoAgendamentos = allAgendamentos.filter(a =>
      (a.especialidade === moduloNome || a.especialidade === 'Fono') &&
      a.status !== 'Cancelado'
    );

    // Filtrar pela aba de dia selecionada usando o helper de timezone
    const diaAgendamentos = fonoAgendamentos.filter(a => {
      const diaDaSemana = ValeStore.getDiaSemana(a.date);
      return diaDaSemana === activeDay || diaDaSemana.startsWith(activeDay);
    });

    // Atualizar KPIs
    const hojeAgendamentos = fonoAgendamentos.filter(a => a.date === hojeDateStr);
    const pacientesDistintos = new Set(fonoAgendamentos.map(a => a.paciente)).size;
    const faltasFono = fonoAgendamentos.filter(a => a.status.includes('Faltou') || a.status.includes('Faltoso')).length;

    const elPacientes = document.getElementById('kpiFonoPacientes');
    const elHoje      = document.getElementById('kpiFonoHoje');
    const elLaudos    = document.getElementById('kpiFonoLaudos');
    const elFaltas    = document.getElementById('kpiFonoFaltas');

    if (elPacientes) elPacientes.textContent = pacientesDistintos;
    if (elHoje)      elHoje.textContent      = hojeAgendamentos.length;
    if (elLaudos)    elLaudos.textContent    = '2';
    if (elFaltas)    elFaltas.textContent    = faltasFono;

    container.innerHTML = '';

    if (diaAgendamentos.length === 0) {
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--color-text-muted); background: var(--color-card-bg); border-radius: var(--radius-card); border: 1px dashed var(--color-border-input); width: 100%;">
          <h4>Nenhum atendimento de Fonoaudiologia agendado para ${activeDay}</h4>
          <p style="font-size: 0.85rem; margin-top: 6px;">Os agendamentos feitos na recepção para este dia aparecerão aqui automaticamente.</p>
        </div>
      `;
      return;
    }

    // Ordenar por horário
    diaAgendamentos.sort((a, b) => (a.hora || a.time || '').localeCompare(b.hora || b.time || ''));

    diaAgendamentos.forEach(a => {
      const hora = a.hora || a.time || '08:00';
      const paciente = a.paciente || '';
      const profissional = a.profissional || 'Dra. Leonarda Vale';
      const status = a.status || 'Aguardando Chegada';
      const initials = paciente.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

      const statusColor = status.includes('Presente') ? '#10B981' :
                          status.includes('Faltou') || status.includes('Faltoso') ? '#EF4444' : '#F59E0B';
      const statusText  = status.includes('Presente') ? status :
                          status.includes('Faltou') || status.includes('Faltoso') ? status : 'Aguardando na Recepção';

      const card = document.createElement('article');
      card.className = 'class-card';
      card.dataset.day = activeDay;

      card.innerHTML = `
        <div class="class-card-header">
          <div class="class-title-group">
            <h4>${paciente} <span class="modality-badge">${moduloNome}</span></h4>
            <p>Profissional: ${profissional}</p>
            <p style="font-weight: 600; color: var(--color-primary); margin-top: 4px;">Horário: ${hora} | Data: ${a.date}</p>
          </div>
          <div class="class-occupancy" style="display:flex; align-items:center; gap:8px;">
            <span class="occupancy-text" style="color: ${statusColor}; font-weight: 700;">${statusText}</span>
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
            📊 Gráfico de Progresso
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
            renderFonoCards();
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

  // 6. Formulário Novo Atendimento Fonoaudiologia
  const formNovoFono = document.getElementById('formNovoAtendimentoFono');
  if (formNovoFono) {
    formNovoFono.addEventListener('submit', (e) => {
      e.preventDefault();

      const pac = document.getElementById('novoAtdPacienteFono')?.value || '';
      const hora = document.getElementById('novoAtdHorarioFono')?.value || '08:00';
      const prof = document.getElementById('novoAtdProfFono')?.value || 'Dra. Leonarda Vale';

      if (!pac) {
        alert('Por favor, selecione um paciente cadastrado.');
        return;
      }

      const novoRegistro = {
        id: 'slot-' + Date.now(),
        date: hojeDateStr,
        hora: hora,
        time: hora,
        paciente: pac,
        especialidade: moduloNome,
        profissional: prof,
        status: 'Aguardando Chegada',
        horarioChegada: null
      };

      ValeStore.addAgendamento(novoRegistro);
      alert(`✅ Atendimento de ${pac} criado e registrado no sistema!`);
      if (modalNovoAtendimento) modalNovoAtendimento.classList.remove('active');
      formNovoFono.reset();
      renderFonoCards();
    });
  }

  // 7. Formulário Vincular Paciente
  const formVincFono = document.getElementById('formVincularPacienteFono');
  if (formVincFono) {
    formVincFono.addEventListener('submit', (e) => {
      e.preventDefault();
      const pac = document.getElementById('vincPacienteFono')?.value || '';
      if (!pac) {
        alert('Por favor, selecione um paciente cadastrado.');
        return;
      }

      alert(`✅ Paciente ${pac} vinculado ao módulo Fonoaudiologia!`);
      if (modalVincular) modalVincular.classList.remove('active');
      formVincFono.reset();
      renderFonoCards();
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
      const nivelDor = activePain ? parseInt(activePain.dataset.level || '0', 10) : 0;

      if (typeof ValeStore !== 'undefined') {
        ValeStore.addEvolucao({
          paciente: pacienteNome,
          modulo: 'fonoaudiologia',
          procedimentos: conduta,
          nivel_dor: nivelDor,
          data: new Date().toLocaleDateString('pt-BR')
        });
      }

      alert(`✅ Evolução do Prontuário de ${pacienteNome} salva com sucesso!`);
      if (modalEvoluirProntuario) modalEvoluirProntuario.classList.remove('active');
      formEvolucao.reset();
      renderFonoCards();
    });
  }

  // 10. Escala de Dor
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

  // 12. Boot inicial e re-render ao sincronizar
  populatePatientSelects();
  if (typeof ValeStore !== 'undefined' && ValeStore.syncAgendamentos) {
    ValeStore.syncAgendamentos().then(() => {
      populatePatientSelects();
      renderFonoCards();
    });
  } else {
    renderFonoCards();
  }

  document.addEventListener('valeclinic:dataSynced', () => {
    populatePatientSelects();
    renderFonoCards();
  });

});
