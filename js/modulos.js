/* ==========================================
   ValeClinic - Módulo Compartilhado
   Interligação Agenda → Módulos Profissionais
   ==========================================
   Ao carregar qualquer módulo (fisio/fono/pilates),
   busca agendamentos do store para hoje e renderiza
   notificação de pacientes agendados para o dia.
*/

document.addEventListener('DOMContentLoaded', () => {

  // ── Detectar qual módulo estamos ─────────────────────────────────────────
  const path = window.location.pathname.toLowerCase();
  let moduloAtual = null;
  if (path.includes('fisio'))    moduloAtual = 'Fisioterapia';
  if (path.includes('fono'))     moduloAtual = 'Fonoaudiologia';
  if (path.includes('pilates'))  moduloAtual = 'Pilates Studio';

  // ── Buscar agendamentos de hoje para este módulo ─────────────────────────
  const todayStr = new Date().toISOString().split('T')[0];

  function getAgendamentosHoje() {
    if (typeof ValeStore === 'undefined' || !moduloAtual) return [];
    const todos = ValeStore.getAgendamentos() || [];
    return todos.filter(a =>
      a.date === todayStr &&
      (a.especialidade === moduloAtual || a.specialty === moduloAtual) &&
      a.status !== 'Cancelado'
    ).sort((a, b) => (a.hora || a.time || '').localeCompare(b.hora || b.time || ''));
  }

  // ── Criar/Atualizar Banner de Agenda do Dia (se aplicável) ────────────────
  function renderAgendaBanner() {
    if (!moduloAtual || moduloAtual === 'Pilates Studio') return; // Pilates tem grid próprio de turmas
    const agendamentos = getAgendamentosHoje();
    let banner = document.getElementById('modulo-agenda-banner');

    if (banner) banner.remove();
    if (agendamentos.length === 0) return;

    const mainContent = document.querySelector('.fisio-content, .fono-content, main');
    if (!mainContent) return;

    banner = document.createElement('div');
    banner.id = 'modulo-agenda-banner';
    banner.style.cssText = `
      background: linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%);
      border: 1px solid rgba(59,130,246,0.2);
      border-radius: 16px;
      padding: 20px 24px;
      margin-bottom: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    const hoje = new Date(todayStr + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
    const hojeFormatado = hoje.charAt(0).toUpperCase() + hoje.slice(1);

    banner.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; padding-bottom:12px; border-bottom:1px solid rgba(59,130,246,0.15);">
        <div style="width:40px;height:40px;background:rgba(59,130,246,0.12);border-radius:10px;display:flex;align-items:center;justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        </div>
        <div>
          <h4 style="font-family:var(--font-title);font-size:1rem;color:var(--color-primary);margin:0;">Agenda do Dia — ${hojeFormatado}</h4>
          <p style="font-size:0.82rem;color:var(--color-text-muted);margin:4px 0 0;">${agendamentos.length} paciente(s) agendado(s) para ${moduloAtual}</p>
        </div>
      </div>
      <div id="modulo-pacientes-lista" style="display:flex;flex-direction:column;gap:8px;"></div>
    `;

    mainContent.insertBefore(banner, mainContent.firstChild);

    const lista = document.getElementById('modulo-pacientes-lista');
    agendamentos.forEach(a => {
      const hora = a.hora || a.time || '08:00';
      const paciente = a.paciente || a.patient || 'Paciente';
      const profissional = a.profissional || a.doctor || 'Profissional';
      const status = a.status || 'Aguardando Chegada';

      const statusColor = status.includes('Presente') ? '#10B981' :
                         status.includes('Faltou') || status.includes('Faltoso') ? '#EF4444' : '#F59E0B';
      const statusText = status.includes('Presente') ? 'Presente' :
                        status.includes('Faltou') || status.includes('Faltoso') ? 'Faltou' : 'Aguardando';
      const initials = paciente.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

      const item = document.createElement('div');
      item.style.cssText = `
        display:flex; align-items:center; gap:12px; padding:12px 16px;
        background:#FFFFFF; border-radius:10px; border:1px solid #E2E8F0;
        transition:box-shadow 0.2s ease;
      `;
      item.onmouseover = () => item.style.boxShadow = '0 4px 12px rgba(11,27,54,0.08)';
      item.onmouseout  = () => item.style.boxShadow = 'none';

      item.innerHTML = `
        <div style="width:36px;height:36px;border-radius:50%;background:var(--color-secondary,#C5A059);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.78rem;flex-shrink:0;">${initials}</div>
        <div style="flex:1;">
          <span style="font-weight:700;font-size:0.9rem;color:var(--color-primary);display:block;">${paciente}</span>
          <span style="font-size:0.78rem;color:var(--color-text-muted);">Prof. ${profissional} · ${hora}</span>
        </div>
        <span style="padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;background:${statusColor}18;color:${statusColor};">${statusText}</span>
      `;

      lista.appendChild(item);
    });
  }

  // ── Alertas Reais de Abandono e Notificações Dinâmicas ─────────────────────
  function atualizarNotificacoesGlobais() {
    if (typeof ValeStore === 'undefined') return;
    const alertas = ValeStore.getAlertasAbandono() || [];

    // Atualizar badges do header
    const badges = document.querySelectorAll('.notification-badge, #notifBadgeCount');
    badges.forEach(badge => {
      if (alertas.length > 0) {
        badge.style.display = 'flex';
        badge.textContent = alertas.length;
        badge.classList.add('active');
      } else {
        badge.style.display = 'none';
        badge.textContent = '0';
        badge.classList.remove('active');
      }
    });

    // Atualizar popover se presente na página
    const popover = document.getElementById('notificationsPopover');
    if (popover) {
      if (alertas.length === 0) {
        popover.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #E2E8F0; margin-bottom: 12px;">
            <h4 style="font-family: var(--font-title); color: var(--color-primary); font-size: 1rem; margin:0;">Notificações</h4>
            <span style="font-size: 0.75rem; background: #F1F5F9; color: #64748B; padding: 2px 8px; border-radius: 10px; font-weight: 700;">0 Novas</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.82rem;">
            <div style="padding: 12px; background: #F8FAFC; border-radius: 8px; color: var(--color-text-muted); text-align: center;">
              Nenhuma notificação no momento.
            </div>
          </div>
        `;
      } else {
        const itensHTML = alertas.map(a => `
          <div style="padding: 10px; background: #FEF2F2; border-radius: 8px; border-left: 3px solid #EF4444;">
            <strong>⚠️ Alerta de Abandono:</strong> ${a.nome} faltou a 2 sessões seguidas sem justificativa (${a.modulo}).
          </div>
        `).join('');

        popover.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #E2E8F0; margin-bottom: 12px;">
            <h4 style="font-family: var(--font-title); color: var(--color-primary); font-size: 1rem; margin:0;">Notificações</h4>
            <span style="font-size: 0.75rem; background: rgba(239,68,68,0.1); color: #EF4444; padding: 2px 8px; border-radius: 10px; font-weight: 700;">${alertas.length} Nova(s)</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.82rem;">
            ${itensHTML}
          </div>
        `;
      }
    }
  }

  // Executar renderização inicial
  renderAgendaBanner();
  atualizarNotificacoesGlobais();

  // Re-executar quando os dados forem sincronizados
  document.addEventListener('valeclinic:dataSynced', () => {
    renderAgendaBanner();
    atualizarNotificacoesGlobais();
  });
});
