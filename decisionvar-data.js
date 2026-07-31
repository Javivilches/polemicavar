window.DECISIONVAR_SUPABASE_URL="https://rvxdoxaovuhiatjxhynl.supabase.co";
window.DECISIONVAR_SUPABASE_KEY="sb_publishable_tFHi8NKMy1Ro5yT8e1nzcw_Ha0rvyPk";

window.DecisionVarData=(()=>{
  let supabase=null;

  try{
    if(
      window.supabase &&
      window.DECISIONVAR_SUPABASE_URL &&
      window.DECISIONVAR_SUPABASE_KEY
    ){
      supabase=window.supabase.createClient(
        window.DECISIONVAR_SUPABASE_URL,
        window.DECISIONVAR_SUPABASE_KEY
      );
    }
  }catch(e){
    console.error("No se pudo crear cliente Supabase",e);
  }

  const normalize=v=>(v??"")
    .toString()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase();

  const escapeHtml=v=>(v??"")
    .toString()
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");

  const numeroSeguro=v=>
    Number.isFinite(Number(v))
      ? Number(v)
      : 0;

  const extraerNumeroJornada=v=>
    ((String(v??"").match(/\d+/)||[])[0]||"");

  function getDelimiter(text){
    const first=
      text.split(/\r?\n/)
        .find(l=>l.trim())||"";

    const tabs=(first.match(/\t/g)||[]).length;
    const commas=(first.match(/,/g)||[]).length;
    const semis=(first.match(/;/g)||[]).length;

    if(
      tabs>=commas &&
      tabs>=semis &&
      tabs>0
    ){
      return "\t";
    }

    return semis>commas ? ";" : ",";
  }

  function parseCSVLine(line,delimiter){
    if(delimiter==="\t"){
      return line
        .split("\t")
        .map(v=>v.trim());
    }

    const out=[];
    let cur="";
    let quoted=false;

    for(let i=0;i<line.length;i++){
      const ch=line[i];
      const next=line[i+1];

      if(ch==='"'){
        if(quoted && next==='"'){
          cur+='"';
          i++;
        }else{
          quoted=!quoted;
        }
      }else if(
        ch===delimiter &&
        !quoted
      ){
        out.push(cur);
        cur="";
      }else{
        cur+=ch;
      }
    }

    out.push(cur);

    return out.map(v=>v.trim());
  }

  function parseCSV(text){
    const delimiter=getDelimiter(text);

    const lines=text
      .split(/\r?\n/)
      .filter(l=>l.trim());

    if(lines.length<2){
      return [];
    }

    const headers=
      parseCSVLine(
        lines[0],
        delimiter
      ).map(normalize);

    return lines
      .slice(1)
      .map(line=>{
        const vals=
          parseCSVLine(
            line,
            delimiter
          );

        const row={};

        headers.forEach((h,i)=>{
          row[h]=vals[i]??"";
        });

        return row;
      })
      .filter(row=>
        Object.values(row)
          .some(v=>String(v).trim())
      );
  }

  function valueFromRow(row,keys){
    for(const key of keys){
      const k=normalize(key);

      if(
        row[k]!==undefined &&
        row[k]!==""
      ){
        return row[k];
      }
    }

    return "";
  }

  function equipoResumenDesdeTexto(v){
    const e=normalize(v);

    if(
      e.includes("barcelona") ||
      e==="barca" ||
      e==="barça"
    ){
      return "barcelona";
    }

    if(
      e.includes("real madrid") ||
      e==="madrid"
    ){
      return "madrid";
    }

    return "";
  }

  const emptyBlock=()=>({
    total:0,
    si:0,
    no:0,
    balance:0
  });

  const emptySummary=()=>({
    barcelona:{
      penalti:{
        pitado_favor:emptyBlock(),
        pitado_contra:emptyBlock(),
        no_pitado_favor:emptyBlock(),
        no_pitado_contra:emptyBlock()
      },
      gol:{
        concedido_favor:emptyBlock(),
        concedido_contra:emptyBlock(),
        anulado_favor:emptyBlock(),
        anulado_contra:emptyBlock()
      },
      roja:{
        sacada_equipo:emptyBlock(),
        no_sacada_equipo:emptyBlock(),
        sacada_rival:emptyBlock(),
        no_sacada_rival:emptyBlock()
      }
    },

    madrid:{
      penalti:{
        pitado_favor:emptyBlock(),
        pitado_contra:emptyBlock(),
        no_pitado_favor:emptyBlock(),
        no_pitado_contra:emptyBlock()
      },
      gol:{
        concedido_favor:emptyBlock(),
        concedido_contra:emptyBlock(),
        anulado_favor:emptyBlock(),
        anulado_contra:emptyBlock()
      },
      roja:{
        sacada_equipo:emptyBlock(),
        no_sacada_equipo:emptyBlock(),
        sacada_rival:emptyBlock(),
        no_sacada_rival:emptyBlock()
      }
    }
  });

  function obtenerImpacto(
    categoria,
    subtipo,
    encuesta
  ){
    if(normalize(encuesta)!=="no"){
      return 0;
    }

    const mapa={
      penalti:{
        pitado_favor:1,
        pitado_contra:-1,
        no_pitado_favor:-1,
        no_pitado_contra:1
      },

      gol:{
        concedido_favor:1,
        concedido_contra:-1,
        anulado_favor:-1,
        anulado_contra:1
      },

      roja:{
        sacada_equipo:0,
        no_sacada_equipo:1,
        sacada_rival:1,
        no_sacada_rival:-1
      }
    };

    return mapa[
      normalize(categoria)
    ]?.[
      normalize(subtipo)
    ]??0;
  }

  const encuestaGanadora=(
    si,
    no
  )=>
    no>si
      ? "no"
      : si>no
        ? "si"
        : "";

  async function loadCSVJugadas(){
    const resp=await fetch(
      "jugadas.csv",
      {
        cache:"no-store"
      }
    );

    if(!resp.ok){
      throw new Error(
        "No se pudo cargar jugadas.csv"
      );
    }

    const rows=
      parseCSV(
        await resp.text()
      );

    return rows
      .map((row,index)=>{
        const g=(...keys)=>
          valueFromRow(
            row,
            keys
          );

        const jornada=
          extraerNumeroJornada(
            g(
              "Jornada",
              "jornada"
            )
          );

        return {
          id:
            g("id") ||
            String(index+1),

          competicion:
            g(
              "Competición",
              "Competicion",
              "competicion"
            ) ||
            "LaLiga",

          jornada,

          partido:g(
            "Partido",
            "partido"
          ),

          arbitro:g(
            "Árbitro",
            "Arbitro",
            "arbitro"
          ),

          var:g(
            "VAR",
            "var",
            "Arbitro VAR",
            "Árbitro VAR",
            "arbitro_var"
          ),

          minuto:g(
            "Minuto",
            "minuto"
          ),

          equipoAfectado:g(
            "Equipo afectado",
            "equipo afectado",
            "equipo_afectado"
          ),

          categoria:g(
            "Categoría",
            "Categoria",
            "categoria"
          ),

          subtipo:g(
            "Subtipo",
            "subtipo"
          ),

          pregunta:g(
            "Pregunta",
            "pregunta"
          ),

          decision:g(
            "Decisión arbitral",
            "Decision arbitral",
            "decision arbitral",
            "decision_arbitral"
          ),

          descripcion:g(
            "Descripción",
            "Descripcion",
            "descripcion"
          ),

          slugImagen:g(
            "slug_imagen",
            "slug imagen"
          ),

          slugImagen2:g(
            "slug_imagen2",
            "slug imagen2"
          ),

          slugImagen3:g(
            "slug_imagen3",
            "slug imagen3"
          ),

          slugImagen4:g(
            "slug_imagen4",
            "slug imagen4"
          ),

          slugImagen5:g(
            "slug_imagen5",
            "slug imagen5"
          ),

          slugVideo:g(
            "slug_video",
            "slug video"
          ),

          slugVideo2:g(
            "slug_video2",
            "slug video2"
          ),

          respuestaSi:
            g(
              "Respuesta si",
              "respuesta si",
              "respuesta_si"
            ) ||
            "Sí",

          respuestaNo:
            g(
              "Respuesta no",
              "respuesta no",
              "respuesta_no"
            ) ||
            "No",

          votosInicialesSi:
            numeroSeguro(
              g(
                "votos iniciales si",
                "Votos iniciales si",
                "votos_iniciales_si"
              )
            ),

          votosInicialesNo:
            numeroSeguro(
              g(
                "votos iniciales no",
                "Votos iniciales no",
                "votos_iniciales_no"
              )
            ),

          comentario1:g(
            "comentario1"
          ),

          usuariocomentario1:g(
            "usuariocomentario1",
            "usuario comentario1",
            "usuario_comentario1"
          ),

          fechacomentario1:g(
            "fechacomentario1",
            "fecha comentario1",
            "fecha_comentario1"
          ),

          comentario2:g(
            "comentario2"
          ),

          usuariocomentario2:g(
            "usuariocomentario2",
            "usuario comentario2",
            "usuario_comentario2"
          ),

          fechacomentario2:g(
            "fechacomentario2",
            "fecha comentario2",
            "fecha_comentario2"
          ),

          comentario3:g(
            "comentario3"
          ),

          usuariocomentario3:g(
            "usuariocomentario3",
            "usuario comentario3",
            "usuario_comentario3"
          ),

          fechacomentario3:g(
            "fechacomentario3",
            "fecha comentario3",
            "fecha_comentario3"
          ),

          comentario4:g(
            "comentario4"
          ),

          usuariocomentario4:g(
            "usuariocomentario4",
            "usuario comentario4",
            "usuario_comentario4"
          ),

          fechacomentario4:g(
            "fechacomentario4",
            "fecha comentario4",
            "fecha_comentario4"
          ),

          comentario5:g(
            "comentario5"
          ),

          usuariocomentario5:g(
            "usuariocomentario5",
            "usuario comentario5",
            "usuario_comentario5"
          ),

          fechacomentario5:g(
            "fechacomentario5",
            "fecha comentario5",
            "fecha_comentario5"
          )
        };
      })
      .filter(j=>
        j.jornada &&
        j.partido &&
        j.categoria
      )
      .map(j=>({
        ...j,

        equipoResumen:
          equipoResumenDesdeTexto(
            j.equipoAfectado
          )
      }));
  }

  async function loadJugadasPublicas(){
    return (
      await loadCSVJugadas()
    ).map(j=>{
      const votosSi=
        numeroSeguro(
          j.votosInicialesSi
        );

      const votosNo=
        numeroSeguro(
          j.votosInicialesNo
        );

      return {
        ...j,
        votosSi,
        votosNo,
        totalVotos:
          votosSi+votosNo,

        encuesta:
          encuestaGanadora(
            votosSi,
            votosNo
          )
      };
    });
  }

  async function getVotesMap(ids){
    if(!supabase){
      return {};
    }

    const unique=[
      ...new Set(
        (ids||[])
          .filter(Boolean)
      )
    ];

    if(!unique.length){
      return {};
    }

    try{
      const {
        data,
        error
      }=await supabase
        .from("votos")
        .select(
          "jugada_id,voto"
        )
        .in(
          "jugada_id",
          unique
        );

      if(error){
        throw error;
      }

      const map={};

      unique.forEach(id=>{
        map[id]={
          si:0,
          no:0,
          total:0
        };
      });

      (data||[]).forEach(r=>{
        const m=
          map[r.jugada_id] ||
          (
            map[r.jugada_id]={
              si:0,
              no:0,
              total:0
            }
          );

        const v=
          normalize(r.voto);

        if(v==="si"){
          m.si++;
          m.total++;
        }else if(v==="no"){
          m.no++;
          m.total++;
        }
      });

      return map;

    }catch(e){
      console.error(
        "No se pudieron cargar los votos online",
        e
      );

      return {};
    }
  }

  function mergeVotes(
    jugadas,
    map
  ){
    return jugadas.map(j=>{
      const o=
        map[j.id] ||
        {
          si:0,
          no:0
        };

      const votosSi=
        numeroSeguro(
          j.votosInicialesSi
        )+
        numeroSeguro(
          o.si
        );

      const votosNo=
        numeroSeguro(
          j.votosInicialesNo
        )+
        numeroSeguro(
          o.no
        );

      return {
        ...j,
        votosSi,
        votosNo,
        totalVotos:
          votosSi+votosNo,

        encuesta:
          encuestaGanadora(
            votosSi,
            votosNo
          )
      };
    });
  }

  function buildSummary(jugadas){
    const resumen=
      emptySummary();

    const jugadasVAR=[];

    for(const j of jugadas){
      const equipo=
        normalize(
          j.equipoResumen
        );

      const categoria=
        normalize(
          j.categoria
        );

      const subtipo=
        normalize(
          j.subtipo
        );

      if(
        !equipo ||
        !categoria ||
        !subtipo
      ){
        continue;
      }

      jugadasVAR.push({
        id:j.id,
        jornada:j.jornada,
        equipoVisible:
          j.equipoAfectado,
        competicion:
          j.competicion,
        tipoFiltro:
          categoria,
        equipo,
        categoria,
        subtipo,
        encuesta:
          j.encuesta,
        arbitro:
          j.arbitro||"",
        var:
          j.var||"",
        partido:
          j.partido||"",
        minuto:
          j.minuto||"",
        decision:
          j.decision||"",
        pregunta:
          j.pregunta||"",
        votosSi:
          numeroSeguro(
            j.votosSi
          ),
        votosNo:
          numeroSeguro(
            j.votosNo
          ),
        totalVotos:
          numeroSeguro(
            j.totalVotos
          )
      });

      const b=
        resumen[
          equipo
        ]?.[
          categoria
        ]?.[
          subtipo
        ];

      if(!b){
        continue;
      }

      b.total++;

      if(j.encuesta==="si"){
        b.si++;
      }else if(
        j.encuesta==="no"
      ){
        b.no++;
      }

      b.balance+=
        obtenerImpacto(
          categoria,
          subtipo,
          j.encuesta
        );
    }

    return {
      resumen,
      jugadasVAR
    };
  }

  const buildSummaryBlocks=
    resumen=>[
      "penalti",
      "gol",
      "roja"
    ].map(key=>({
      key,

      barca:
        Object.values(
          resumen.barcelona[key]
        ).reduce(
          (a,b)=>
            a+
            numeroSeguro(
              b.balance
            ),
          0
        ),

      madrid:
        Object.values(
          resumen.madrid[key]
        ).reduce(
          (a,b)=>
            a+
            numeroSeguro(
              b.balance
            ),
          0
        )
    }));

  function buildJornadasData(
    jugadasVAR
  ){
    const map=new Map();

    jugadasVAR.forEach(j=>{
      const k=
        Number(
          j.jornada||0
        );

      if(!k){
        return;
      }

      if(!map.has(k)){
        map.set(
          k,
          {
            jornada:k,
            barca:0,
            madrid:0
          }
        );
      }

      const r=
        map.get(k);

      const impact=
        obtenerImpacto(
          j.categoria,
          j.subtipo,
          j.encuesta
        );

      if(
        j.equipo==="barcelona"
      ){
        r.barca+=impact;
      }

      if(
        j.equipo==="madrid"
      ){
        r.madrid+=impact;
      }
    });

    return [
      ...map.values()
    ].sort(
      (a,b)=>
        a.jornada-
        b.jornada
    );
  }

  async function loadDataset(){
    const base=
      await loadCSVJugadas();

    const jugadas=
      mergeVotes(
        base,
        await getVotesMap(
          base.map(j=>j.id)
        )
      );

    const {
      resumen,
      jugadasVAR
    }=
      buildSummary(
        jugadas
      );

    return {
      jugadas,
      resumen,
      jugadasVAR,

      resumenBloques:
        buildSummaryBlocks(
          resumen
        ),

      jornadasData:
        buildJornadasData(
          jugadasVAR
        )
    };
  }

  async function ensureAnonymousSession(){
    if(!supabase){
      return null;
    }

    const {
      data:s
    }=
      await supabase.auth
        .getSession();

    if(
      s?.session?.user
    ){
      return s.session.user;
    }

    const {
      data,
      error
    }=
      await supabase.auth
        .signInAnonymously();

    if(error){
      throw error;
    }

    return (
      data?.user ||
      data?.session?.user ||
      null
    );
  }

  async function getUsuarioActual(){
    try{
      return await ensureAnonymousSession();
    }catch(e){
      console.error(
        "No se pudo iniciar la sesión anónima",
        e
      );

      return null;
    }
  }

  async function getPerfilActual(){
    const user=
      await getUsuarioActual();

    return user
      ? {
          id:user.id,
          username:"Usuario"
        }
      : null;
  }

  async function crearPerfil(){
    return true;
  }

  const voteStorageKey=id=>
    `polemicavar_voto_${String(id||"")}`;

  function getUserVote(id){
    try{
      return (
        localStorage.getItem(
          voteStorageKey(id)
        ) ||
        ""
      );
    }catch{
      return "";
    }
  }

  function setUserVote(
    id,
    voto
  ){
    try{
      localStorage.setItem(
        voteStorageKey(id),
        String(voto||"")
      );
    }catch{}
  }

  async function getCurrentUserVote(
    jugadaId
  ){
    if(!supabase){
      return getUserVote(
        jugadaId
      );
    }

    const user=
      await getUsuarioActual();

    if(!user){
      return getUserVote(
        jugadaId
      );
    }

    try{
      const {
        data,
        error
      }=await supabase
        .from("votos")
        .select("voto")
        .eq(
          "jugada_id",
          jugadaId
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

      if(error){
        throw error;
      }

      if(data?.voto){
        setUserVote(
          jugadaId,
          data.voto
        );
      }

      return (
        data?.voto ||
        getUserVote(
          jugadaId
        )
      );

    }catch(e){
      console.error(
        "No se pudo obtener el voto del navegador",
        e
      );

      return getUserVote(
        jugadaId
      );
    }
  }

  function resolveCommentJugadaId(
    scope,
    jugadaId=""
  ){
    const explicit=
      String(
        jugadaId||""
      ).trim();

    if(explicit){
      return explicit;
    }

    const safe=
      String(
        scope||"general"
      )
        .trim()
        .toLowerCase()
        .replace(
          /[^a-z0-9_-]/g,
          "-"
        );

    return `${
      safe||"general"
    }-general`;
  }

  async function getComments(
    scope,
    jugadaId=""
  ){
    if(!supabase){
      return [];
    }

    try{
      let q=supabase
        .from("comentarios")
        .select("*")
        .order(
          "created_at",
          {
            ascending:false
          }
        )
        .eq(
          "jugada_id",
          resolveCommentJugadaId(
            scope,
            jugadaId
          )
        );

      if(scope){
        q=q.eq(
          "scope",
          scope
        );
      }

      const {
        data,
        error
      }=await q;

      if(error){
        throw error;
      }

      return data||[];

    }catch(e){
      console.error(
        "No se pudieron cargar comentarios online",
        e
      );

      return [];
    }
  }

  async function addComment(
    scope,
    text,
    jugadaId="",
    autor=""
  ){
    if(!supabase){
      throw new Error(
        "Servicio no disponible"
      );
    }

    const limpioTexto=
      String(
        text||""
      ).trim();

    const limpioAutor=
      String(
        autor||""
      ).trim();

    if(!limpioTexto){
      throw new Error(
        "Escribe un comentario"
      );
    }

    if(!limpioAutor){
      throw new Error(
        "Escribe un nombre"
      );
    }

    const {
      error
    }=await supabase
      .from("comentarios")
      .insert({
        jugada_id:
          resolveCommentJugadaId(
            scope,
            jugadaId
          ),

        autor:
          limpioAutor,

        texto:
          limpioTexto,

        scope:
          scope||"general",

        tipo:
          "texto",

        audio_url:
          null,

        audio_path:
          null,

        mime_type:
          null,

        duracion_segundos:
          null
      });

    if(error){
      throw error;
    }
  }

  async function addAudioComment(
    scope,
    audioBlob,
    jugadaId="",
    autor="",
    duracionSegundos=0
  ){
    if(!supabase){
      throw new Error(
        "Servicio no disponible"
      );
    }

    if(
      !(audioBlob instanceof Blob) ||
      !audioBlob.size
    ){
      throw new Error(
        "El audio está vacío"
      );
    }

    const limpioAutor=
      String(
        autor||""
      ).trim();

    if(!limpioAutor){
      throw new Error(
        "Escribe un nombre"
      );
    }

    const user=
      await ensureAnonymousSession();

    if(!user){
      throw new Error(
        "No se pudo identificar este navegador"
      );
    }

    const mime=
      String(
        audioBlob.type||
        "audio/webm"
      ).toLowerCase();

    let ext="webm";

    if(
      mime.includes("mp4") ||
      mime.includes("m4a")
    ){
      ext="m4a";
    }else if(
      mime.includes("ogg")
    ){
      ext="ogg";
    }else if(
      mime.includes("mpeg") ||
      mime.includes("mp3")
    ){
      ext="mp3";
    }

    const resolved=
      resolveCommentJugadaId(
        scope,
        jugadaId
      );

    const safe=
      resolved.replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );

    const ruta=
      `${user.id}/${safe}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2,9)}.${ext}`;

    const {
      error:uploadError
    }=await supabase.storage
      .from(
        "comentarios-audio"
      )
      .upload(
        ruta,
        audioBlob,
        {
          contentType:
            audioBlob.type||
            "audio/webm",

          upsert:false
        }
      );

    if(uploadError){
      throw uploadError;
    }

    const {
      data:publicData
    }=supabase.storage
      .from(
        "comentarios-audio"
      )
      .getPublicUrl(
        ruta
      );

    const audioUrl=
      publicData?.publicUrl;

    if(!audioUrl){
      await supabase.storage
        .from(
          "comentarios-audio"
        )
        .remove([
          ruta
        ]);

      throw new Error(
        "No se pudo generar la dirección del audio"
      );
    }

    const payload={
      jugada_id:
        resolved,

      autor:
        limpioAutor,

      texto:
        null,

      scope:
        scope||"general",

      tipo:
        "audio",

      audio_url:
        audioUrl,

      audio_path:
        ruta,

      mime_type:
        audioBlob.type||
        "audio/webm",

      duracion_segundos:
        Math.max(
          0,
          Math.round(
            Number(
              duracionSegundos
            )||0
          )
        )
    };

    const {
      error
    }=await supabase
      .from("comentarios")
      .insert(
        payload
      );

    if(error){
      await supabase.storage
        .from(
          "comentarios-audio"
        )
        .remove([
          ruta
        ]);

      throw error;
    }
  }

  async function addVote(
    jugadaId,
    voto
  ){
    if(!supabase){
      throw new Error(
        "Servicio no disponible"
      );
    }

    const user=
      await ensureAnonymousSession();

    if(!user){
      throw new Error(
        "No se pudo identificar este navegador"
      );
    }

    const {
      error
    }=await supabase
      .from("votos")
      .insert({
        jugada_id:
          String(
            jugadaId
          ),

        user_id:
          user.id,

        voto:
          String(
            voto||""
          ).toLowerCase()
      });

    if(error){
      if(
        error.code==="23505"
      ){
        const e=
          new Error(
            "Ya has votado en esta encuesta desde este navegador"
          );

        e.code=
          "ALREADY_VOTED";

        throw e;
      }

      throw error;
    }

    setUserVote(
      jugadaId,
      voto
    );
  }

  function formatDate(value){
    try{
      if(!value){
        return "";
      }

      const raw=
        String(
          value
        ).trim();

      const d=
        new Date(
          raw
        );

      if(
        !isNaN(
          d.getTime()
        )
      ){
        return d.toLocaleString(
          "es-ES",
          {
            day:"2-digit",
            month:"2-digit",
            year:"numeric",
            hour:"2-digit",
            minute:"2-digit"
          }
        );
      }

      return raw;

    }catch{
      return "";
    }
  }

  async function loginConGoogle(){
    if(!supabase){
      alert(
        "Inicio de sesión no disponible ahora mismo"
      );

      return;
    }

    const {
      error
    }=await supabase.auth
      .signInWithOAuth({
        provider:"google",

        options:{
          redirectTo:
            window.location.href
              .split("#")[0]
        }
      });

    if(error){
      alert(
        "Error al iniciar sesión con Google"
      );

      console.error(
        error
      );
    }
  }

  async function logout(){
    if(!supabase){
      return;
    }

    const {
      error
    }=await supabase.auth
      .signOut();

    if(error){
      throw error;
    }
  }

  return {
    supabase,
    normalize,
    escapeHtml,
    numeroSeguro,
    loadDataset,
    loadJugadasPublicas,
    getComments,
    addComment,
    addAudioComment,
    addVote,
    formatDate,
    obtenerImpacto,
    buildSummaryBlocks,
    buildJornadasData,
    loginConGoogle,
    logout,
    getUsuarioActual,
    getPerfilActual,
    crearPerfil,
    getCurrentUserVote,
    ensureAnonymousSession,
    getUserVote,
    setUserVote
  };
})();
