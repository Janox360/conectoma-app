// app.js · la app web del Conectoma: memoria, reproductor, pantalla bloqueada y menú. La lógica está en conectoma.js.
const VERSION = "1.0.0";
const CLAVE_DB = "conectoma-db", CLAVE_YT = "conectoma-clave-youtube";
const ERRORES_SIN_EMBED = [100, 101, 150, 152, 153];
const $ = (id) => document.getElementById(id);

// ---------- la memoria (mismo formato que conectoma-iphone.json de Scriptable: se puede importar tal cual) ----------
let DB;
function nuevaDB(x) {
  const d = Object.assign({ version: 1, videos: {}, rondas: {}, decisiones: [], lista: "para-mi", ultima: null, tanda: [],
    semillas: {}, buscados: {}, ajustes: {} }, x || {});
  for (const v of Object.values(d.videos)) {
    v.casa = Object.assign({ v: 0, l: 0, c: 0, s: 0 }, v.casa);
    Object.assign(v, { l: v.l || 0, s: v.s || 0, c: v.c || 0, n: v.n || 0, u: v.u || 0, h: v.h || {}, b: !!v.b });
  }
  return d;
}
function cargar() { try { DB = nuevaDB(JSON.parse(localStorage.getItem(CLAVE_DB) || "null")); } catch (e) { DB = nuevaDB(); } }
function guardar() {
  DB.decisiones = DB.decisiones.slice(-300);
  try { localStorage.setItem(CLAVE_DB, JSON.stringify(DB)); } catch (e) { aviso("⚠️", "No pude guardar lo aprendido (¿Safari en modo privado?)."); }
}
const listaActual = () => LISTAS.find((l) => l.id === DB.lista) || LISTAS[0];
function video(id, titulo) {
  if (!DB.videos[id]) DB.videos[id] = { t: titulo, casa: { v: 0, l: 0, c: 0, s: 0 }, l: 0, s: 0, c: 0, n: 0, u: 0, h: {}, b: false };
  if (titulo && !DB.videos[id].t) DB.videos[id].t = titulo;
  return DB.videos[id];
}
let avisoTimer = null;
async function aviso(titulo, texto) {
  const a = $("aviso");
  a.textContent = (titulo ? titulo + " " : "") + texto;
  a.classList.add("ver");
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => a.classList.remove("ver"), 6000);
}

// ---------- YouTube: buscar canciones nuevas (la página no puede leer youtube.com: usa la API con tu clave gratis) ----------
const claveYoutube = () => localStorage.getItem(CLAVE_YT) || "";
const desHtml = (s) => { const t = document.createElement("textarea"); t.innerHTML = s; return t.value; };
const iso = (d) => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d || ""); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : null; };
async function buscarYoutube(q) {
  const k = claveYoutube();
  if (!k) return null;
  const u = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=15&q=" + encodeURIComponent(q) + "&key=" + encodeURIComponent(k);
  const r = await fetch(u);
  if (!r.ok) throw new Error("YouTube " + r.status);
  const items = ((await r.json()).items || []).filter((x) => x.id && x.id.videoId);
  const ids = items.map((x) => x.id.videoId);
  let dur = {};
  if (ids.length) {
    const d = await fetch("https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=" + ids.join(",") + "&key=" + encodeURIComponent(k));
    if (d.ok) for (const x of (await d.json()).items || []) dur[x.id] = iso(x.contentDetails && x.contentDetails.duration);
  }
  return items.map((x) => ({ id: x.id.videoId, titulo: desHtml(x.snippet.title), dur: dur[x.id.videoId] ?? null }));
}
async function buscarNuevas(avisar) {
  if (!claveYoutube()) { if (avisar) abrirMenu("clave"); return 0; }
  $("estado").textContent = "🌱 Buscando canciones nuevas…";
  try { return await semillas(listaActual(), avisar); } finally { pintarEstado(); }
}

// ---------- el reproductor ----------
let yt = null, listo = false, arranco = false, debeSonar = false, actual = null, proxima = null;
const historia = [];
const evitar = () => new Set([...historia.slice(-30), proxima && proxima.id].filter(Boolean));
function tomar() {
  const lista = listaActual();
  const r = elegir(lista, evitar(), true);
  if (r.vueltaNueva && tocaSemillas(lista) && claveYoutube()) semillas(lista, false).catch(() => {});
  return r.cancion;
}
function sonar(c) {
  if (!c) {
    $("titulo").textContent = "No hay canciones en " + listaActual().name;
    $("info").textContent = claveYoutube() ? "Toca ☰ › 🌱 Buscar canciones nuevas." : "Toca ☰ e importa lo de Scriptable o pon tu clave de YouTube.";
    return;
  }
  const lista = listaActual();
  actual = c; historia.push(c.id); anotar(c, lista);
  DB.ultima = { id: c.id, t: c.v.t, ts: Date.now() }; DB.tanda = historia.slice(-25);
  proxima = tomar();
  guardar();
  const likes = c.v.l + c.v.casa.l;
  $("titulo").textContent = c.v.t;
  $("info").textContent = lista.name + (likes ? " · 👍 " + likes : "") + (c.v.semilla && c.v.n === 1 ? " · 🌱 nueva" : "");
  $("prox").textContent = proxima ? "Después: " + proxima.v.t : "";
  if (listo) arranco ? yt.loadVideoById(c.id) : yt.cueVideoById(c.id);
  pantallaBloqueada(c.v.t);
  pintarEstado();
}
function siguiente() { const c = proxima && !proxima.v.b ? proxima : tomar(); proxima = null; sonar(c); }
function atras() {
  if (historia.length < 2) return;
  historia.pop(); const id = historia.pop();
  proxima = actual; sonar({ id, v: DB.videos[id] });
}
// Safari 17+: pedirle a iOS una sesión de audio de «reproducción» (como hacen las apps de música) en vez de la de página
try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
function play() { arranco = true; debeSonar = true; $("tapa").style.display = "none"; if (listo) yt.playVideo(); }
function pausa() { debeSonar = false; if (listo) yt.pauseVideo(); }

window.onYouTubeIframeAPIReady = function () {
  yt = new YT.Player("yt", {
    host: "https://www.youtube-nocookie.com",
    playerVars: { playsinline: 1, rel: 0, modestbranding: 1, fs: 1, iv_load_policy: 3 },
    events: {
      onReady: () => { listo = true; if (actual) yt.cueVideoById(actual.id); },
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.ENDED) { if (actual) actual.v.c++; siguiente(); }
        if (e.data === YT.PlayerState.PLAYING) { arranco = true; $("tapa").style.display = "none"; $("pp").textContent = "⏸"; }
        if (e.data === YT.PlayerState.PAUSED) {
          $("pp").textContent = "▶️";
          if (document.visibilityState === "visible") debeSonar = false; // la pausaste tú (con la pantalla prendida)
        }
        if (e.data === YT.PlayerState.CUED && arranco && debeSonar) yt.playVideo();
        if ("mediaSession" in navigator) navigator.mediaSession.playbackState = e.data === YT.PlayerState.PLAYING ? "playing" : "paused";
      },
      onError: (e) => { // no se puede ver fuera de YouTube: no se vuelve a elegir
        if (actual && ERRORES_SIN_EMBED.includes(e.data)) { actual.v.ne = true; historia.pop(); }
        siguiente();
      },
    },
  });
};

// ---------- pantalla bloqueada: controles y volver a sonar ----------
function pantallaBloqueada(titulo) {
  if (!("mediaSession" in navigator)) return;
  const partes = String(titulo).split(/\s[-–—|]\s/);
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: partes[1] || titulo, artist: partes.length > 1 ? partes[0] : "", album: "Conectoma · " + listaActual().name,
      artwork: [{ src: "icono-512.png", sizes: "512x512", type: "image/png" }] });
    navigator.mediaSession.setActionHandler("play", play);
    navigator.mediaSession.setActionHandler("pause", pausa);
    navigator.mediaSession.setActionHandler("nexttrack", siguiente);
    navigator.mediaSession.setActionHandler("previoustrack", atras);
  } catch (e) {}
}
// iOS pausa el video al bloquear: si tenía que sonar, se le vuelve a dar play; y si terminó mientras tanto, la siguiente
setInterval(() => {
  if (!listo || !debeSonar || !actual) return;
  const e = yt.getPlayerState();
  if (e === YT.PlayerState.ENDED) { actual.v.c++; siguiente(); }
  else if (e === YT.PlayerState.PAUSED || e === YT.PlayerState.CUED) yt.playVideo();
}, 2000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && debeSonar && listo && yt.getPlayerState() !== 1) yt.playVideo(); });

// ---------- opinar ----------
function opinar(tipo) {
  const v = actual && actual.v;
  if (!v) return;
  if (tipo === "like") { v.l++; guardar(); aviso("👍", "Aprendido: te gusta"); return; }
  if (tipo === "skip") v.s++;
  if (tipo === "block") { v.b = true; v.s += 3; aviso("⛔", "No vuelve a sonar: " + v.t); }
  siguiente();
}

// ---------- menú ☰ ----------
function abrirMenu(foco) {
  $("menu").classList.add("ver");
  $("clave").value = claveYoutube();
  pintarEstado();
  if (foco === "clave") { $("clave").focus(); aviso("🔑", "Para buscar canciones nuevas falta tu clave de YouTube."); }
}
function pintarEstado() {
  const l = listaActual(), c = candidatos(l).filter((x) => !x.v.ne), r = (DB.rondas[l.id] || []).length;
  const todos = Object.keys(DB.videos).length;
  $("estado").textContent = l.name + ": " + c.length + " canciones, " + Math.min(r, c.length) + " ya sonaron en esta vuelta. La app conoce " + todos + " videos.";
}
function importar(archivo) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const x = nuevaDB(JSON.parse(fr.result));
      let nuevos = 0;
      for (const [id, v] of Object.entries(x.videos)) { // se suma a lo que ya sabe la app
        const a = DB.videos[id];
        if (!a) { DB.videos[id] = v; nuevos++; continue; }
        for (const k of ["l", "s", "c", "n"]) a[k] = Math.max(a[k], v[k]);
        for (const k of ["v", "l", "c", "s"]) a.casa[k] = Math.max(a.casa[k], v.casa[k]);
        a.b = a.b || v.b; a.ne = a.ne || v.ne; a.semilla = a.semilla || v.semilla;
      }
      guardar(); pintarEstado();
      aviso("📥", nuevos + " canciones nuevas importadas (" + Object.keys(x.videos).length + " en el archivo).");
      if (!actual) sonar(tomar());
    } catch (e) { aviso("⚠️", "Ese archivo no es del Conectoma."); }
  };
  fr.readAsText(archivo);
}
function exportar() {
  const b = new Blob([JSON.stringify(DB)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b); a.download = "conectoma-iphone.json"; a.click();
}

// ---------- arranque ----------
cargar();
$("lista").innerHTML = LISTAS.map((l) => `<option value="${l.id}">${l.name}</option>`).join("");
$("lista").value = listaActual().id;
$("lista").onchange = (e) => { DB.lista = e.target.value; proxima = null; guardar(); siguiente(); if (candidatos(listaActual()).length < 10) buscarNuevas(false).then((n) => n && !actual && siguiente()); };
$("tapa").onclick = play;
$("pp").onclick = () => (listo && yt.getPlayerState() === 1 ? pausa() : play());
$("sig").onclick = siguiente;
$("atras").onclick = atras;
$("like").onclick = () => opinar("like");
$("nolike").onclick = () => opinar("skip");
$("bloq").onclick = () => opinar("block");
$("abrirMenu").onclick = () => abrirMenu();
$("cerrarMenu").onclick = () => $("menu").classList.remove("ver");
$("buscar").onclick = () => buscarNuevas(true);
$("guardarClave").onclick = () => { localStorage.setItem(CLAVE_YT, $("clave").value.trim()); aviso("🔑", "Clave guardada."); };
$("archivo").onchange = (e) => e.target.files[0] && importar(e.target.files[0]);
$("exportar").onclick = exportar;
$("version").textContent = "v" + VERSION;
if (!(navigator.standalone || matchMedia("(display-mode: standalone)").matches)) $("instalar").style.display = "block";
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
sonar(tomar());
if (!actual && claveYoutube()) buscarNuevas(false).then(() => !actual && sonar(tomar()));
