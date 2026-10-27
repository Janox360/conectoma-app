// conectoma.js · la lógica del Conectoma Musical (la misma de Conectoma-iPhone 1.1 en Scriptable, que viene del Acer:
// conectoma-musical-brain, selector con VUELTAS de acer-listas 1.15 y conectoma-semillas 1.5). Sin pantalla: la usa app.js.
const POR_ARTISTA = 2, POR_BUSQUEDA = 8, BUSQUEDAS_POR_VEZ = 6;
const SEMILLAS_CADA_HORAS = 6;
// ---------- las listas (las del Acer, con los artistas que agregó conectoma-semillas 1.5) ----------
// «Nombre|Variante»: las dos formas cuentan como el artista; busca con la primera.
const LISTAS = [
  { id: "para-mi", name: "Para mí", todas: true, artists: [], songs: [], keywords: [] },
  { id: "funk", name: "Funk", pista: "funk", artists: ["George Benson", "Intrigue", "Chic", "James Brown", "Earth Wind and Fire|Earth, Wind & Fire", "Kool and the Gang|Kool & the Gang", "Parliament", "Funkadelic", "The Gap Band", "Cameo", "Rick James", "Prince", "Zapp", "Ohio Players", "The Isley Brothers", "Average White Band", "S.O.S. Band", "Lakeside", "Dazz Band", "Slave", "Brass Construction", "B.T. Express", "Change", "Delegation", "The Bar-Kays", "Rufus", "Chaka Khan", "Commodores", "Mtume", "The Meters", "Dabeull", "Jamiroquai", "Vulfpeck", "Cory Wong", "Tower of Power", "The Brand New Heavies", "Incognito", "Lettuce", "Chromeo", "Breakbot", "Parcels", "Bruno Mars", "Mark Ronson", "Daft Punk", "Nile Rodgers", "Michael Jackson", "Roger Troutman"], nuevos: ["Anderson .Paak", "Tom Misch", "Durand Jones & The Indications", "Khruangbin"], songs: ["George Benson Love X Love", "Intrigue Call of the Heart"], keywords: ["funk", "funky", "boogie", "disco-funk"] },
  { id: "vinilo-boogie-80", name: "Vinilo · Boogie 80", pista: "boogie", artists: ["George Benson", "Intrigue", "Change", "Mtume", "Shalamar", "D-Train", "Dabeull", "Rockwell", "Kashif", "Midnight Star", "The System"], nuevos: ["Patrice Rushen", "Evelyn King", "Loose Ends", "Yarbrough & Peoples", "Cheryl Lynn"], songs: ["George Benson Love X Love", "Intrigue Call of the Heart"], keywords: ["boogie", "post-disco", "1980", "1981", "1982", "1983", "1984", "1985", "1986", "1987", "1988", "1989"] },
  { id: "disco-funk-70-80", name: "Disco · Funk 70/80", pista: "disco", artists: ["Chic", "Sister Sledge", "Earth Wind and Fire", "Kool and the Gang", "The Whispers", "The Trammps", "B.T. Express", "Commodores", "Bee Gees", "The Jacksons", "Michael Jackson", "Donna Summer", "Gloria Gaynor"], nuevos: ["Boney M.", "KC and the Sunshine Band|KC & The Sunshine Band", "Patrice Rushen", "Cheryl Lynn", 'Evelyn King|Evelyn "Champagne" King'], songs: [], keywords: ["disco", "funk", "boogie", "1970", "1971", "1972", "1973", "1974", "1975", "1976", "1977", "1978", "1979", "1980", "1981", "1982", "1983", "1984", "1985", "1986", "1987", "1988", "1989"] },
  { id: "soul-funk-groove", name: "Soul · Funk · Groove", pista: "soul", artists: ["James Brown", "The Isley Brothers", "Curtis Mayfield", "Stevie Wonder", "Chaka Khan", "Rufus", "The Bar-Kays", "Ohio Players", "The Meters", "Sly and the Family Stone", "Jamiroquai", "Amy Winehouse", "Marvin Gaye", "Aretha Franklin", "Al Green"], nuevos: ["Bill Withers", "Otis Redding", "Sam Cooke", "Leon Bridges", "Charles Bradley", "Sharon Jones & The Dap-Kings", "Michael Kiwanuka"], songs: [], keywords: ["soul", "funk", "groove", "rare groove"] },
  { id: "reggaeton", name: "Reguetón Old School", pista: "reggaeton", artists: ["Daddy Yankee", "Don Omar", "Tego Calderón", "Ivy Queen", "Wisin & Yandel", "Zion & Lennox", "Plan B", "Nicky Jam", "Yandel", "Wisin", "Arcángel", "De La Ghetto", "Chencho Corleone", "Ñengo Flow", "Gotay|Gotay El Autentiko", "Jowell & Randy", "Casa de Leones", "Los De La Nazza", "J Alvarez", "Nio Garcia", "Benny Benni", "Baby Rasta y Gringo", "Pusho", "Maldy", "Ñejo", "Alexis y Fido", "Héctor el Father", "Tito El Bambino", "Farruko"], nuevos: ["Héctor y Tito|Hector & Tito", "Tony Dize", "Angel y Khriz", "RKM & Ken-Y|R.K.M & Ken-Y", "Lito & Polaco", "Trebol Clan", "Julio Voltio", "Magnate y Valentino", "Ñejo & Dalmata", "Franco El Gorila", "Cosculluela"], songs: [], keywords: [] },
  { id: "urbano-trap", name: "Urbano · Trap", pista: "trap", artists: ["J Balvin", "Bad Bunny", "Karol G", "Ozuna", "Rauw Alejandro", "Feid", "Anuel AA", "Cris MJ", "Brytiago", "Darell", "El Alfa", "Myke Towers", "Jhay Cortez", "Sech", "Lenny Tavárez", "Justin Quiles"], nuevos: ["Jhayco", "Mora", "Eladio Carrión", "Young Miko", "Ryan Castro", "Blessd", "Omar Courtz", "Lunay", "Mackie", "Jamby El Favo", "Bryant Myers", "Quevedo", "Duki", "Paulo Londra", "Jay Wheeler", "Pailita", "Jere Klein", "Marcianeke", "Polimá Westcoast", "Young Cister"], songs: [], keywords: [] },
  { id: "rock-grunge-numetal", name: "Rock · Grunge · Nu-Metal", pista: "rock", artists: ["Nirvana", "Alice In Chains", "Korn", "Deftones", "System of a Down", "P.O.D.", "Rage Against the Machine", "Red Hot Chili Peppers", "Stone Temple Pilots", "Soundgarden", "Pearl Jam", "Limp Bizkit", "Mad Season", "Pantera", "Papa Roach", "Linkin Park", "Iron Maiden", "Led Zeppelin", "Audioslave", "Foo Fighters"], nuevos: ["The Smashing Pumpkins|Smashing Pumpkins", "Silverchair", "Bush", "Incubus", "Slipknot", "Queens of the Stone Age"], songs: [], keywords: [] },
  { id: "indie-psicodelia", name: "Indie · Psicodelia", pista: "indie", artists: ["Tame Impala", "Arctic Monkeys", "Inner Wave", "Feng Suave", "Men I Trust", "Radiohead", "Palace", "Beck", "Little Simz", "MGMT", "Mac DeMarco", "The Strokes"], nuevos: ["Khruangbin", "Glass Animals", "Unknown Mortal Orchestra", "King Gizzard & the Lizard Wizard", "Temples", "Babe Rainbow"], songs: [], keywords: [] },
  { id: "pop-newwave-80", name: "Pop · New Wave 80", pista: "80s", artists: ["Depeche Mode", "Tears For Fears", "A Flock Of Seagulls", "Billy Idol", "The Cure", "Duran Duran", "a-ha", "New Order", "Pet Shop Boys", "Soda Stereo"], nuevos: ["Eurythmics", "The Police", "Talking Heads", "Simple Minds", "INXS", "Los Prisioneros", "Virus", "Hombres G"], songs: [], keywords: [] },
  { id: "baladas-espanol", name: "Baladas en español", pista: "balada", artists: ["Camilo Sesto", "José José", "Juan Gabriel", "Rocío Dúrcal", "Raphael", "Nino Bravo", "Leonardo Favio", "Sandro"], nuevos: ["Luis Miguel", "Roberto Carlos", "José Luis Perales", "Julio Iglesias", "Ana Gabriel", "Rocío Jurado"], songs: [], keywords: [] },
];
// cada lista con todos sus nombres (artistas + nuevos, con variantes)
for (const l of LISTAS) {
  l.busca = [...l.artists, ...(l.nuevos || [])].map((x) => x.split("|")[0].trim());
  l.nombres = [...l.artists, ...(l.nuevos || [])].flatMap((x) => x.split("|").map((y) => y.trim())).filter(Boolean);
}
const TODOS_ARTISTAS = [...new Set(LISTAS.flatMap((l) => l.nombres))];

// ---------- filtros (de conectoma_musical_stations.py; los títulos se comparan sin tildes) ----------
const sinTildes = (s) => String(s ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
const normalizar = (s) => sinTildes(s).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const CONTENEDOR = /\b(?:dj\s*(?:set|mix)|vinyl\s*(?:set|mix|session)|vinilo|full\s*album|album\s*completo|compilation|compilad[oa]|radio\s*show|live\s*set|sesion|session|mixtape|(?:disco|funk|soul)\s*mix)\b/i;
const NO_MUSICA = /\b(?:full\s*(?:length\s*)?(?:movie|film)|feature\s*film|short\s*film|motion\s*picture|(?:official\s+)?(?:movie\s+)?trailer|teaser|full\s*(?:length\s*)?episode|episode\s*\d+|season\s*\d+|film\s+completo|pelicula\s+completa|largometraje|movie|movies|film|films|pelicula|peliculas|documentary|documental|gameplay|podcast|tutorial|unboxing|review|entrevista|interview|noticias|news|capitulo\s*\d+)\b/i;
const MARCA_MUSICA = /\b(?:official\s+audio|audio\s+oficial|official\s+video|video\s+oficial|music\s+video|video\s+musical|lyric\s+video|lyrics|lyric|letra|visuali[sz]er|vevo|provided\s+to\s+youtube|topic|full\s+song)\b/i;
const SEPARADOR = /\s(?:[-–—|]|•)\s/;
const RECOPILACION = /\b(?:mix|mezcla|megamix|enganchados?|exitos|grandes exitos|greatest hits|completo|completa|full album|vol \d+|volumen \d+|deep cuts|playlist|recopilacion|compilado|lo mejor de)\b/;
const SEP_ARTISTAS = /\s*(?:,|&|\+| x | X | y | and | con | ft\.?\s| feat\.?\s| featuring )\s*/;
const POSITIVAS = ["official video", "official audio", "audio oficial", "video oficial", "music video", "lyrics", "lyric", "letra", "remix", "live", "en vivo", "full album", "album completo", "visualizer", "vevo", "provided to youtube", "topic"];
const NEGATIVAS = ["tutorial", "como ", "noticias", "gameplay", "minecraft", "podcast", "entrevista", "review", "unboxing", "receta", "reparacion", "capitulo", "documental", "trailer", "shorts"];

function puntajeMusica(titulo) { // title_music_score del cerebro
  const t = String(titulo ?? ""), low = sinTildes(t);
  let p = / [-–—] /.test(t) ? 2 : 0;
  p += 2 * POSITIVAS.filter((w) => low.includes(w)).length;
  p -= 4 * NEGATIVAS.filter((w) => low.includes(w)).length;
  if (t.length >= 8 && t.length <= 120) p += 1;
  return Math.max(-12, Math.min(12, p));
}
const contiene = (hay, terminos) => terminos.some((x) => normalizar(x) && hay.includes(" " + normalizar(x) + " "));
function tieneIdentidad(titulo) { // has_track_identity
  const t = sinTildes(titulo).trim();
  if (MARCA_MUSICA.test(t)) return true;
  const i = t.search(SEPARADOR);
  if (i < 0) return false;
  const artista = t.slice(0, i).replace(/^[\s\-–—|:[\]()]+|[\s\-–—|:[\]()]+$/g, "");
  const cancion = t.slice(i + 3).replace(/^[\s\-–—|:[\]()]+|[\s\-–—|:[\]()]+$/g, "");
  if (artista.length < 2 || cancion.length < 2) return false;
  return contiene(" " + normalizar(artista) + " ", TODOS_ARTISTAS);
}
function calzaLista(titulo, lista) { // candidate_matches
  const t = sinTildes(titulo);
  if (CONTENEDOR.test(t) || NO_MUSICA.test(t)) return false;
  const hay = " " + normalizar(titulo) + " ";
  if (contiene(hay, lista.songs)) return true;
  const identidad = tieneIdentidad(titulo);
  if (lista.todas) return identidad;
  return (contiene(hay, lista.nombres) || contiene(hay, lista.keywords)) && identidad;
}
function huella(titulo) { // title_fingerprint del selector: la misma canción en otro video
  let t = String(titulo ?? "").replace(/\((?=[^)]*(?:official|video|audio|lyric|letra|subtit|remaster|live|en vivo|hd|4k|visualizer))[^)]*\)/gi, " ")
    .replace(/\[(?=[^\]]*(?:official|video|audio|lyric|letra|subtit|remaster|live|en vivo|hd|4k|visualizer))[^\]]*\]/gi, " ");
  t = sinTildes(t).replace(/\b(?:official\s+video|official\s+audio|music\s+video|lyric\s+video|lyrics?|letra|subtitulad[oa]|remaster(?:ed)?|visualizer|video\s+oficial|audio\s+oficial|en\s+vivo|live|hd|4k)\b/g, " ");
  return normalizar(t).slice(0, 220);
}
const artistaDe = (titulo) => { const p = String(titulo ?? "").split(SEPARADOR); return p.length >= 2 ? p[0].trim() : ""; };
function esDe(parteArtista, claves) { // «Rufus & Chaka Khan» es de Rufus; «Rufus Thomas» no
  return [parteArtista, ...parteArtista.split(SEP_ARTISTAS)].some((p) => p.trim() && claves.has(normalizar(p)));
}


// ---------- el cerebro: candidatos de una lista y su puntaje (candidate_score) ----------
function candidatos(lista) {
  const porHuella = new Map();
  for (const [id, v] of Object.entries(DB.videos)) {
    if (v.b || !v.t) continue;
    const likes = v.l + v.casa.l, terminadas = v.c + v.casa.c;
    if (!(puntajeMusica(v.t) >= 2 || likes > 0 || terminadas > 0)) continue;
    if (!calzaLista(v.t, lista)) continue;
    const c = { id, v, p: puntaje(id, v) };
    const h = huella(v.t) || id;
    if (!porHuella.has(h) || porHuella.get(h).p < c.p) porHuella.set(h, c); // la misma canción en dos videos: la mejor
  }
  return [...porHuella.values()];
}
function puntaje(id, v) {
  const hora = new Date().getHours();
  const total = Math.max(1, Object.values(v.h).reduce((s, x) => s + x, 0));
  const cerca = (v.h[hora] || 0) + 0.5 * (v.h[(hora + 23) % 24] || 0) + 0.5 * (v.h[(hora + 1) % 24] || 0);
  const dias = v.u ? (Date.now() - v.u) / 864e5 : 90;
  const recientes = new Set(DB.decisiones.filter((d) => Date.now() - d.ts < 36 * 3600e3).slice(-30).map((d) => d.id));
  let p = 2.8 * Math.log1p(v.casa.v + v.n) + 30 * cerca / total + Math.max(0, 10 - dias / 9) + 2 * puntajeMusica(v.t)
    + 9 * (v.l + v.casa.l) + 4 * (v.c + v.casa.c) - 13 * (v.s + v.casa.s);
  if (recientes.has(id)) p -= 35;
  return p;
}
function porCerebro(cands) { // entre las 18 mejores, al azar con peso (choose del cerebro)
  const top = [...cands].sort((a, b) => b.p - a.p).slice(0, 18);
  const piso = top[top.length - 1].p;
  const pesos = top.map((c) => Math.max(0.2, c.p - piso + 1));
  let r = Math.random() * pesos.reduce((s, x) => s + x, 0);
  for (let i = 0; i < top.length; i++) if ((r -= pesos[i]) <= 0) return top[i];
  return top[0];
}

// VUELTAS (acer-listas 1.15): primero las nuevas que nunca sonaron, después las demás al azar, sin repetir en la vuelta
function elegir(lista, evitar = new Set(), soloEmbebibles = false) {
  const todas = candidatos(lista).filter((c) => (c.v.s + c.v.casa.s) < (c.v.l + c.v.casa.l) + 2 && !(soloEmbebibles && c.v.ne)); // las muy saltadas no vuelven
  if (!todas.length) return { cancion: null, vueltaNueva: false };
  const ronda = new Set(DB.rondas[lista.id] || []);
  const huellasRonda = new Set([...ronda].map((id) => DB.videos[id] && huella(DB.videos[id].t)).filter(Boolean));
  const ahora = DB.ultima && DB.ultima.id;
  const sirve = (c) => c.id !== ahora && !evitar.has(c.id);
  let libres = todas.filter((c) => sirve(c) && !ronda.has(c.id) && !huellasRonda.has(huella(c.v.t)));
  let vueltaNueva = false;
  if (!libres.length) {
    libres = todas.filter(sirve);
    if (!libres.length) return { cancion: null, vueltaNueva }; // en esta tanda ya están todas: no se borra la vuelta
    DB.rondas[lista.id] = [...ronda].filter((id) => evitar.has(id)); // otra vuelta; lo de esta tanda ya cuenta en ella
    vueltaNueva = true;
  }
  const nunca = libres.filter((c) => c.v.semilla && !c.v.n);
  const c = nunca.length ? porCerebro(nunca) : libres[Math.floor(Math.random() * libres.length)];
  return { cancion: c, vueltaNueva, quedan: libres.length - 1, total: todas.length };
}
function anotar(c, lista) {
  const v = c.v, h = new Date().getHours();
  v.n += 1; v.u = Date.now(); v.h[h] = (v.h[h] || 0) + 1;
  (DB.rondas[lista.id] = DB.rondas[lista.id] || []).push(c.id);
  DB.decisiones.push({ id: c.id, ts: Date.now(), lista: lista.id, fb: 0 });
}


function conMeGusta(lista) { // los 3 artistas con más me gusta en la lista
  const cuenta = new Map();
  for (const c of candidatos(lista)) {
    const likes = c.v.l + c.v.casa.l;
    if (likes <= 0) continue;
    const parte = artistaDe(c.v.t);
    const a = [parte, ...parte.split(SEP_ARTISTAS)].map((x) => TODOS_ARTISTAS.find((n) => normalizar(n) === normalizar(x))).find(Boolean);
    if (a) cuenta.set(a, (cuenta.get(a) || 0) + likes);
  }
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]);
}
// busca hasta POR_BUSQUEDA canciones nuevas para la lista; rota los artistas para no buscar siempre los mismos
async function semillas(lista, avisar) {
  const base = lista.todas ? [...new Set(LISTAS.flatMap((l) => l.busca))] : lista.busca;
  const nuevos = lista.todas ? [] : (lista.nuevos || []).map((x) => x.split("|")[0].trim());
  const ya = new Set(DB.buscados[lista.id] || []);
  let resto = [...nuevos, ...base.sort(() => Math.random() - 0.5)].filter((a, i, arr) => arr.indexOf(a) === i && !ya.has(a));
  if (resto.length < BUSQUEDAS_POR_VEZ) { DB.buscados[lista.id] = []; resto = [...resto, ...base.filter((a) => !resto.includes(a)).sort(() => Math.random() - 0.5)]; }
  const quien = [...conMeGusta(lista), ...resto].filter((a, i, arr) => arr.indexOf(a) === i).slice(0, BUSQUEDAS_POR_VEZ);
  DB.buscados[lista.id] = [...(DB.buscados[lista.id] || []), ...quien];
  const huellas = new Set(Object.values(DB.videos).map((v) => huella(v.t)).filter(Boolean));
  const claves = new Set(lista.todas ? TODOS_ARTISTAS.map(normalizar) : lista.nombres.map(normalizar));
  const resultados = await Promise.all(quien.map((a) => buscarYoutube((a + " " + (lista.pista || "")).trim()).catch(() => null)));
  const nuevas = [];
  let respondieron = 0;
  for (let i = 0; i < quien.length; i++) {
    if (resultados[i]) respondieron++;
    let tomados = 0;
    for (const r of resultados[i] || []) {
      if (tomados >= POR_ARTISTA || nuevas.length >= POR_BUSQUEDA) break;
      if (DB.videos[r.id]) continue;
      if (r.dur !== null && (r.dur < 90 || r.dur > 600)) continue;
      const parte = artistaDe(r.titulo);
      if (!parte || !esDe(parte, claves)) continue;
      if (puntajeMusica(r.titulo) < 2 || RECOPILACION.test(normalizar(r.titulo)) || !calzaLista(r.titulo, lista)) continue;
      const h = huella(r.titulo);
      if (h && huellas.has(h)) continue;
      huellas.add(h); tomados++;
      Object.assign(video(r.id, r.titulo), { semilla: lista.id, a: Date.now() });
      nuevas.push(r.titulo);
    }
  }
  DB.semillas[lista.id] = Date.now();
  guardar();
  if (avisar) {
    const msg = respondieron === 0 ? "YouTube no respondió (¿sin internet?)." :
      nuevas.length ? nuevas.length + " canciones nuevas en " + lista.name + ":\n" + nuevas.slice(0, 6).join("\n") : "No encontré canciones nuevas que calcen con " + lista.name + " esta vez.";
    await aviso("🌱 Semillas", msg);
  }
  return nuevas.length;
}
const tocaSemillas = (lista) => Date.now() - (DB.semillas[lista.id] || 0) > SEMILLAS_CADA_HORAS * 3600e3;
