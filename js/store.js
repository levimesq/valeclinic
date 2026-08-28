/* ==========================================
   ValeClinic - Store Centralizado (Single Source of Truth)
   Integração Supabase + LocalStorage (Optimistic UI)
   Versão 5.0 - Catálogo de Planos e Equipe Atualizada
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
    AGENDAMENTOS:    'valeclinic_agendamentos',
    FINANCEIRO:      'valeclinic_financeiro',
    EQUIPE:          'valeclinic_equipe',
    FALTAS:          'valeclinic_faltas',
    PACIENTES:       'valeclinic_pacientes',
    EVOLUCOES:       'valeclinic_evolucoes',
    PILATES_TURMAS:  'valeclinic_pilates_turmas',
    PLANOS_SERVICOS: 'valeclinic_planos_servicos'
  };

  const INITIAL_AGENDAMENTOS   = [];
  const INITIAL_FINANCEIRO     = [];
  const INITIAL_FALTAS         = [];
  const INITIAL_PACIENTES      = [];
  const INITIAL_EQUIPE         = [];
  const INITIAL_EVOLUCOES      = [];
  const INITIAL_PILATES_TURMAS = [
    { id: 'turma-seg-07', nome: 'Pilates Studio (Manhã)', dia: 'Segunda', hora: '07:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-seg-08', nome: 'Pilates Studio (Manhã)', dia: 'Segunda', hora: '08:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-seg-09', nome: 'Pilates Studio (Manhã)', dia: 'Segunda', hora: '09:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-seg-16', nome: 'Pilates Studio (Tarde)', dia: 'Segunda', hora: '16:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-seg-17', nome: 'Pilates Studio (Tarde)', dia: 'Segunda', hora: '17:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-seg-18', nome: 'Pilates Studio (Noite)', dia: 'Segunda', hora: '18:00', profissional: 'Dra. Katiane', capacidade: 6 },

    { id: 'turma-ter-07', nome: 'Pilates Studio (Manhã)', dia: 'Terça', hora: '07:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-ter-08', nome: 'Pilates Studio (Manhã)', dia: 'Terça', hora: '08:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-ter-09', nome: 'Pilates Studio (Manhã)', dia: 'Terça', hora: '09:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-ter-16', nome: 'Pilates Studio (Tarde)', dia: 'Terça', hora: '16:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-ter-17', nome: 'Pilates Studio (Tarde)', dia: 'Terça', hora: '17:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-ter-18', nome: 'Pilates Studio (Noite)', dia: 'Terça', hora: '18:00', profissional: 'Dra. Katiane', capacidade: 6 },

    { id: 'turma-qua-07', nome: 'Pilates Studio (Manhã)', dia: 'Quarta', hora: '07:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-qua-08', nome: 'Pilates Studio (Manhã)', dia: 'Quarta', hora: '08:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-qua-09', nome: 'Pilates Studio (Manhã)', dia: 'Quarta', hora: '09:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-qua-16', nome: 'Pilates Studio (Tarde)', dia: 'Quarta', hora: '16:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-qua-17', nome: 'Pilates Studio (Tarde)', dia: 'Quarta', hora: '17:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-qua-18', nome: 'Pilates Studio (Noite)', dia: 'Quarta', hora: '18:00', profissional: 'Dra. Katiane', capacidade: 6 },

    { id: 'turma-qui-07', nome: 'Pilates Studio (Manhã)', dia: 'Quinta', hora: '07:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-qui-08', nome: 'Pilates Studio (Manhã)', dia: 'Quinta', hora: '08:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-qui-09', nome: 'Pilates Studio (Manhã)', dia: 'Quinta', hora: '09:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-qui-16', nome: 'Pilates Studio (Tarde)', dia: 'Quinta', hora: '16:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-qui-17', nome: 'Pilates Studio (Tarde)', dia: 'Quinta', hora: '17:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-qui-18', nome: 'Pilates Studio (Noite)', dia: 'Quinta', hora: '18:00', profissional: 'Dra. Katiane', capacidade: 6 },

    { id: 'turma-sex-07', nome: 'Pilates Studio (Manhã)', dia: 'Sexta', hora: '07:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-sex-08', nome: 'Pilates Studio (Manhã)', dia: 'Sexta', hora: '08:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-sex-09', nome: 'Pilates Studio (Manhã)', dia: 'Sexta', hora: '09:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-sex-16', nome: 'Pilates Studio (Tarde)', dia: 'Sexta', hora: '16:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-sex-17', nome: 'Pilates Studio (Tarde)', dia: 'Sexta', hora: '17:00', profissional: 'Dra. Katiane', capacidade: 6 },
    { id: 'turma-sex-18', nome: 'Pilates Studio (Noite)', dia: 'Sexta', hora: '18:00', profissional: 'Dra. Katiane', capacidade: 6 }
  ];
  const INITIAL_PLANOS_SERVICOS = [
    { id: 'ps-1', nome_servico: 'Sessão Avulsa - Pilates', tipo_cobranca: 'avulso', quantidade_sessoes: 1, valor_total: 120, valor_clinica: 40 },
    { id: 'ps-2', nome_servico: 'Pacote Mensal Pilates (2x/sem - 8 sessões)', tipo_cobranca: 'pacote', quantidade_sessoes: 8, valor_total: 450, valor_clinica: 150 },
    { id: 'ps-3', nome_servico: 'Fisioterapia - Avaliação / Consulta', tipo_cobranca: 'avulso', quantidade_sessoes: 1, valor_total: 180, valor_clinica: 60 },
    { id: 'ps-4', nome_servico: 'Fisioterapia - Pacote 10 Sessões', tipo_cobranca: 'pacote', quantidade_sessoes: 10, valor_total: 1500, valor_clinica: 500 },
    { id: 'ps-5', nome_servico: 'Sessão Fonoaudiológica', tipo_cobranca: 'avulso', quantidade_sessoes: 1, valor_total: 130, valor_clinica: 26 },
    { id: 'ps-6', nome_servico: 'Fonoaudiologia - Pacote 5 Sessões', tipo_cobranca: 'pacote', quantidade_sessoes: 5, valor_total: 650, valor_clinica: 130 },
    { id: 'ps-7', nome_servico: 'Psicopedagogia - Sessão Avulsa', tipo_cobranca: 'avulso', quantidade_sessoes: 1, valor_total: 150, valor_clinica: 30 },
    { id: 'ps-8', nome_servico: 'Psicopedagogia - Pacote 4 Sessões', tipo_cobranca: 'pacote', quantidade_sessoes: 4, valor_total: 500, valor_clinica: 100 }
  ];

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
  function getTodayDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getDiaSemana(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    const year  = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day   = parseInt(parts[2], 10);
    const d = new Date(year, month, day, 12, 0, 0);
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return dias[d.getDay()] || '';
  }

  // ============================================
  // OPERAÇÕES SUPABASE (Single Source of Truth)
  // ============================================

  function normalizeAgendamento(row) {
    if (!row) return null;
    const hora = row.hora || row.time || '08:00';
    return {
      id: String(row.id),
      date: row.date || getTodayDate(),
      hora: hora,
      time: hora,
      paciente: row.paciente || '',
      especialidade: row.especialidade || 'Pilates Studio',
      profissional: row.profissional || (row.especialidade === 'Fonoaudiologia' ? 'Dr. Jorge Linhares' : (row.especialidade === 'Psicopedagogia' ? 'Dra. Cleópatra' : 'Dra. Katiane')),
      status: row.status || 'Aguardando Chegada',
      horarioChegada: row.horarioChegada || null,
      plano_id: row.plano_id || null,
      plano_nome: row.plano_nome || null,
      valor_total: row.valor_total !== undefined ? row.valor_total : null,
      valor_clinica: row.valor_clinica !== undefined ? row.valor_clinica : null,
      created_at: row.created_at || null
    };
  }

  async function pullFromSupabase(table, localKey, defaultData) {
    const db = getClient();
    if (!db) return localLoad(localKey, defaultData);
    try {
      const { data, error } = await db.from(table).select('*');
      if (error) throw error;

      let cloudData = data || [];
      if (table === 'agendamentos') {
        cloudData = cloudData.map(normalizeAgendamento).filter(Boolean);
      }

      // Se a tabela é financeiro e o cloud está zerado após o reset, mantém local zerado
      if (table === 'financeiro' && cloudData.length === 0) {
        localSave(localKey, []);
        dispatchSync(table);
        console.log(`[ValeStore] Sync OK: ${table} (0 registros - reset financeiro ativo)`);
        return [];
      }

      // Safe Merge: Nunca apaga dados locais legítimos, preserva campos extras e mescla por ID
      const currentLocal = localLoad(localKey, []) || [];
      const cloudMap = new Map();
      cloudData.forEach(item => cloudMap.set(String(item.id), item));

      const merged = [...cloudData];

      // IDs de defaults iniciais — nunca re-subir se o cloud já tem dados reais
      const defaultIds = new Set((defaultData || []).map(d => String(d.id)));
      const cloudHasRealData = cloudData.length > 0;

      // Se houver algum item criado localmente que ainda não voltou do cloud, mantém e sobe
      currentLocal.forEach(localItem => {
        if (!localItem || !localItem.id) return;
        const localId = String(localItem.id);

        if (!cloudMap.has(localId)) {
          // Se é um default local e o cloud já tem dados reais, não re-subir
          if (cloudHasRealData && defaultIds.has(localId)) return;
          // Se é financeiro antigo de testes, não re-subir
          if (table === 'financeiro') return;

          merged.push(localItem);
          upsertOne(table, localItem).catch(e => console.warn(`[ValeStore] Background sync retry para ${table}:`, e.message));
        } else {
          // Merge campos extras locais (ex: valor_total, plano_id) que o cloud não tem
          const idx = merged.findIndex(m => String(m.id) === localId);
          if (idx !== -1) {
            merged[idx] = { ...localItem, ...merged[idx] };
          }
        }
      });

      localSave(localKey, merged);
      dispatchSync(table);
      console.log(`[ValeStore] Sync OK: ${table} (${merged.length} registros)`);
      return merged;
    } catch (e) {
      console.warn(`[ValeStore] Falha ao puxar ${table}:`, e.message);
      return localLoad(localKey, defaultData);
    }
  }

  async function upsertOne(table, record) {
    const db = getClient();
    if (!db) {
      console.warn(`[ValeStore] Supabase client não disponível para ${table}`);
      return;
    }
    if (!record) return;
    try {
      let payload = { ...record };

      // Filtragem estrita dos schemas das tabelas do Supabase (impede erro HTTP 400 por colunas extras)
      if (table === 'agendamentos') {
        const horaVal = record.hora || record.time || '08:00';
        payload = {
          id: String(record.id),
          date: String(record.date || new Date().toISOString().split('T')[0]),
          hora: horaVal,
          time: horaVal,
          paciente: String(record.paciente || ''),
          especialidade: String(record.especialidade || 'Pilates Studio'),
          profissional: String(record.profissional || (record.especialidade === 'Fonoaudiologia' ? 'Dr. Jorge Linhares' : (record.especialidade === 'Psicopedagogia' ? 'Dra. Cleópatra' : 'Dra. Katiane'))),
          status: String(record.status || 'Aguardando Chegada'),
          horarioChegada: record.horarioChegada || null
        };
      } else if (table === 'planos_servicos') {
        payload = {
          id: String(record.id),
          nome_servico: record.nome_servico || '',
          tipo_cobranca: record.tipo_cobranca || 'avulso',
          quantidade_sessoes: parseInt(record.quantidade_sessoes, 10) || 1,
          valor_total: parseFloat(record.valor_total) || 0,
          valor_clinica: parseFloat(record.valor_clinica) || 0
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
      } else if (table === 'financeiro') {
        const valNum = typeof record.valor === 'number'
          ? record.valor
          : parseFloat(String(record.valor || '0').replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
        payload = {
          id: String(record.id),
          data: record.data || record.date || new Date().toISOString().split('T')[0],
          paciente: record.paciente || '',
          descricao: record.descricao || '',
          categoria: record.categoria || 'Geral',
          pagamento: record.pagamento || 'PIX',
          valor: valNum,
          tipo: record.tipo || 'receita',
          status: record.status || 'pago'
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
      if (error) {
        console.error(`[ValeStore] Erro ao salvar em ${table}:`, error);
        throw error;
      }
      console.log(`[ValeStore] Upsert OK em ${table}:`, payload.id);
    } catch (e) {
      console.error(`[ValeStore] Falha ao salvar em ${table}:`, e.message);
      throw e;
    }
  }

  async function deleteOne(table, id) {
    const db = getClient();
    if (!db) {
      console.warn(`[ValeStore] Supabase client não disponível para delete em ${table}`);
      return;
    }
    try {
      const { error } = await db.from(table).delete().eq('id', String(id));
      if (error) {
        console.error(`[ValeStore] Erro ao deletar de ${table}:`, error);
        throw error;
      }
      console.log(`[ValeStore] Delete OK em ${table}:`, id);
    } catch (e) {
      console.error(`[ValeStore] Falha ao deletar de ${table}:`, e.message);
      throw e;
    }
  }

  async function syncAll() {
    await Promise.allSettled([
      pullFromSupabase('pacientes',       KEYS.PACIENTES,       INITIAL_PACIENTES),
      pullFromSupabase('agendamentos',    KEYS.AGENDAMENTOS,    INITIAL_AGENDAMENTOS),
      pullFromSupabase('financeiro',      KEYS.FINANCEIRO,      INITIAL_FINANCEIRO),
      pullFromSupabase('faltas',          KEYS.FALTAS,          INITIAL_FALTAS),
      pullFromSupabase('equipe',          KEYS.EQUIPE,          INITIAL_EQUIPE),
      pullFromSupabase('evolucoes',       KEYS.EVOLUCOES,       INITIAL_EVOLUCOES),
      pullFromSupabase('planos_servicos', KEYS.PLANOS_SERVICOS, INITIAL_PLANOS_SERVICOS)
    ]);
  }

  // Limpeza forçada e definitiva do cache legado de financeiro
  const RESET_FIN_KEY = 'valeclinic_fin_reset_v4';
  if (!localStorage.getItem(RESET_FIN_KEY)) {
    localStorage.removeItem(KEYS.FINANCEIRO);
    localStorage.setItem(RESET_FIN_KEY, 'true');
    console.log('[ValeStore] Reset financeiro v4 executado com sucesso.');
  }

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

    // ── PROFISSIONAIS & EQUIPE OFICIAL ─────────
    getProfissionaisPorEspecialidade: (especialidade) => {
      const esp = (especialidade || '').toLowerCase();
      if (esp.includes('pilates')) {
        return ['Dra. Katiane', 'Dra. Mirela'];
      }
      if (esp.includes('fisio')) {
        return ['Dra. Leonarda Vale', 'Dr. Lucas Andrade'];
      }
      if (esp.includes('fono')) {
        return ['Dr. Jorge Linhares'];
      }
      if (esp.includes('psico') || esp.includes('neuro')) {
        return ['Dra. Cleópatra'];
      }
      return ['Dra. Leonarda Vale', 'Dr. Lucas Andrade', 'Dr. Jorge Linhares', 'Dra. Cleópatra', 'Dra. Katiane', 'Dra. Mirela'];
    },

    getEquipeRecepcao: () => ['Leiriane', 'Fernanda'],

    // ── PLANOS & SERVIÇOS ───────────────────────
    getPlanosServicos: () => localLoad(KEYS.PLANOS_SERVICOS, INITIAL_PLANOS_SERVICOS),

    syncPlanosServicos: async () => {
      return await pullFromSupabase('planos_servicos', KEYS.PLANOS_SERVICOS, INITIAL_PLANOS_SERVICOS);
    },

    addPlanoServico: (p) => {
      const all = localLoad(KEYS.PLANOS_SERVICOS, INITIAL_PLANOS_SERVICOS);
      const nr  = {
        id: String(p.id || ('ps-' + Date.now())),
        nome_servico: p.nome_servico || '',
        tipo_cobranca: p.tipo_cobranca || 'avulso',
        quantidade_sessoes: parseInt(p.quantidade_sessoes, 10) || 1,
        valor_total: parseFloat(p.valor_total) || 0,
        valor_clinica: parseFloat(p.valor_clinica) || 0,
        created_at: new Date().toISOString()
      };
      all.unshift(nr);
      localSave(KEYS.PLANOS_SERVICOS, all);
      upsertOne('planos_servicos', nr);
      dispatchSync('planos_servicos');
      return all;
    },

    updatePlanoServico: (id, changes) => {
      const all = localLoad(KEYS.PLANOS_SERVICOS, INITIAL_PLANOS_SERVICOS);
      const i   = all.findIndex(item => String(item.id) === String(id));
      if (i !== -1) {
        all[i] = { ...all[i], ...changes, id: String(id) };
        localSave(KEYS.PLANOS_SERVICOS, all);
        upsertOne('planos_servicos', all[i]);
        dispatchSync('planos_servicos');
      }
      return all;
    },

    deletePlanoServico: (id) => {
      const all = localLoad(KEYS.PLANOS_SERVICOS, INITIAL_PLANOS_SERVICOS).filter(item => String(item.id) !== String(id));
      localSave(KEYS.PLANOS_SERVICOS, all);
      deleteOne('planos_servicos', id);
      dispatchSync('planos_servicos');
      return all;
    },

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

    getPacientesAtivos: () => {
      const all = localLoad(KEYS.PACIENTES, INITIAL_PACIENTES);
      return all.filter(p => {
        const nome = (p.name || p.nome || '').trim();
        if (!nome) return false;
        const status = (p.status || 'ativo').toLowerCase();
        return status === 'ativo';
      });
    },

    addPaciente: async (r) => {
      const all = localLoad(KEYS.PACIENTES, INITIAL_PACIENTES);
      const nr  = {
        id: String(r.id || ('pac-' + Date.now())),
        name: r.name || r.nome || '',
        phone: r.phone || r.telefone || '',
        birth: r.birth || r.nascimento || '',
        notes: r.notes || r.observacoes || '',
        specialty: r.specialty || r.especialidade || ''
      };
      all.push(nr);
      localSave(KEYS.PACIENTES, all);
      await upsertOne('pacientes', nr);
      dispatchSync('pacientes');
      return nr;
    },

    updatePaciente: async (id, changes) => {
      const all = localLoad(KEYS.PACIENTES, INITIAL_PACIENTES);
      const i   = all.findIndex(p => String(p.id) === String(id));
      if (i !== -1) {
        all[i] = { ...all[i], ...changes, id: String(id) };
        localSave(KEYS.PACIENTES, all);
        await upsertOne('pacientes', all[i]);
        dispatchSync('pacientes');
      }
      return all;
    },

    savePacientes: async (data) => {
      localSave(KEYS.PACIENTES, data);
      for (const r of data) {
        await upsertOne('pacientes', r);
      }
      dispatchSync('pacientes');
    },

    deletePaciente: async (id) => {
      const all = localLoad(KEYS.PACIENTES, INITIAL_PACIENTES).filter(p => String(p.id) !== String(id));
      localSave(KEYS.PACIENTES, all);
      await deleteOne('pacientes', id);
      dispatchSync('pacientes');
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
    getAlertasAbandono: () => {
      const agendamentos = localLoad(KEYS.AGENDAMENTOS, INITIAL_AGENDAMENTOS);
      const faltas = localLoad(KEYS.FALTAS, INITIAL_FALTAS);
      const pacientes = localLoad(KEYS.PACIENTES, INITIAL_PACIENTES);

      const eventosPorPaciente = {};

      agendamentos.forEach(a => {
        const nome = a.paciente;
        if (!nome) return;
        if (!eventosPorPaciente[nome]) eventosPorPaciente[nome] = [];

        const isPresente = (a.status || '').includes('Presente');
        const isFalta = (a.status || '').includes('Faltoso') || (a.status || '').includes('Ausente') || (a.status || '').includes('Faltou');
        const isFaltaJust = (a.status || '').includes('Justificado');

        if (isPresente) {
          eventosPorPaciente[nome].push({ data: a.date, hora: a.hora || a.time || '00:00', modulo: a.especialidade || 'Geral', tipo: 'presenca' });
        } else if (isFalta) {
          eventosPorPaciente[nome].push({ data: a.date, hora: a.hora || a.time || '00:00', modulo: a.especialidade || 'Geral', tipo: isFaltaJust ? 'falta_justificada' : 'falta_injustificada' });
        }
      });

      faltas.forEach(f => {
        const nome = f.paciente;
        if (!nome) return;
        if (!eventosPorPaciente[nome]) eventosPorPaciente[nome] = [];
        eventosPorPaciente[nome].push({
          data: f.data || f.date || '2026-01-01',
          hora: '00:00',
          modulo: f.modulo || 'Geral',
          tipo: f.justificada ? 'falta_justificada' : 'falta_injustificada'
        });
      });

      const alertas = [];

      Object.entries(eventosPorPaciente).forEach(([nome, eventos]) => {
        eventos.sort((x, y) => (x.data + ' ' + x.hora).localeCompare(y.data + ' ' + y.hora));

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
      const nr  = {
        id: String(r.id || ('fin-' + Date.now())),
        data: r.data || new Date().toISOString().split('T')[0],
        paciente: r.paciente || '',
        descricao: r.descricao || '',
        categoria: r.categoria || 'geral',
        pagamento: r.pagamento || 'PIX',
        valor: r.valor || '0,00',
        valor_clinica: r.valor_clinica || r.valor || '0,00',
        tipo: r.tipo || 'receita',
        status: r.status || 'pago',
        profissional: r.profissional || ''
      };
      all.unshift(nr);
      localSave(KEYS.FINANCEIRO, all);
      upsertOne('financeiro', nr);
      dispatchSync('financeiro');
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
        profissional: t.profissional || 'Dra. Katiane',
        capacidade: parseInt(t.capacidade || '6', 10) || 6
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
    getTodayDate: getTodayDate,
    getDiaSemana: getDiaSemana,

    clearFinanceiro: async () => {
      localSave(KEYS.FINANCEIRO, []);
      const db = getClient();
      if (db) {
        try {
          await db.from('financeiro').delete().neq('id', 'none');
        } catch(e) {}
      }
      dispatchSync('financeiro');
    },

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
