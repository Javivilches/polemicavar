window.DECISIONVAR_SUPABASE_URL = "https://rvxdoxaovuhiatjxhynl.supabase.co";
window.DECISIONVAR_SUPABASE_KEY = "sb_publishable_tFHi8NKMy1Ro5yT8e1nzcw_Ha0rvyPk";

window.DecisionVarData = (() => {
  const supabase = window.supabase.createClient(
    window.DECISIONVAR_SUPABASE_URL,
    window.DECISIONVAR_SUPABASE_KEY
  );

  function normalize(txt) {
    return (txt || "")
      .toString()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function escapeHtml(text) {
    return (text || "")
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function numeroSeguro(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function getDelimiter(text) {
    const first = text.split(/\r?\n/).find((l) => l.trim() !== "") || "";
    const tabs = (first.match(/\t/g) || []).length;
    const commas = (first.match(/,/g) || []).length;
    const semis = (first.match(/;/g) || []).length;

    if (tabs >= commas && tabs >= semis && tabs > 0) return "\t";
    if (semis > commas) return ";";
    return ",";
  }

  function parseCSVLine(line, delimiter) {
    if (delimiter === "\t") {
      return line.split("\t").map((c) => c.trim());
    }

    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1];

      if (ch === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }

    result.push(current);
    return result.map((c) => c.trim());
  }

  function parseCSV(text) {
    const delimiter = getDelimiter(text);
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0], delimiter).map(normalize);

    return lines
      .slice(1)
      .map((line) => {
        const values = parseCSVLine(line, delimiter);
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] ?? "";
        });
        return row;
      })
      .filter((row) => Object.values(row).some((v) => String(v).trim() !== ""));
  }

  function valueFromRow(row, keys) {
    for (const key of keys) {
      const n = normalize(key);
      if (row[n] !== undefined && row[n] !== "") return row[n];
    }
    return "";
  }

  function extraerNumeroJornada(v) {
    const m = String(v || "").match(/\d+/);
    return m ? m[0] : "";
  }

  function equipoResumenDesdeTexto(equipo) {
    const e = normalize(equipo);
    if (e.includes("barcelona") || e === "barca" || e === "barça") return "barcelona";
    if (e.includes("real madrid") || e === "madrid") return "madrid";
    return "";
  }

  function createEmptyBlock() {
    return {
      total: 0,
      si: 0,
      no: 0,
      balance: 0
    };
  }

  function createEmptySummary() {
    return {
      barcelona: {
        penalti: {
          pitado_favor: createEmptyBlock(),
          pitado_contra: createEmptyBlock(),
          no_pitado_favor: createEmptyBlock(),
          no_pitado_contra: createEmptyBlock()
        },
        gol: {
          concedido_favor: createEmptyBlock(),
          concedido_contra: createEmptyBlock(),
          anulado_favor: createEmptyBlock(),
          anulado_contra: createEmptyBlock()
        },
        roja: {
          sacada_equipo: createEmptyBlock(),
          no_sacada_equipo: createEmptyBlock(),
          sacada_rival: createEmptyBlock(),
          no_sacada_rival: createEmptyBlock()
        }
      },
      madrid: {
        penalti: {
          pitado_favor: createEmptyBlock(),
          pitado_contra: createEmptyBlock(),
          no_pitado_favor: createEmptyBlock(),
          no_pitado_contra: createEmptyBlock()
        },
        gol: {
          concedido_favor: createEmptyBlock(),
          concedido_contra: createEmptyBlock(),
          anulado_favor: createEmptyBlock(),
          anulado_contra: createEmptyBlock()
        },
        roja: {
          sacada_equipo: createEmptyBlock(),
          no_sacada_equipo: createEmptyBlock(),
          sacada_rival: createEmptyBlock(),
          no_sacada_rival: createEmptyBlock()
        }
      }
    };
  }

  function obtenerImpacto(categoria, subtipo, encuesta) {
    const e = normalize(encuesta);
    if (e !== "no") return 0;

    const c = normalize(categoria);
    const s = normalize(subtipo);

    const mapa = {
      penalti: {
        pitado_favor: 1,
        pitado_contra: -1,
        no_pitado_favor: -1,
        no_pitado_contra: 1
      },
      gol: {
        concedido_favor: 1,
        concedido_contra: -1,
        anulado_favor: -1,
        anulado_contra: 1
      },
      roja: {
        sacada_equipo: 0,
        no_sacada_equipo: 1,
        sacada_rival: 1,
        no_sacada_rival: -1
      }
    };

    return mapa[c]?.[s] ?? 0;
  }

  function encuestaGanadora(votosSi, votosNo) {
    if (votosNo > votosSi) return "no";
    if (votosSi > votosNo) return "si";
    return "";
  }

  async function loadCSVJugadas() {
    const resp = await fetch("jugadas.csv", { cache: "no-store" });
    if (!resp.ok) throw new Error("No se pudo cargar jugadas.csv");

    const text = await resp.text();
    const rows = parseCSV(text);

    return rows
      .map((row, index) => {
        const jornadaRaw = valueFromRow(row, ["Jornada", "jornada"]);

        return {
          id: valueFromRow(row, ["id"]) || String(index + 1),
          competicion: valueFromRow(row, ["Competición", "Competicion", "competicion"]) || "LaLiga",
          jornada: extraerNumeroJornada(jornadaRaw),
          partido: valueFromRow(row, ["Partido", "partido"]),
          arbitro: valueFromRow(row, ["Árbitro", "Arbitro", "arbitro"]),
          var: valueFromRow(row, ["VAR", "var", "Arbitro VAR", "Árbitro VAR", "arbitro_var"]),
          minuto: valueFromRow(row, ["Minuto", "minuto"]),
          equipoAfectado: valueFromRow(row, ["Equipo afectado", "equipo afectado", "equipo_afectado"]),
          categoria: valueFromRow(row, ["Categoría", "Categoria", "categoria"]),
          subtipo: valueFromRow(row, ["Subtipo", "subtipo"]),
          pregunta: valueFromRow(row, ["Pregunta", "pregunta"]),
          decision: valueFromRow(row, [
            "Decisión arbitral",
            "Decision arbitral",
            "decision arbitral",
            "decision_arbitral"
          ]),
          descripcion: valueFromRow(row, ["Descripción", "Descripcion", "descripcion"]),
          slugImagen: valueFromRow(row, ["slug_imagen", "slug imagen"]),
          slugImagen2: valueFromRow(row, ["slug_imagen2", "slug imagen2"]),
          slugImagen3: valueFromRow(row, ["slug_imagen3", "slug imagen3"]),
          slugImagen4: valueFromRow(row, ["slug_imagen4", "slug imagen4"]),
          slugImagen5: valueFromRow(row, ["slug_imagen5", "slug imagen5"]),
          slugVideo: valueFromRow(row, ["slug_video", "slug video"]),
          slugVideo2: valueFromRow(row, ["slug_video2", "slug video2"]),
          respuestaSi: valueFromRow(row, ["Respuesta si", "respuesta si", "respuesta_si"]) || "Sí",
          respuestaNo: valueFromRow(row, ["Respuesta no", "respuesta no", "respuesta_no"]) || "No",
          votosInicialesSi: numeroSeguro(
            valueFromRow(row, ["votos iniciales si", "Votos iniciales si", "votos_iniciales_si"])
          ),
          votosInicialesNo: numeroSeguro(
            valueFromRow(row, ["votos iniciales no", "Votos iniciales no", "votos_iniciales_no"])
          ),

          comentario1: valueFromRow(row, ["comentario1"]),
          usuariocomentario1: valueFromRow(row, ["usuariocomentario1", "usuario comentario1", "usuario_comentario1"]),
          fechacomentario1: valueFromRow(row, ["fechacomentario1", "fecha comentario1", "fecha_comentario1"]),

          comentario2: valueFromRow(row, ["comentario2"]),
          usuariocomentario2: valueFromRow(row, ["usuariocomentario2", "usuario comentario2", "usuario_comentario2"]),
          fechacomentario2: valueFromRow(row, ["fechacomentario2", "fecha comentario2", "fecha_comentario2"]),

          comentario3: valueFromRow(row, ["comentario3"]),
          usuariocomentario3: valueFromRow(row, ["usuariocomentario3", "usuario comentario3", "usuario_comentario3"]),
          fechacomentario3: valueFromRow(row, ["fechacomentario3", "fecha comentario3", "fecha_comentario3"]),

          comentario4: valueFromRow(row, ["comentario4"]),
          usuariocomentario4: valueFromRow(row, ["usuariocomentario4", "usuario comentario4", "usuario_comentario4"]),
          fechacomentario4: valueFromRow(row, ["fechacomentario4", "fecha comentario4", "fecha_comentario4"]),

          comentario5: valueFromRow(row, ["comentario5"]),
          usuariocomentario5: valueFromRow(row, ["usuariocomentario5", "usuario comentario5", "usuario_comentario5"]),
          fechacomentario5: valueFromRow(row, ["fechacomentario5", "fecha comentario5", "fecha_comentario5"])
        };
      })
      .filter((j) => j.jornada && j.partido && j.categoria)
      .map((j) => ({
        ...j,
        equipoResumen: equipoResumenDesdeTexto(j.equipoAfectado)
      }));
  }

  async function getVotesMap(jugadaIds) {
    const ids = [...new Set((jugadaIds || []).filter(Boolean))];
    if (!ids.length) return {};

    const { data, error } = await supabase
      .from("votos")
      .select("jugada_id,voto")
      .in("jugada_id", ids);

    if (error) throw error;

    const map = {};
    ids.forEach((id) => {
      map[id] = { si: 0, no: 0, total: 0 };
    });

    (data || []).forEach((row) => {
      const id = row.jugada_id;
      if (!map[id]) map[id] = { si: 0, no: 0, total: 0 };

      const v = normalize(row.voto);
      if (v === "si") {
        map[id].si += 1;
        map[id].total += 1;
      } else if (v === "no") {
        map[id].no += 1;
        map[id].total += 1;
      }
    });

    return map;
  }

  function mergeVotes(jugadas, votesMap) {
    return jugadas.map((j) => {
      const online = votesMap[j.id] || { si: 0, no: 0 };
      const votosSi = numeroSeguro(j.votosInicialesSi) + numeroSeguro(online.si);
      const votosNo = numeroSeguro(j.votosInicialesNo) + numeroSeguro(online.no);

      return {
        ...j,
        votosSi,
        votosNo,
        totalVotos: votosSi + votosNo,
        encuesta: encuestaGanadora(votosSi, votosNo)
      };
    });
  }

  function buildSummary(jugadas) {
    const resumen = createEmptySummary();
    const jugadasVAR = [];

    for (const j of jugadas) {
      const equipo = normalize(j.equipoResumen);
      const categoria = normalize(j.categoria);
      const subtipo = normalize(j.subtipo);

      if (!equipo || !categoria || !subtipo) continue;

      jugadasVAR.push({
        id: j.id,
        jornada: j.jornada,
        equipoVisible: j.equipoAfectado,
        competicion: j.competicion,
        tipoFiltro: categoria,
        equipo,
        categoria,
        subtipo,
        encuesta: j.encuesta,
        arbitro: j.arbitro || "",
        var: j.var || "",
        partido: j.partido || "",
        minuto: j.minuto || "",
        decision: j.decision || "",
        pregunta: j.pregunta || "",
        votosSi: numeroSeguro(j.votosSi),
        votosNo: numeroSeguro(j.votosNo),
        totalVotos: numeroSeguro(j.totalVotos)
      });

          const block = resumen[equipo]?.[categoria]?.[subtipo];
      if (!block) continue;

      block.total += 1;

      if (j.encuesta === "si") {
        block.si += 1;
      } else if (j.encuesta === "no") {
        block.no += 1;
      }

      block.balance += obtenerImpacto(categoria, subtipo, j.encuesta);
    }

    return { resumen, jugadasVAR };
  }

  function buildSummaryBlocks(resumen) {
    const categories = ["penalti", "gol", "roja"];

    return categories.map((cat) => ({
      key: cat,
      barca: Object.values(resumen.barcelona[cat]).reduce((a, b) => a + numeroSeguro(b.balance), 0),
      madrid: Object.values(resumen.madrid[cat]).reduce((a, b) => a + numeroSeguro(b.balance), 0)
    }));
  }

  function buildJornadasData(jugadasVAR) {
    const map = new Map();

    jugadasVAR.forEach((j) => {
      const key = Number(j.jornada || 0);
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, { jornada: key, barca: 0, madrid: 0 });
      }

      const reg = map.get(key);
      const impact = obtenerImpacto(j.categoria, j.subtipo, j.encuesta);

      if (j.equipo === "barcelona") reg.barca += impact;
      if (j.equipo === "madrid") reg.madrid += impact;
    });

    return Array.from(map.values()).sort((a, b) => a.jornada - b.jornada);
  }

  async function getComments(scope, jugadaId = "") {
    let query = supabase
      .from("comentarios")
      .select("id,autor,texto,created_at,jugada_id")
      .eq("scope", scope)
      .order("created_at", { ascending: false });

    if (jugadaId) query = query.eq("jugada_id", jugadaId);
    else query = query.is("jugada_id", null);

    const { data, error } = await query;

    if (error) {
      let fallback = supabase
        .from("comentarios")
        .select("id,autor,texto,created_at,jugada_id")
        .order("created_at", { ascending: false });

      if (jugadaId) fallback = fallback.eq("jugada_id", jugadaId);
      else fallback = fallback.is("jugada_id", null);

      const second = await fallback;
      if (second.error) throw second.error;
      return second.data || [];
    }

    return data || [];
  }

  async function addComment(scope, text, jugadaId = "") {
    const payload = {
      texto: text,
      autor: "Usuario",
      scope: scope || null,
      jugada_id: jugadaId || null
    };

    let { error } = await supabase.from("comentarios").insert(payload);

    if (error) {
      delete payload.scope;
      const retry = await supabase.from("comentarios").insert(payload);
      if (retry.error) throw retry.error;
    }
  }

 async function addVote(jugadaId, voto) {
  const user = await getUsuarioActual();
  if (!user) throw new Error("Debes iniciar sesión");

  const { error } = await supabase
    .from("votos")
    .upsert(
      {
        jugada_id: jugadaId,
        user_id: user.id,
        voto
      },
      {
        onConflict: "jugada_id,user_id"
      }
    );

  if (error) throw error;
}

async function getUsuarioActual() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data?.user || null;
}

async function getPerfilActual() {
  const user = await getUsuarioActual();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function crearPerfil(username) {
  const user = await getUsuarioActual();
  if (!user) throw new Error("No hay usuario autenticado");

  const { error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      username: String(username || "").trim()
    });

  if (error) throw error;
}
 function formatDate(dateValue) {
  try {
    if (!dateValue) return "";

    const raw = String(dateValue).trim();

    const isoDate = new Date(raw);
    if (!isNaN(isoDate.getTime())) {
      return isoDate.toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }

    const m = raw.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?(?::(\d{2}))?$/
    );

    if (m) {
      const dia = Number(m[1]);
      const mes = Number(m[2]) - 1;
      const anio = Number(m[3]);
      const hora = Number(m[4] || 0);
      const minuto = Number(m[5] || 0);
      const segundo = Number(m[6] || 0);

      const fecha = new Date(anio, mes, dia, hora, minuto, segundo);

      if (!isNaN(fecha.getTime())) {
        return fecha.toLocaleString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      }
    }

    return raw;
  } catch {
    return "";
  }
}

  function getUserVote(id) {
    try {
      const data = JSON.parse(localStorage.getItem("decisionvar_votos_usuario_online") || "{}");
      return data[id] || "";
    } catch {
      return "";
    }
  }

  function setUserVote(id, vote) {
    let data = {};
    try {
      data = JSON.parse(localStorage.getItem("decisionvar_votos_usuario_online") || "{}") || {};
    } catch {
      data = {};
    }
    data[id] = vote;
    localStorage.setItem("decisionvar_votos_usuario_online", JSON.stringify(data));
  }

  async function loadDataset() {
    const jugadas = await loadCSVJugadas();
    const votesMap = await getVotesMap(jugadas.map((j) => j.id));
    const merged = mergeVotes(jugadas, votesMap);
    const built = buildSummary(merged);

    return {
      jugadas: merged,
      votesMap,
      resumen: built.resumen,
      jugadasVAR: built.jugadasVAR,
      resumenBloques: buildSummaryBlocks(built.resumen),
      jornadasData: buildJornadasData(built.jugadasVAR)
    };
  }

async function loginConGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname
    }
  });

  if (error) {
    alert('Error al iniciar sesión con Google');
    console.error(error);
  }
}

async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

 return {
  supabase,
  normalize,
  escapeHtml,
  numeroSeguro,
  loadDataset,
  getComments,
  addComment,
  addVote,
  getUserVote,
  setUserVote,
  formatDate,
  obtenerImpacto,
  buildSummaryBlocks,
  buildJornadasData,
  loginConGoogle,
  logout,
  getUsuarioActual,
  getPerfilActual,
  crearPerfil
};
})();