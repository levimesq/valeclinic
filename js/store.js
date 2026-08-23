/* ==========================================
   ValeClinic - Store Centralizado (Single Source of Truth)
   Integração Supabase + LocalStorage (Optimistic UI)
   Versão 4.0 - Padronização PT-BR e Blindagem de Timezone
   ========================================== */

const ValeStore = (() => {

  // ============================================
  // CONFIGURAÇÃO SUPABASE
  // ============================================
  const SUPABASE_URL = 'https://nzlwmlieznykmlkcfmsp.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56bHdtbGllem55a21sa2NmbXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNjExODUsImV4cCI6MjEwMDkzNzE4NX0.SumL1Iu4G9Y1pNb0nsqirC1CqJs8x2gtqke_pFvQhJM';

  let _supabase = null;

  function getClient() {
    if (_supabase) return _supabase;
    try {
      if (window.supabase && window.supabase.createClient) {
        _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      }
    } catch (e) {
      console.warn('[ValeStore] Supabase não carregado:', e);
    }
    return _supabase;
  }

  // ============================================
  // CHAVES DO LOCALSTORAGE
  // ============================================
  const KEYS = {
    AGENDAMENTOS:   'valeclinic_agendamentos',
    FINANCEIRO:     'valeclinic_financeiro',
    EQUIPE:         'valeclinic_equipe',
    FALTAS:         'valeclinic_faltas',
    PACIENTES:      'valeclinic_pacientes',
    EVOLUCOES:      'valeclinic_evolucoes',
    PILATES_TURMAS: 'valeclinic_pilates_turmas'
  };

  const INITIAL_AGENDAMENTOS   = [];
  const INITIAL_FINANCEIRO     = [];
  const INITIAL_FALTAS         = [];
  const INITIAL_PACIENTES      = [];
  const INITIAL_EQUIPE         = [];
  const INITIAL_EVOLUCOES      = [];
  const INITIAL_PILATES_TURMAS = [];

  // ============================================
  // HELPERS LOCALSTORAGE
  // ============================================
  function localLoad(key, defaultData) {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return defaultData;
      return JSON.parse(stored);
    } catch (e) {
      return defaultData;
    }
  }

  function localSave(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('[ValeStore] Erro ao salvar localStorage:', e);
    }
  }

  function dispatchSync(table) {
    document.dispatchEvent(new CustomEvent('valeclinic:dataSynced', { detail: { table } }));
  }

  // ============================================
  // TIMEZONE SHIELDING (GMT-3 / Local Time)
  // ============================================
  /**
   * Converte 'YYYY-MM-DD' para dia da semana em português sem desvios UTC.
   */
  function getDiaSemana(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    const year  = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day   = parseInt(parts[2], 10);
    // Meio-dia local (12:00) garante imunidade total a shifts de timezone UTC
    const d = new Date(year, month, day, 12, 0, 0);
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return dias[d.getDay()] || '';
  }

  // ============================================
  // OPERAÇÕES SUPABASE (Single Source of Truth)
  // ============================================

  /**
   * Normalização de registros da tabela agendamentos do Supabase
   */
  function normalizeAgendamento(row) {
    if (!row) return null;
    const hora = row.hora || row.time || '08:00';
    return {
      id: String(row.id),
      date: row.date || new Date().toISOString().split('T')[0],
      hora: hora,
      time: hora,
      paciente: row.paciente || '',
      especialidade: row.especialidade || 'Pilates Studio',
      profissional: row.profissional || 'Dra. Leonarda Vale',
      status: row.status || 'Aguardando Chegada',
      horarioChegada: row.horarioChegada || null,
      created_at: row.created_at || null
    };
  }

  /**
   * Puxa dados do Supabase e atualiza o localStorage.
   */
  async function pullFromSupabase(table, localKey, defaultData) {
    const db = getClient();
    if (!db) return localLoad(localKey, defaultData);
    try {
      const { data, error } = await db.from(table).select('*');
      if (error) throw error;

      let result = data || [];
      if (table === 'agendamentos') {
        result = result.map(normalizeAgendamento).filter(Boolean);
      }

      localSave(localKey, result);
      dispatchSync(table);
      console.log(`[ValeStore] Sync OK: ${table} (${result.length} registros)`);
      return result;
    } catch (e) {
      console.warn(`[ValeStore] Falha ao puxar ${table}:`, e.message);
      return localLoad(localKey, defaultData);
    }
  }

  /**
   * Filtra payload e envia para o Supabase apenas as colunas aceitas pelo banco.
   */
  async function upsertOne(table, record) {
    const db = getClient();
    if (!db || !record) return;
    try {
      let payload = { ...record };

      if (table === 'agendamentos') {
        const horaVal = record.hora || record.time || '08:00';
        payload = {
          id: String(record.id),
          date: record.date,
          hora: horaVal,
          time: horaVal,
          paciente: record.paciente || '',
          especialidade: record.especialidade || 'Pilates Studio',
          profissional: record.profissional || 'Dra. Leonarda Vale',
          status: record.status || 'Aguardando Chegada',
          horarioChegada: record.horarioChegada || null
        };
      } else if (table === 'faltas') {
        payload = {
          id: String(record.id),
          paciente: record.paciente || '',
          data: record.data || record.date || new Date().toISOString().split('T')[0],
          motivo: record.motivo || '',
          modulo: record.modulo || '',
          justificada: !!record.justificada,
          justificativa: record.justificativa || ''
        };
      } else if (table === 'pacientes') {
        payload = {
          id: String(record.id),
          name: record.name || record.nome || '',
          phone: record.phone || record.telefone || '',
          birth: record.birth || record.nascimento || '',
          notes: record.notes || record.observacoes || '',
          specialty: record.specialty || record.especialidade || ''
        };
      }

      const { error } = await db.from(table).upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    } catch (e) {
      console.warn(`[ValeStore] Falha ao salvar em ${table}:`, e.message);
    }
  }

  async function deleteOne(table, id) {
    const db = getClient();
    if (!db) return;
    try {
      const { error } = await db.from(table).delete().eq('id', String(id));
      if (error) throw error;
    } catch (e) {
      console.warn(`[ValeStore] Falha ao deletar de ${table}:`, e.message);
    }
  }

  async function syncAll() {
    await Promise.allSettled([
      pullFromSupabase('pacientes',    KEYS.PACIENTES,    INITIAL_PACIENTES),
      pullFromSupabase('agendamentos', KEYS.AGENDAMENTOS, INITIAL_AGENDAMENTOS),
      pullFromSupabase('financeiro',   KEYS.FINANCEIRO,   INITIAL_FINANCEIRO),
      pullFromSupabase('faltas',       KEYS.FALTAS,       INITIAL_FALTAS),
      pullFromSupabase('equipe',       KEYS.EQUIPE,       INITIAL_EQUIPE),
      pullFromSupabase('evolucoes',    KEYS.EVOLUCOES,    INITIAL_EVOLUCOES)
    ]);
  }

  // Inicialização no boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(syncAll, 100));
  } else {
    setTimeout(syncAll, 100);
  }

  // ============================================
  // API PÚBLICA
  // ============================================
  return {

    getClient,
    syncAll,
    getDiaSemana,

    // ── AGENDAMENTOS ────────────────────────────
    getAgendamentos: () => localLoad(KEYS.AGENDAMENTOS, INITIAL_AGENDAMENTOS),

    syncAgendamentos: async () => {
      return await pullFromSupabase('agendamentos', KEYS.AGENDAMENTOS, INITIAL_AGENDAMENTOS);
    },

    addAgendamento: (r) => {
      const all = localLoad(KEYS.AGENDAMENTOS, INITIAL_AGENDAMENTOS);
      const nr  = normalizeAgendamento({ ...r, id: String(r.id || ('slot-' + Date.now())) });
      all.push(nr);
      localSave(KEYS.AGENDAMENTOS, all);
      upsertOne('agendamentos', nr);
      dispatchSync('agendamentos');
      return all;
    },

    updateAgendamento: (id, changes) => {
      const all = localLoad(KEYS.AGENDAMENTOS, INITIAL_AGENDAMENTOS);
      const i   = all.findIndex(a => String(a.id) === String(id));
      if (i !== -1) {
        all[i] = normalizeAgendamento({ ...all[i], ...changes, id: String(id) });
        localSave(KEYS.AGENDAMENTOS, all);
        upsertOne('agendamentos', all[i]);
        dispatchSync('agendamentos');
      }
      return all;
    },

    saveAgendamentos: (data) => {
      const normalized = data.map(normalizeAgendamento).filter(Boolean);
      localSave(KEYS.AGENDAMENTOS, normalized);
      normalized.forEach(r => upsertOne('agendamentos', r));
      dispatchSync('agendamentos');
    },

    deleteAgendamento: (id) => {
      const all = localLoad(KEYS.AGENDAMENTOS, INITIAL_AGENDAMENTOS).filter(a => String(a.id) !== String(id));
      localSave(KEYS.AGENDAMENTOS, all);
      deleteOne('agendamentos', id);
      dispatchSync('agendamentos');
      return all;
    },

    // ── PACIENTES ────────────────────────────────
    getPacientes: () => localLoad(KEYS.PACIENTES, INITIAL_PACIENTES),

    /**
     * Retorna EXCLUSIVAMENTE os pacientes ativos para preenchimento de dropdowns.
     */
    getPacientesAtivos: () => {
      const all = localLoad(KEYS.PACIENTES, INITIAL_PACIENTES);
      return all.filter(p => {
        const nome = (p.name || p.nome || '').trim();
        if (!nome) return false;
        const status = (p.status || 'ativo').toLowerCase();
        return status === 'ativo';
      });
    },

    addPaciente: (r) => {
      const all = localLoad(KEYS.PACIENTES, INITIAL_PACIENTES);
      const nr  = {
        id: String(r.id || ('pac-' + Date.now())),
        name: r.name || r.nome || '',
        phone: r.phone || r.telefone || '',
        birth: r.birth || r.nascimento || '',
        notes: r.notes || r.observacoes || '',
        specialty: r.specialty || r.especialidade || '',
        status: r.status || 'Ativo'
      };
      all.push(nr);
      localSave(KEYS.PACIENTES, all);
      upsertOne('pacientes', nr);
      return all;
    },

    updatePaciente: (id, changes) => {
      const all = localLoad(KEYS.PACIENTES, INITIAL_PACIENTES);
      const i   = all.findIndex(p => String(p.id) === String(id));
      if (i !== -1) {
        all[i] = { ...all[i], ...changes, id: String(id) };
        localSave(KEYS.PACIENTES, all);
        upsertOne('pacientes', all[i]);
      }
      return all;
    },

    savePacientes: (data) => {
      localSave(KEYS.PACIENTES, data);
      data.forEach(r => upsertOne('pacientes', r));
    },

    deletePaciente: (id) => {
      const all = localLoad(KEYS.PACIENTES, INITIAL_PACIENTES).filter(p => String(p.id) !== String(id));
      localSave(KEYS.PACIENTES, all);
      deleteOne('pacientes', id);
      return all;
    },

    // ── FALTAS ───────────────────────────────────
    getFaltas: () => localLoad(KEYS.FALTAS, INITIAL_FALTAS),

    addFalta: (r) => {
      const all = localLoad(KEYS.FALTAS, INITIAL_FALTAS);
      const nr  = {
        id: String(r.id || ('flt-' + Date.now())),
        paciente: r.paciente || '',
        data: r.data || r.date || new Date().toISOString().split('T')[0],
        motivo: r.motivo || '',
        modulo: r.modulo || '',
        justificada: !!r.justificada,
        justificativa: r.justificativa || ''
      };
      all.push(nr);
      localSave(KEYS.FALTAS, all);
      upsertOne('faltas', nr);
      return all;
    },

    saveFaltas: (data) => {
      localSave(KEYS.FALTAS, data);
      data.forEach(r => upsertOne('faltas', r));
    },

    // ── REGRA ESTRITA DE EVASÃO (2 Faltas Consecutivas) ──
    /**
     * Varrer o histórico cronológico de cada paciente.
     * Retorna apenas quem tem as últimas 2 ocorrências como faltas sem justificativa.
     */
    getAlertasAbandono: () => {
      const agendamentos = localLoad(KEYS.AGENDAMENTOS, INITIAL_AGENDAMENTOS);
      const faltas = localLoad(KEYS.FALTAS, INITIAL_FALTAS);
      const pacientes = localLoad(KEYS.PACIENTES, INITIAL_PACIENTES);

      // Agrupar eventos finalizados por paciente
      const eventosPorPaciente = {};

      agendamentos.forEach(a => {
        const nome = (a.paciente || '').trim();
        if (!nome || a.status === 'Cancelado' || a.status === 'Aguardando' || a.status === 'Aguardando Chegada') return;

        if (!eventosPorPaciente[nome]) eventosPorPaciente[nome] = [];
        
        let tipo = 'presenca';
        if (a.status.includes('Sem Justificativa') || a.status === 'Faltou' || a.status === 'Faltoso') {
          tipo = 'falta_injustificada';
        } else if (a.status.includes('Justificado')) {
          tipo = 'falta_justificada';
        } else if (a.status.includes('Presente') || a.status.includes('Confirmado') || a.status.includes('Em Atendimento')) {
          tipo = 'presenca';
        }

        eventosPorPaciente[nome].push({
          data: a.date,
          hora: a.hora || a.time || '00:00',
          modulo: a.especialidade || 'Pilates Studio',
          tipo: tipo
        });
      });

      // Incluir faltas registradas avulsas na tabela faltas
      faltas.forEach(f => {
        const nome = (f.paciente || '').trim();
        if (!nome) return;
        if (!eventosPorPaciente[nome]) eventosPorPaciente[nome] = [];
        eventosPorPaciente[nome].push({
          data: f.data,
          hora: '00:00',
          modulo: f.modulo || 'Geral',
          tipo: f.justificada ? 'falta_justificada' : 'falta_injustificada'
        });
      });

      const alertas = [];

      Object.entries(eventosPorPaciente).forEach(([nome, eventos]) => {
        // Ordenar cronologicamente
        eventos.sort((x, y) => (x.data + ' ' + x.hora).localeCompare(y.data + ' ' + y.hora));

        // Analisar consecutividade nas ocorrências finais
        if (eventos.length >= 2) {
          const penultimo = eventos[eventos.length - 2];
          const ultimo    = eventos[eventos.length - 1];

          if (penultimo.tipo === 'falta_injustificada' && ultimo.tipo === 'falta_injustificada') {
            const pacInfo = pacientes.find(p => p.name === nome) || {};
            alertas.push({
              nome,
              faltasConsecutivas: 2,
              modulo: ultimo.modulo || 'Clínica Geral',
              telefone: pacInfo.phone || ''
            });
          }
        }
      });

      return alertas;
    },

    // ── FINANCEIRO ───────────────────────────────
    getFinanceiro: () => localLoad(KEYS.FINANCEIRO, INITIAL_FINANCEIRO),

    addFinanceiro: (r) => {
      const all = localLoad(KEYS.FINANCEIRO, INITIAL_FINANCEIRO);
      const nr  = { ...r, id: String(r.id || ('fin-' + Date.now())) };
      all.unshift(nr);
      localSave(KEYS.FINANCEIRO, all);
      upsertOne('financeiro', nr);
      return all;
    },

    // ── EQUIPE ───────────────────────────────────
    getEquipe: () => localLoad(KEYS.EQUIPE, INITIAL_EQUIPE),

    saveEquipe: (data) => {
      localSave(KEYS.EQUIPE, data);
      data.forEach(r => upsertOne('equipe', { ...r, id: String(r.id) }));
    },

    // ── EVOLUÇÕES ────────────────────────────────
    getEvolucoes: () => localLoad(KEYS.EVOLUCOES, INITIAL_EVOLUCOES),

    addEvolucao: (r) => {
      const all = localLoad(KEYS.EVOLUCOES, INITIAL_EVOLUCOES);
      const nr  = { ...r, id: String(r.id || ('ev-' + Date.now())) };
      all.unshift(nr);
      localSave(KEYS.EVOLUCOES, all);
      upsertOne('evolucoes', nr);
      return all;
    },

    // ── PILATES TURMAS ───────────────────────────
    getPilatesTurmas: () => localLoad(KEYS.PILATES_TURMAS, INITIAL_PILATES_TURMAS),

    addPilatesTurma: (t) => {
      const all = localLoad(KEYS.PILATES_TURMAS, INITIAL_PILATES_TURMAS);
      const nt = {
        id: String(t.id || ('turma-' + Date.now())),
        nome: t.nome || 'Pilates Studio',
        dia: t.dia || 'Segunda',
        hora: t.hora || '08:00',
        profissional: t.profissional || 'Dra. Leonarda Vale',
        capacidade: parseInt(t.capacidade || '4', 10) || 4
      };
      const existIdx = all.findIndex(item => item.dia === nt.dia && item.hora === nt.hora);
      if (existIdx !== -1) {
        all[existIdx] = { ...all[existIdx], ...nt };
      } else {
        all.push(nt);
      }
      localSave(KEYS.PILATES_TURMAS, all);
      dispatchSync('pilates_turmas');
      return all;
    },

    deletePilatesTurma: (id) => {
      const all = localLoad(KEYS.PILATES_TURMAS, INITIAL_PILATES_TURMAS).filter(t => String(t.id) !== String(id));
      localSave(KEYS.PILATES_TURMAS, all);
      dispatchSync('pilates_turmas');
      return all;
    },

    // ── UTILITÁRIOS ──────────────────────────────
    clearCache: () => {
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
      console.log('[ValeStore] Cache local limpo.');
    },

    forceSync: async () => {
      await syncAll();
      console.log('[ValeStore] Sync forçado concluído.');
    }
  };

})();
