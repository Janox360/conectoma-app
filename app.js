// app.js · la app web del Conectoma: memoria, reproductor, pantalla bloqueada y menú. La lógica está en conectoma.js.
const VERSION = "1.3.0";
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
function cargar() { try { DB = nuevaDB(JSON.parse(localStorage.getItem(CLAVE_DB) || "null")); } catch (e) { DB = nuevaDB(); }
  for (const [id, v] of Object.entries(DB.videos)) if (VETADOS.test(v.t || "")) delete DB.videos[id];
}
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
// sin clave: los buscadores libres de YouTube (Piped e Invidious) sí dejan que una página les pregunte.
// Son servidores de voluntarios: se prueba uno tras otro y se recuerda el que respondió.
const LIBRES = [
  ["piped", "https://pipedapi.kavin.rocks"], ["piped", "https://pipedapi.adminforge.de"], ["piped", "https://api.piped.private.coffee"],
  ["inv", "https://inv.nadeko.net"], ["inv", "https://invidious.nerdvpn.de"], ["inv", "https://yewtu.be"], ["inv", "https://invidious.privacyredirect.com"],
];
// «Gasolina» del canal «Daddy Yankee - Topic» o «DaddyYankeeVEVO» → «Daddy Yankee - Gasolina», para que el filtro reconozca al artista
function conArtista(titulo, canal) {
  titulo = String(titulo || "");
  if (/\s[-–—|]\s/.test(titulo) || !canal) return titulo;
  const c = normalizar(String(canal).replace(/\s*-\s*topic$/i, "").replace(/vevo$/i, "").replace(/([a-z])([A-Z])/g, "$1 $2"));
  const a = TODOS_ARTISTAS.find((n) => normalizar(n) === c || normalizar(n).replace(/ /g, "") === c.replace(/ /g, ""));
  return a ? a + " - " + titulo : titulo;
}
async function conTiempo(u, ms) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(u, { signal: c.signal }); if (!r.ok) throw new Error(r.status); return await r.json(); } finally { clearTimeout(t); }
}
async function buscarLibre(q) {
  const bueno = localStorage.getItem("conectoma-buscador");
  const orden = [...LIBRES].sort((a, b) => (b[1] === bueno) - (a[1] === bueno));
  for (const [tipo, base] of orden) {
    try {
      let out;
      if (tipo === "piped") {
        const j = await conTiempo(base + "/search?filter=videos&q=" + encodeURIComponent(q), 8000);
        out = (j.items || []).filter((x) => /watch\?v=/.test(x.url || "")).map((x) => ({ id: x.url.split("v=")[1].slice(0, 11), titulo: conArtista(x.title, x.uploaderName), dur: x.duration > 0 ? x.duration : null }));
      } else {
        const j = await conTiempo(base + "/api/v1/search?type=video&q=" + encodeURIComponent(q), 8000);
        out = (Array.isArray(j) ? j : []).filter((x) => x.videoId).map((x) => ({ id: x.videoId, titulo: conArtista(x.title, x.author), dur: x.lengthSeconds > 0 ? x.lengthSeconds : null }));
      }
      if (out.length) { localStorage.setItem("conectoma-buscador", base); return out; }
    } catch (e) {}
  }
  throw new Error("ningún buscador respondió");
}
async function buscarYoutube(q) {
  if (casa() && !claveYoutube()) {
    try {
      const j = await conTiempo(casa() + "/buscar?q=" + encodeURIComponent(q), 60000);
      if (j.ok) return j.videos.map((x) => ({ id: x.id, titulo: conArtista(x.titulo, x.canal), dur: x.dur || null }));
    } catch (e) {}
  }
  const k = claveYoutube();
  if (!k) return buscarLibre(q);
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
  return items.map((x) => ({ id: x.id.videoId, titulo: conArtista(desHtml(x.snippet.title), x.snippet.channelTitle), dur: dur[x.id.videoId] ?? null }));
}
let buscando = false;
async function buscarNuevas(avisar) {
  if (buscando) return 0;
  buscando = true;
  $("estado").textContent = "🌱 Buscando canciones nuevas…";
  if (!actual) { $("titulo").textContent = "🌱 Buscando canciones para " + listaActual().name + "…"; $("info").textContent = "La primera vez demora unos segundos."; }
  try {
    const lista = listaActual();
    let n = await semillas(lista, avisar);
    if (lista.todas && candidatos(lista).length < 10) // «Para mí» empieza con un poco de cada lista
      for (const l of LISTAS.slice(1).sort(() => Math.random() - 0.5).slice(0, 3)) n += await semillas(l, false);
    return n;
  } finally { buscando = false; pintarEstado(); }
}

// ---------- el reproductor ----------
// Dos formas de sonar:
//  🎵 audio (por defecto): pide el audio de la canción a un servidor libre (Piped o Invidious) y lo toca en un <audio> de
//     la app. No pasa por el reproductor de YouTube, así que no hay anuncios, y como es audio de la propia app iOS lo
//     deja sonar con la pantalla bloqueada y pasa solo a la siguiente (como Video Lite, pero sin ser app nativa).
//  🎬 video: el reproductor embebido de YouTube (puede traer anuncios; iOS lo pausa al bloquear).
// Si una canción no consigue audio, esa suena por el reproductor de YouTube.
let yt = null, listo = false, arranco = false, debeSonar = false, actual = null, proxima = null, motor = "yt";
const historia = [];
const modo = () => localStorage.getItem("conectoma-modo") || "audio";
const au = () => $("au");
const evitar = () => new Set([...historia.slice(-30), proxima && proxima.id].filter(Boolean));
function tomar() {
  const lista = listaActual();
  const r = elegir(lista, evitar(), true);
  if (r.vueltaNueva && tocaSemillas(lista)) semillas(lista, false).catch(() => {});
  return r.cancion;
}

// el audio de una canción: m4a (el que iOS toca siempre), del servidor que respondió la última vez
const PIPED = ["https://pipedapi.kavin.rocks", "https://pipedapi.adminforge.de", "https://api.piped.private.coffee"];
const INVIDIOUS = ["https://inv.nadeko.net", "https://invidious.nerdvpn.de", "https://invidious.privacyredirect.com", "https://yewtu.be"];
const reintentos = new Set(); // canciones cuyo audio ya falló una vez
const audios = new Map(); // id → { url, hasta } (los enlaces vencen en unas horas)
// 🏠 la casa: el Acer con conectoma-audio-casa (yt-dlp, por Tailscale con HTTPS). Es lo más firme: los servidores libres
// suelen estar bloqueados por YouTube.
const CASA_DEFECTO = "https://acer.tail4d190f.ts.net:8443"; // el Acer de Jano (solo responde dentro de su Tailscale)
const casa = () => { const g = localStorage.getItem("conectoma-casa"); return (g === null ? CASA_DEFECTO : g).replace(/\/+$/, ""); };
async function fuenteAudio(id) {
  const g = audios.get(id);
  if (g && g.hasta > Date.now()) return g.url;
  if (casa() && !reintentos.has("casa:" + id)) {
    try {
      const j = await conTiempo(casa() + "/preparar/" + id, 60000);
      if (j.ok) { const url = casa() + "/audio/" + id; audios.set(id, { url, hasta: Date.now() + 2 * 3600e3 }); return url; }
    } catch (e) {}
  }
  const bueno = localStorage.getItem("conectoma-audio") || "";
  const servidores = [...PIPED.map((b) => ["piped", b]), ...INVIDIOUS.map((b) => ["inv", b])].sort((a, b) => (b[1] === bueno) - (a[1] === bueno));
  for (const [tipo, base] of servidores) {
    try {
      let lista;
      if (tipo === "piped") {
        const j = await conTiempo(base + "/streams/" + id, 9000);
        lista = (j.audioStreams || []).map((x) => ({ url: x.url, tipo: x.mimeType || "", br: x.bitrate || 0 }));
      } else {
        const j = await conTiempo(base + "/api/v1/videos/" + id + "?local=true", 9000);
        lista = (j.adaptiveFormats || []).filter((x) => /^audio\//.test(x.type || "")).map((x) => ({ url: x.url.startsWith("/") ? base + x.url : x.url, tipo: x.type, br: +x.bitrate || 0 }));
      }
      const m4a = lista.filter((x) => /mp4|m4a/.test(x.tipo) && x.url).sort((a, b) => b.br - a.br);
      if (m4a.length) {
        localStorage.setItem("conectoma-audio", base);
        audios.set(id, { url: m4a[0].url, hasta: Date.now() + 3 * 3600e3 });
        return m4a[0].url;
      }
    } catch (e) {}
  }
  return null;
}

let turno = 0; // si cambias de canción mientras busca el audio, gana la última
async function cargarCancion(c) {
  const mio = ++turno;
  $("portada").src = "https://i.ytimg.com/vi/" + c.id + "/hqdefault.jpg";
  if (modo() === "audio") {
    motor = "audio"; mostrar("audio");
    $("modoInfo").textContent = casa() ? "⏳ Preparando el audio en el Acer…" : "⏳ Buscando el audio…";
    const url = await fuenteAudio(c.id);
    if (mio !== turno) return;
    if (url) {
      fallos = 0;
      motor = "audio"; mostrar("audio");
      if (listo) yt.stopVideo();
      au().src = url;
      if (arranco && debeSonar) au().play().catch(() => { $("tapa").style.display = "flex"; });
      return;
    }
    return sinAudio(c);
  }
  motor = "yt"; mostrar("yt");
  au().pause();
  if (listo) arranco && debeSonar ? yt.loadVideoById(c.id) : yt.cueVideoById(c.id);
}
// en «solo audio» nunca se cae al reproductor de YouTube (anuncios): esa canción se salta; si fallan 3 seguidas, se para
let fallos = 0;
function sinAudio(c) {
  if (listo) yt.stopVideo();
  if (++fallos < 3) { aviso("⏭", "No conseguí el audio de esta: paso a la siguiente."); return siguiente(); }
  fallos = 0; debeSonar = false;
  $("modoInfo").textContent = "⚠️ " + (casa() ? "El Acer no responde: ¿Tailscale está encendido en el iPhone y el Acer prendido?" : "Los servidores libres no responden.");
  aviso("⚠️", casa() ? "No llego al Acer. Enciende Tailscale en el iPhone y toca ▶️." : "Sin audio. Pon la dirección del Acer en ☰ › 🏠.");
}
function mostrar(m) {
  $("yt").style.visibility = m === "yt" ? "visible" : "hidden";
  $("portada").style.display = m === "audio" ? "block" : "none";
  $("modoInfo").textContent = m === "audio" ? "🎵 Audio sin anuncios" : "🎬 Video de YouTube";
}
function sonar(c) {
  if (!c) {
    $("titulo").textContent = "No hay canciones en " + listaActual().name;
    $("info").textContent = "Toca ☰ › 🌱 Buscar canciones nuevas, o importa lo de Scriptable.";
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
  $("barra").style.width = "0";
  cargarCancion(c);
  if (proxima && modo() === "audio") fuenteAudio(proxima.id).catch(() => {}); // la próxima ya lista: al bloquear no hay que esperar
  pantallaBloqueada(c);
  pintarEstado();
}
function siguiente() { const c = proxima && !proxima.v.b ? proxima : tomar(); proxima = null; sonar(c); }
function atras() {
  if (historia.length < 2) return;
  historia.pop(); const id = historia.pop();
  proxima = actual; sonar({ id, v: DB.videos[id] });
}
function terminada() { if (actual) actual.v.c++; siguiente(); }
// Safari 17+: pedirle a iOS una sesión de audio de «reproducción» (como hacen las apps de música) en vez de la de página
try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
function play() {
  if (!actual) return;
  arranco = true; debeSonar = true; $("tapa").style.display = "none";
  if (motor === "audio") { if (au().getAttribute("src")) au().play().catch(() => {}); else cargarCancion(actual); } else if (listo) yt.playVideo();
}
function pausa() { debeSonar = false; if (motor === "audio") au().pause(); else if (listo) yt.pauseVideo(); }
const sonando = () => (motor === "audio" ? !au().paused : listo && yt.getPlayerState() === 1);

// el <audio>
function prepararAudio() {
  const a = au();
  a.addEventListener("ended", () => { if (motor === "audio") terminada(); });
  a.addEventListener("playing", () => { $("pp").textContent = "⏸"; $("tapa").style.display = "none"; estadoBloqueo("playing"); });
  a.addEventListener("pause", () => {
    $("pp").textContent = "▶️"; estadoBloqueo("paused");
    if (document.visibilityState === "visible" && !a.ended) debeSonar = false; // la pausaste tú
  });
  a.addEventListener("timeupdate", () => {
    if (!a.duration || !isFinite(a.duration)) return;
    $("barra").style.width = (100 * a.currentTime / a.duration) + "%";
    try { navigator.mediaSession.setPositionState({ duration: a.duration, position: a.currentTime, playbackRate: 1 }); } catch (e) {}
  });
  a.addEventListener("error", () => { // el enlace venció o el servidor falló: otra vez, y si no, por YouTube
    if (!actual || motor !== "audio" || !a.getAttribute("src")) return;
    const id = actual.id;
    audios.delete(id);
    if (casa() && a.getAttribute("src").startsWith(casa())) reintentos.add("casa:" + id); // la casa no pudo: los libres
    if (!reintentos.has(id)) { reintentos.add(id); localStorage.removeItem("conectoma-audio"); cargarCancion(actual); } // una vez más, con otro servidor
    else { a.removeAttribute("src"); sinAudio(actual); }
  });
}

window.onYouTubeIframeAPIReady = function () {
  yt = new YT.Player("yt", {
    host: "https://www.youtube-nocookie.com",
    playerVars: { playsinline: 1, rel: 0, modestbranding: 1, fs: 1, iv_load_policy: 3 },
    events: {
      onReady: () => { listo = true; if (actual && motor === "yt") yt.cueVideoById(actual.id); },
      onStateChange: (e) => {
        if (motor !== "yt") return;
        if (e.data === YT.PlayerState.ENDED) terminada();
        if (e.data === YT.PlayerState.PLAYING) { arranco = true; $("tapa").style.display = "none"; $("pp").textContent = "⏸"; }
        if (e.data === YT.PlayerState.PAUSED) {
          $("pp").textContent = "▶️";
          if (document.visibilityState === "visible") debeSonar = false; // la pausaste tú (con la pantalla prendida)
        }
        if (e.data === YT.PlayerState.CUED && arranco && debeSonar) yt.playVideo();
        estadoBloqueo(e.data === YT.PlayerState.PLAYING ? "playing" : "paused");
      },
      onError: (e) => { // no se puede ver fuera de YouTube: no se vuelve a elegir
        if (motor !== "yt") return;
        if (actual && ERRORES_SIN_EMBED.includes(e.data)) { actual.v.ne = true; historia.pop(); }
        siguiente();
      },
    },
  });
};

// ---------- pantalla bloqueada: controles y volver a sonar ----------
function estadoBloqueo(s) { try { navigator.mediaSession.playbackState = s; } catch (e) {} }
function pantallaBloqueada(c) {
  if (!("mediaSession" in navigator)) return;
  const partes = String(c.v.t).split(/\s[-–—|]\s/);
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: partes[1] || c.v.t, artist: partes.length > 1 ? partes[0] : "", album: "Conectoma · " + listaActual().name,
      artwork: [{ src: "https://i.ytimg.com/vi/" + c.id + "/hqdefault.jpg", sizes: "480x360", type: "image/jpeg" }, { src: "icono-512.png", sizes: "512x512", type: "image/png" }] });
    navigator.mediaSession.setActionHandler("play", play);
    navigator.mediaSession.setActionHandler("pause", pausa);
    navigator.mediaSession.setActionHandler("nexttrack", siguiente);
    navigator.mediaSession.setActionHandler("previoustrack", atras);
    navigator.mediaSession.setActionHandler("seekto", (d) => { if (motor === "audio" && d.seekTime != null) au().currentTime = d.seekTime; });
  } catch (e) {}
}
// con video: iOS lo pausa al bloquear; si tenía que sonar, se le vuelve a dar play, y si terminó mientras tanto, la siguiente
setInterval(() => {
  if (motor !== "yt" || !listo || !debeSonar || !actual) return;
  const e = yt.getPlayerState();
  if (e === YT.PlayerState.ENDED) terminada();
  else if (e === YT.PlayerState.PAUSED || e === YT.PlayerState.CUED) yt.playVideo();
}, 2000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && debeSonar && actual && !sonando()) play();
});

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
$("lista").onchange = (e) => { DB.lista = e.target.value; proxima = null; guardar(); siguiente(); if (candidatos(listaActual()).length < 10) buscarNuevas(false).then(() => { if (!actual) siguiente(); }); };
$("tapa").onclick = play;
$("pp").onclick = () => (sonando() ? pausa() : play());
$("sig").onclick = siguiente;
$("atras").onclick = atras;
$("like").onclick = () => opinar("like");
$("nolike").onclick = () => opinar("skip");
$("bloq").onclick = () => opinar("block");
$("abrirMenu").onclick = () => abrirMenu();
$("cerrarMenu").onclick = () => $("menu").classList.remove("ver");
$("buscar").onclick = () => buscarNuevas(true);
$("guardarClave").onclick = () => { localStorage.setItem(CLAVE_YT, $("clave").value.trim()); aviso("🔑", "Clave guardada."); };
$("casa").value = casa();
$("casa").placeholder = CASA_DEFECTO;
$("guardarCasa").onclick = async () => {
  let u = $("casa").value.trim().replace(/\/+$/, "");
  if (u && !/^https:\/\//.test(u)) u = "https://" + u;
  localStorage.setItem("conectoma-casa", u); $("casa").value = u;
  if (!u) return aviso("🏠", "Sin audio desde la casa.");
  aviso("🏠", "Probando…");
  try { const j = await conTiempo(u + "/health", 8000); aviso("🏠", j.ok ? "✅ Conectado al " + (j.equipo === "hp" ? "HP" : "Acer") + ": el audio sale de la casa." : "No respondió bien."); if (actual) cargarCancion(actual); }
  catch (e) { aviso("🏠", "No llego a esa dirección. ¿Tailscale está encendido en el iPhone y en el Acer?"); }
};
$("archivo").onchange = (e) => e.target.files[0] && importar(e.target.files[0]);
$("exportar").onclick = exportar;
$("version").textContent = "v" + VERSION;
prepararAudio();
$("modo").value = modo();
$("modo").onchange = (e) => { localStorage.setItem("conectoma-modo", e.target.value); if (actual) cargarCancion(actual); };
if (!(navigator.standalone || matchMedia("(display-mode: standalone)").matches)) $("instalar").style.display = "block";
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
sonar(tomar());
if (!actual) buscarNuevas(false).then(() => { if (!actual) sonar(tomar()); }).catch(() => {});
else if (candidatos(listaActual()).length < 10) buscarNuevas(false).catch(() => {});
