window.DECISIONVAR_SUPABASE_URL = 'https://rvxdoxaovuhiatjxhynl.supabase.co';
window.DECISIONVAR_SUPABASE_KEY = 'sb_publishable_tFHi8NKMy1Ro5yT8e1nzcw_Ha0rvyPk';

window.DecisionVarData = (() => {
  const supabase = window.supabase.createClient(window.DECISIONVAR_SUPABASE_URL, window.DECISIONVAR_SUPABASE_KEY);

  function normalize(txt){
    return (txt || '').toString().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  function escapeHtml(text){
    return (text || '').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function getDelimiter(text){
    const first = text.split(/\r?\n/).find(l => l.trim() !== '') || '';
    const tabs = (first.match(/\t/g) || []).length;
    const commas = (first.match(/,/g) || []).length;
    const semis = (first.match(/;/g) || []).length;
    if(tabs >= commas && tabs >= semis && tabs > 0) return '\t';
    if(semis > commas) return ';';
    return ',';
  }
  function parseCSVLine(line, delimiter){
    if(delimiter === '\t') return line.split('\t').map(c => c.trim());
    const result = [];
    let current = '';
    let inQuotes = false;
    for(let i=0;i<line.length;i++){
      const ch = line[i];
      const next = line[i+1];
      if(ch === '"'){
        if(inQuotes && next === '"'){ current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if(ch === delimiter && !inQuotes){
        result.push(current); current='';
      } else current += ch;
    }
    result.push(current);
    return result.map(c => c.trim());
  }
  function parseCSV(text){
    const delimiter = getDelimiter(text);
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if(lines.length < 2) return [];
    const headers = parseCSVLine(lines[0], delimiter).map(normalize);
    return lines.slice(1).map(line => {
      const values = parseCSVLine(line, delimiter);
      const row = {};
      headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
      return row;
    }).filter(row => Object.values(row).some(v => String(v).trim() !== ''));
  }
  function valueFromRow(row, keys){
    for(const key of keys){
      const n = normalize(key);
      if(row[n] !== undefined && row[n] !== '') return row[n];
    }
    return '';
  }
  function extraerNumeroJornada(v){ const m = String(v||'').match(/\d+/); return m ? m[0] : ''; }
  function equipoResumenDesdeTexto(equipo){
    const e = normalize(equipo);
    if(e.includes('barcelona')) return 'barcelona';
    if(e.includes('real madrid') || e === 'madrid') return 'madrid';
    return '';
  }
  function obtenerImpacto(categoria, subtipo, encuesta){
    const e = normalize(encuesta);
    if(e !== 'no') return 0;
    const c = normalize(categoria);
    const s = normalize(subtipo);
    const mapa = {
      penalti:{ pitado_favor:1, pitado_contra:-1, no_pitado_favor:-1, no_pitado_contra:1 },
      gol:{ concedido_favor:1, concedido_contra:-1, anulado_favor:-1, anulado_contra:1 },
      roja:{ sacada_equipo:0, no_sacada_equipo:1, sacada_rival:1, no_sacada_rival:-1 }
    };
    return mapa[c]?.[s] ?? 0;
  }
  function createEmptySummary(){
    const block = () => ({total:0, si:0, no:0, balance:0});
    return {
      barcelona:{
        penalti:{pitado_favor:block(), pitado_contra:block(), no_pitado_favor:block(), no_pitado_contra:block()},
        gol:{concedido_favor:block(), concedido_contra:block(), anulado_favor:block(), anulado_contra:block()},
        roja:{sacada_equipo:block(), no_sacada_equipo:block(), sacada_rival:block(), no_sacada_rival:block()}
      },
      madrid:{
        penalti:{pitado_favor:block(), pitado_contra:block(), no_pitado_favor:block(), no_pitado_contra:block()},
        gol:{concedido_favor:block(), concedido_contra:block(), anulado_favor:block(), anulado_contra:block()},
        roja:{sacada_equipo:block(), no_sacada_equipo:block(), sacada_rival:block(), no_sacada_rival:block()}
      }
    };
  }
  async function loadCSVJugadas(){
    const resp = await fetch('jugadas.csv', {cache:'no-store'});
    if(!resp.ok) throw new Error('No se pudo cargar jugadas.csv');
    const text = await resp.text();
    const rows = parseCSV(text);
    return rows.map((row, index) => {
      const jornadaRaw = valueFromRow(row, ['Jornada','jornada']);
      return {
        id: valueFromRow(row, ['id']) || String(index+1),
        competicion: valueFromRow(row, ['Competición','Competicion','competicion']) || 'LaLiga',
        jornada: extraerNumeroJornada(jornadaRaw),
        partido: valueFromRow(row, ['Partido','partido']),
        arbitro: valueFromRow(row, ['Árbitro','Arbitro','arbitro']),
        var: valueFromRow(row, ['VAR','var','Arbitro VAR','Árbitro VAR','arbitro_var']),
        minuto: valueFromRow(row, ['Minuto','minuto']),
        equipoAfectado: valueFromRow(row, ['Equipo afectado','equipo afectado','equipo_afectado']),
        categoria: valueFromRow(row, ['Categoría','Categoria','categoria']),
        subtipo: valueFromRow(row, ['Subtipo','subtipo']),
        pregunta: valueFromRow(row, ['Pregunta','pregunta']),
        decision: valueFromRow(row, ['Decisión arbitral','Decision arbitral','decision arbitral','decision_arbitral']),
        descripcion: valueFromRow(row, ['Descripción','Descripcion','descripcion']),
        slugImagen: valueFromRow(row, ['slug_imagen','slug imagen']),
        slugImagen2: valueFromRow(row, ['slug_imagen2','slug imagen2']),
        slugImagen3: valueFromRow(row, ['slug_imagen3','slug imagen3']),
        slugImagen4: valueFromRow(row, ['slug_imagen4','slug imagen4']),
        slugImagen5: valueFromRow(row, ['slug_imagen5','slug imagen5']),
        slugVideo: valueFromRow(row, ['slug_video','slug video']),
        slugVideo2: valueFromRow(row, ['slug_video2','slug video2']),
        respuestaSi: valueFromRow(row, ['Respuesta si','respuesta si','respuesta_si']) || 'Sí',
        respuestaNo: valueFromRow(row, ['Respuesta no','respuesta no','respuesta_no']) || 'No',
        votosInicialesSi: Number(valueFromRow(row, ['votos iniciales si','Votos iniciales si','votos_iniciales_si']) || 0),
        votosInicialesNo: Number(valueFromRow(row, ['votos iniciales no','Votos iniciales no','votos_iniciales_no']) || 0),
        comentario1: valueFromRow(row, ['comentario1']), comentario2: valueFromRow(row, ['comentario2']), comentario3: valueFromRow(row, ['comentario3']), comentario4: valueFromRow(row, ['comentario4']), comentario5: valueFromRow(row, ['comentario5'])
      };
    }).filter(j => j.jornada && j.partido && j.categoria).map(j => ({...j, equipoResumen: equipoResumenDesdeTexto(j.equipoAfectado)}));
  }
  async function getVotesMap(jugadaIds){
    const ids = [...new Set((jugadaIds || []).filter(Boolean))];
    if(!ids.length) return {};
    const { data, error } = await supabase.from('votos').select('jugada_id,voto').in('jugada_id', ids);
    if(error) throw error;
    const map = {};
    ids.forEach(id => map[id] = {si:0,no:0,total:0});
    (data || []).forEach(row => {
      const id = row.jugada_id;
      if(!map[id]) map[id] = {si:0,no:0,total:0};
      const v = normalize(row.voto);
      if(v === 'si'){ map[id].si += 1; map[id].total += 1; }
      else if(v === 'no'){ map[id].no += 1; map[id].total += 1; }
    });
    return map;
  }
  function mergeVotes(jugadas, votesMap){
    return jugadas.map(j => {
      const online = votesMap[j.id] || {si:0,no:0};
      const votosSi = Number(j.votosInicialesSi||0) + Number(online.si||0);
      const votosNo = Number(j.votosInicialesNo||0) + Number(online.no||0);
      let encuesta = '';
      if(votosSi > votosNo) encuesta = 'si';
      else if(votosNo > votosSi) encuesta = 'no';
      return {...j, votosSi, votosNo, totalVotos:votosSi+votosNo, encuesta};
    });
  }
  function buildSummary(jugadas){
    const resumen = createEmptySummary();
    const jugadasVAR = [];
    for(const j of jugadas){
      if(!j.equipoResumen || !j.categoria || !j.subtipo) continue;
      jugadasVAR.push({
        id:j.id, jornada:j.jornada, equipoVisible:j.equipoAfectado, competicion:j.competicion, tipoFiltro:normalize(j.categoria),
        equipo:j.equipoResumen, categoria:normalize(j.categoria), subtipo:normalize(j.subtipo), encuesta:j.encuesta,
        arbitro:j.arbitro || '', var:j.var || '', partido:j.partido || '', minuto:j.minuto || '', decision:j.decision || '', pregunta:j.pregunta || ''
      });
      const block = resumen[j.equipoResumen]?.[normalize(j.categoria)]?.[normalize(j.subtipo)];
      if(!block) continue;
      block.total += 1;
      block.si += Number(j.votosSi || 0);
      block.no += Number(j.votosNo || 0);
      block.balance += obtenerImpacto(j.categoria, j.subtipo, j.encuesta);
    }
    return {resumen, jugadasVAR};
  }
  function buildSummaryBlocks(resumen){
    const categories = ['penalti','gol','roja'];
    return categories.map(cat => ({
      key: cat,
      barca: Object.values(resumen.barcelona[cat]).reduce((a,b)=>a+b.balance,0),
      madrid: Object.values(resumen.madrid[cat]).reduce((a,b)=>a+b.balance,0)
    }));
  }
  function buildJornadasData(jugadasVAR){
    const map = new Map();
    jugadasVAR.forEach(j => {
      const key = Number(j.jornada || 0);
      if(!key) return;
      if(!map.has(key)) map.set(key, {jornada:key, barca:0, madrid:0});
      const reg = map.get(key);
      const impact = obtenerImpacto(j.categoria, j.subtipo, j.encuesta);
      if(j.equipo === 'barcelona') reg.barca += impact;
      if(j.equipo === 'madrid') reg.madrid += impact;
    });
    return Array.from(map.values()).sort((a,b) => a.jornada - b.jornada);
  }
  async function getComments(scope, jugadaId=''){
    let query = supabase.from('comentarios').select('id,autor,texto,created_at,jugada_id').eq('scope', scope).order('created_at', {ascending:false});
    if(jugadaId) query = query.eq('jugada_id', jugadaId);
    else query = query.is('jugada_id', null);
    const {data,error} = await query;
    if(error){
      query = supabase.from('comentarios').select('id,autor,texto,created_at,jugada_id').order('created_at', {ascending:false});
      if(jugadaId) query = query.eq('jugada_id', jugadaId); else query = query.is('jugada_id', null);
      const second = await query;
      if(second.error) throw second.error;
      return second.data || [];
    }
    return data || [];
  }
  async function addComment(scope, text, jugadaId=''){
    const payload = {texto:text, autor:'Usuario'};
    if(jugadaId) payload.jugada_id = jugadaId; else payload.jugada_id = null;
    payload.scope = scope;
    let {error} = await supabase.from('comentarios').insert(payload);
    if(error){
      delete payload.scope;
      const retry = await supabase.from('comentarios').insert(payload);
      if(retry.error) throw retry.error;
    }
  }
  async function addVote(jugadaId, voto){
    const { error } = await supabase.from('votos').insert({jugada_id: jugadaId, voto});
    if(error) throw error;
  }
  function formatDate(dateIso){
    try { return new Date(dateIso).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});} catch { return ''; }
  }
  function getUserVote(id){ try { return JSON.parse(localStorage.getItem('decisionvar_votos_usuario_online')||'{}')[id] || ''; } catch { return ''; } }
  function setUserVote(id,vote){ let data={}; try{data=JSON.parse(localStorage.getItem('decisionvar_votos_usuario_online')||'{}')||{};}catch{} data[id]=vote; localStorage.setItem('decisionvar_votos_usuario_online', JSON.stringify(data)); }
  async function loadDataset(){
    const jugadas = await loadCSVJugadas();
    const votesMap = await getVotesMap(jugadas.map(j => j.id));
    const merged = mergeVotes(jugadas, votesMap);
    const built = buildSummary(merged);
    return {jugadas: merged, votesMap, resumen: built.resumen, jugadasVAR: built.jugadasVAR, resumenBloques: buildSummaryBlocks(built.resumen), jornadasData: buildJornadasData(built.jugadasVAR)};
  }
  return { supabase, normalize, escapeHtml, loadDataset, getComments, addComment, addVote, getUserVote, setUserVote, formatDate, obtenerImpacto, buildSummaryBlocks, buildJornadasData };
})();