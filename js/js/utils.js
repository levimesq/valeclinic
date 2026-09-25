/* ==========================================
   ValeClinic - Utilitários Globais Centralizados
   Versão 1.0 - Helpers compartilhados entre módulos
   ========================================== */

// ============================================================
// TAREFA 1: Helper Centralizado de WhatsApp
// Evita duplicação entre agenda.js, fisio.js, fono.js, pilates.js
// ============================================================

/**
 * buildWhatsAppLink(paciente, data, hora, especialidade, telefone?)
 * Constrói o link de confirmação de consulta padronizado para WhatsApp.
 * Template oficial da Dra. Leonarda Vale.
 */
window.buildWhatsAppLink = function buildWhatsAppLink(paciente, data, hora, especialidade, telefone) {
  // Resolver telefone
  let cleanTel = '';
  if (telefone) {
    cleanTel = String(telefone).replace(/\D/g, '');
  } else if (typeof ValeStore !== 'undefined') {
    const pacientes = ValeStore.getPacientes() || [];
    const pacClean = (paciente || '').trim().toLowerCase();
    const pacObj = pacientes.find(p => {
      const n = (p.name || p.nome || '').trim().toLowerCase();
      return n === pacClean || (n && pacClean && (n.includes(pacClean) || pacClean.includes(n)));
    });
    if (pacObj) {
      cleanTel = String(pacObj.phone || pacObj.telefone || '').replace(/\D/g, '');
    }
  }

  if (cleanTel.length >= 10 && !cleanTel.startsWith('55')) cleanTel = '55' + cleanTel;

  // Formatar data para DD/MM/AAAA
  let dataFormatada = data || '';
  if (dataFormatada.includes('-')) {
    const parts = dataFormatada.split('-');
    if (parts.length === 3) dataFormatada = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  // Template oficial
  const msg = [
    `Olá! Seu atendimento está confirmado! 💙`,
    ``,
    `📅 Data: ${dataFormatada}`,
    `⏰ Horário: ${hora}`,
    `📍 Atendimento: ${especialidade || 'Clínica Vale'}`,
    ``,
    `"Cuidar do corpo é também cuidar da qualidade de vida. Cada movimento é um passo em direção ao seu bem-estar."`,
    `Agradecemos a confiança em nosso trabalho.`,
    `Centro de Fisioterapia e Reabilitação Dra. Leonarda Vale`
  ].join('\n');

  return {
    url: cleanTel
      ? `https://api.whatsapp.com/send?phone=${cleanTel}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`,
    hasPhone: !!cleanTel,
    phone: cleanTel,
    message: msg
  };
};

// ============================================================
// TAREFA 5: Filtro TTL de Faltas — apenas faltas recentes (24h / GMT-3)
// ============================================================

window.getTodayDateBR = function getTodayDateBR() {
  const now = new Date();
  const offset = -3 * 60;
  const local = new Date(now.getTime() + (offset - now.getTimezoneOffset()) * 60000);
  return local.toISOString().split('T')[0]; // YYYY-MM-DD
};

/**
 * isFaltaRecente(faltaData, windowHours?)
 * true somente se a falta ocorreu dentro das últimas windowHours (padrão 24h)
 */
window.isFaltaRecente = function isFaltaRecente(faltaData, windowHours) {
  if (!faltaData) return false;
  const h = typeof windowHours === 'number' ? windowHours : 24;
  let dataStr = String(faltaData);
  if (dataStr.includes('/')) {
    const parts = dataStr.split('/');
    if (parts.length === 3) dataStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  const hoje = getTodayDateBR();
  const diffH = (new Date(hoje + 'T12:00:00') - new Date(dataStr + 'T12:00:00')) / (1000 * 3600);
  return diffH >= 0 && diffH <= h;
};

// ============================================================
// TAREFA 6: Logout seguro com encerramento de sessão Supabase
// ============================================================

window.doLogout = async function doLogout() {
  try {
    if (typeof ValeStore !== 'undefined') {
      const db = ValeStore.getClient();
      if (db) await db.auth.signOut();
    }
  } catch (e) {
    console.warn('[Logout] Erro ao encerrar sessão Supabase:', e.message);
  }

  // Remover apenas chaves de sessão (preservar cache clínico)
  ['valeclinic_active_role', 'valeclinic_user_email', 'valeclinic_user_name',
   'sb-nzlwmlieznykmlkcfmsp-auth-token'].forEach(k => {
    try { localStorage.removeItem(k); } catch(_) {}
  });

  window.location.replace('index.html');
};

// Bind automático em todos os botões .btn-logout do DOM
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.btn-logout, [data-action="logout"]').forEach(btn => {
    if (btn.dataset.logoutBound) return;
    btn.dataset.logoutBound = '1';
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      await doLogout();
    });
  });
});
