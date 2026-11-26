// Reproductor de Taller: abre videos por su ruta (?video=…) y guarda listas de reproducción en una «ficha».
// Las listas viven en este navegador (localStorage) hasta que exista la cuenta común de Taller (cuenta.js).
(() => {
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const I = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${p}</svg>`;
const ICO = {
  mas: I('<path d="M12 5v14M5 12h14"/>'), x: I('<path d="M7 7l10 10M17 7 7 17"/>'),
  subir: I('<path d="m6 14 6-6 6 6"/>'), bajar: I('<path d="m6 10 6 6 6-6"/>'),
  sacar: I('<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>'),
  volver: I('<path d="m14.5 6-6 6 6 6"/>'), sig: I('<path d="M6 5v14l10-7zM18 5v14"/>'),
  enlace: I('<path d="M10 14l4-4M9 7l2-2a4 4 0 0 1 6 6l-2 2M15 17l-2 2a4 4 0 0 1-6-6l2-2"/>'),
  lapiz: I('<path d="M4 20h4L19 9l-4-4L4 16z"/>'), lista: I('<path d="M4 6h16M4 12h16M4 18h10"/>')
};

// ---------- Datos ----------
const CLAVE = 'reproductor.listas.v1', CLAVE_ULT = 'reproductor.ultima';
const leer = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
let datos = leer(CLAVE, null); if (!datos || !Array.isArray(datos.listas)) datos = { listas: [] };
const guardar = () => { escribir(CLAVE, datos); Cuenta.guardar(datos); $('#cntListas').textContent = datos.listas.length; };
const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const listaDe = id => datos.listas.find(l => l.id === id) || null;

// ---------- Rutas y pistas ----------
const segura = r => { try { const u = new URL(String(r).trim(), location.href); return /^https?:$/.test(u.protocol) ? u.href : null; } catch { return null; } };
const archivo = src => { try { return decodeURIComponent(new URL(src).pathname.split('/').pop() || ''); } catch { return ''; } };
const tituloDe = it => it.titulo || archivo(it.video).replace(/\.[^.]+$/, '') || 'Video';
const NOMBRES = { es: 'Español', spa: 'Español', lat: 'Español latino', en: 'Inglés', eng: 'Inglés', pt: 'Portugués', por: 'Portugués', fr: 'Francés', fre: 'Francés', fra: 'Francés', it: 'Italiano', ita: 'Italiano', de: 'Alemán', ger: 'Alemán', deu: 'Alemán', ja: 'Japonés', jpn: 'Japonés' };
const pista = (src, nombre, generico, i) => {
  const n = archivo(src).replace(/\.[^.]+$/, ''), lang = ((/[._-]([a-z]{2,3})$/i.exec(n) || [])[1] || '').toLowerCase();
  return { label: nombre && nombre !== '-' ? nombre : NOMBRES[lang] || n || generico + ' ' + (i + 2), lang, src };
};
// Lee video, título, inicio, audios y subtítulos de unos parámetros (de la dirección o de un formulario)
function itemDe(q) {
  const video = segura(q.get('video') || q.get('v') || ''); if (!video) return null;
  const par = (k, kn) => { const ns = q.getAll(kn); return q.getAll(k).map((r, i) => ({ src: segura(r), nombre: (ns[i] || '').trim() })).filter(x => x.src && x.src !== video); };
  const it = { id: nuevoId(), video, titulo: (q.get('titulo') || '').trim(), audio: par('audio', 'audionombre'), sub: par('sub', 'subtitulo') };
  const t = Math.max(0, parseInt(q.get('t'), 10) || 0); if (t) it.t = t;
  return it;
}
const esButaca = src => { try { const u = new URL(src); return /\/api\/stream\/[^/]+\//.test(u.pathname) && u.searchParams.get('f'); } catch { return false; } };
// Cualquier ruta firmada de Butaca (video, audio o subtítulos): no se comparte nunca
const firmada = src => { try { const u = new URL(src); return /\/api\/(stream|vtt)\//.test(u.pathname) && !!u.searchParams.get('f'); } catch { return false; } };
function pistasDe(it) {
  const audios = (it.audio || []).map((a, i) => pista(a.src, a.nombre, 'Audio', i));
  const subs = (it.sub || []).map((s, i) => pista(s.src, s.nombre, 'Subtítulos', i));
  const sumar = p => ({ ...p, audios: (p.audios && p.audios.length ? p.audios : [{ label: 'Original', src: null }]).concat(audios), subs: (p.subs || []).concat(subs) });
  if (esButaca(it.video)) {
    // Enlace de Butaca: sus audios, subtítulos y calidades se piden a su API con la misma firma
    const u = new URL(it.video), id = decodeURIComponent(/\/api\/stream\/([^/]+)\//.exec(u.pathname)[1]);
    return async () => {
      try { const r = await fetch(u.origin + '/api/pistas?id=' + encodeURIComponent(id) + '&f=' + encodeURIComponent(u.searchParams.get('f'))); if (r.ok) return sumar(await r.json()); } catch {}
      return audios.length || subs.length ? sumar({}) : null;
    };
  }
  return audios.length || subs.length ? async () => sumar({}) : null;
}

// ---------- Formato ----------
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const sello = ms => { const d = new Date(ms); return 'VISTO ' + d.getDate() + ' ' + MESES[d.getMonth()]; };
const dur = s => { if (!(s > 0)) return '–'; const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = Math.round(s % 60); return h ? h + ' h ' + String(m).padStart(2, '0') : m + ':' + String(x).padStart(2, '0'); };
const durTotal = items => { const con = items.filter(i => i.dur > 0), s = con.reduce((a, i) => a + i.dur, 0); if (!con.length) return ''; const h = Math.floor(s / 3600), m = Math.round(s % 3600 / 60); return (h ? h + ' h ' + m + ' min' : s < 60 ? Math.round(s) + ' s' : m + ' min') + (con.length < items.length ? ' (falta medir ' + (items.length - con.length) + ')' : ''); };
const videos = n => n + (n === 1 ? ' video' : ' videos');

// ---------- Aviso ----------
let avisoT = 0;
function aviso(texto, accion) {
  const a = $('#aviso'); a.innerHTML = esc(texto) + (accion ? ` <button type="button" class="enlace" style="color:var(--tinta);text-decoration:underline;margin-left:8px">${esc(accion.texto)}</button>` : '');
  if (accion) a.querySelector('button').onclick = () => { a.hidden = true; accion.fn(); };
  a.hidden = false; clearTimeout(avisoT); avisoT = setTimeout(() => { a.hidden = true; }, accion ? 6000 : 2600);
}

// ---------- Estado de la vista ----------
// modo: 'lista' (una ficha), 'fichero' (todas las listas), 'suelto' (un video sin lista), 'recibida' (lista compartida)
const vista = { modo: 'fichero', listaId: null, sonando: null, suelto: null, recibida: null, agregando: false, renombrando: false, confirmar: false, movida: null, recien: null };

// ---------- Reproducir ----------
function reproducir(it, lista) {
  const extras = (it.audio || []).length || (it.sub || []).length;
  $('#vacio').hidden = true; $('#escenario').classList.add('sonando');
  vista.sonando = it.id;
  const pos = lista ? lista.items.indexOf(it) : -1;
  Reproductor.abrir({
    titulo: tituloDe(it), sub: lista ? `${lista.nombre} · ${pos + 1} de ${lista.items.length}` : '',
    kind: /\.(jpe?g|png|webp|gif|avif)$/i.test(archivo(it.video)) ? 'image' : 'video',
    src: it.video, dl: it.video, cred: false, cors: esButaca(it.video) || extras ? undefined : false,
    pistas: pistasDe(it),
    alDuracion: d => { if (d > 0 && it.dur !== d) { it.dur = d; if (lista) guardar(); pintar(); } },
    alTerminar: () => terminado(it, lista),
    alCerrar: () => { vista.sonando = null; $('#escenario').classList.remove('sonando'); $('#vacio').hidden = false; history.replaceState(null, '', location.pathname); pintar(); }
  });
  if (it.t) { const v = document.querySelector('#rp video'); if (v) v.addEventListener('loadedmetadata', () => { if (it.t < v.duration) v.currentTime = it.t; }, { once: true }); }
  if (lista) { escribir(CLAVE_ULT, lista.id); history.replaceState(null, '', '?lista=' + encodeURIComponent(lista.id) + '&n=' + (pos + 1)); }
  pintar();
  if (matchMedia('(max-width:900px)').matches) $('#escenario').scrollIntoView({ block: 'start', behavior: 'smooth' });
}
const siguienteDe = (lista, desde) => { const i = lista.items.findIndex(x => x.id === desde); return lista.items.slice(i + 1).find(x => !x.visto) || lista.items.slice(i + 1)[0] || null; };
function terminado(it, lista) {
  if (!lista) return;
  it.visto = Date.now(); vista.recien = it.id; guardar(); pintar();
  const sig = siguienteDe(lista, it.id);
  if (sig) setTimeout(() => { if (vista.sonando === it.id) reproducir(sig, lista); }, 1400);
  else aviso('Terminaste la lista «' + lista.nombre + '».');
}

// ---------- Ficha ----------
const ficha = $('#ficha');
function pintar() {
  $('#cntListas').textContent = datos.listas.length;
  $('#btnFichero').setAttribute('aria-pressed', vista.modo === 'fichero');
  const antes = new Map([...ficha.querySelectorAll('.it[data-id]')].map(e => [e.dataset.id, e.getBoundingClientRect().top]));
  if (vista.modo === 'lista' && !listaDe(vista.listaId)) vista.modo = 'fichero';
  if (vista.modo === 'suelto' && !vista.suelto) vista.modo = datos.listas.length ? 'fichero' : 'fichero';
  ({ lista: pintarLista, fichero: pintarFichero, suelto: pintarSuelto, recibida: pintarRecibida })[vista.modo]();
  // Las filas que cambiaron de lugar se deslizan hasta su sitio nuevo (no desaparecen y reaparecen)
  if (!matchMedia('(prefers-reduced-motion:reduce)').matches) ficha.querySelectorAll('.it[data-id]').forEach(e => {
    const y0 = antes.get(e.dataset.id); if (y0 == null) return; const dy = y0 - e.getBoundingClientRect().top; if (!dy) return;
    e.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)' });
  });
  vista.recien = null;
}
const notaCuenta = () => `<p class="nota">${Cuenta.disponible ? 'Sincronizadas con tu cuenta de Taller.' : 'Guardadas en este navegador. Pronto se podrán sincronizar con tu cuenta de Taller.'}</p>`;

function pintarLista() {
  const l = listaDe(vista.listaId), its = l.items, max = Math.max(1, ...its.map(i => i.dur || 0));
  const sonandoAqui = its.some(i => i.id === vista.sonando);
  const sig = sonandoAqui ? siguienteDe(l, vista.sonando) : its.find(i => !i.visto) || its[0];
  const meta = [videos(its.length), durTotal(its), its.filter(i => i.visto).length ? its.filter(i => i.visto).length + (its.filter(i => i.visto).length === 1 ? ' visto' : ' vistos') : ''].filter(Boolean).join(' · ');
  ficha.innerHTML = `<div class="fh"><div class="fila-h">
      <button type="button" class="ico" data-a="fichero" title="Volver a mis listas" aria-label="Volver a mis listas">${ICO.volver}</button>
      ${vista.renombrando ? `<form class="ren" style="flex:1;display:flex;gap:6px"><input name="n" value="${esc(l.nombre)}" aria-label="Nombre de la lista" required maxlength="80" style="flex:1;min-width:0;height:36px;border-radius:5px;border:1px solid rgba(26,22,17,.45);background:var(--papel);color:var(--tinta);padding:0 10px;font-weight:700"><button class="bf lleno">Guardar</button></form>`
        : `<h2>${esc(l.nombre)}</h2><button type="button" class="ico" data-a="renombrar" title="Cambiar el nombre" aria-label="Cambiar el nombre">${ICO.lapiz}</button>`}
    </div><div class="meta">${esc(meta)}</div></div>
    ${its.length ? `<button type="button" class="sig${sig ? '' : ' fin'}" ${sig ? `data-a="sig"` : 'disabled'}><span class="l">${sonandoAqui ? 'A continuación' : 'Empezar por'}</span><b>${sig ? esc(tituloDe(sig)) : 'Fin de la lista'}</b>${sig ? ICO.sig : ''}</button>` : ''}
    ${its.length ? `<ol class="lst">${its.map((it, i) => `<li class="it${it.id === vista.sonando ? ' on' : ''}${it.id === vista.movida ? ' movida' : ''}" data-id="${it.id}" draggable="true" tabindex="0" aria-label="${esc(tituloDe(it))}${it.visto ? ', visto' : ''}${it.id === vista.sonando ? ', sonando' : ''}">
        <span class="n">${String(i + 1).padStart(2, '0')}</span>
        <span><span class="t">${esc(tituloDe(it))}</span><span class="d${it.dur > 0 ? '' : ' sin'}"><i style="width:${it.dur > 0 ? Math.max(3, it.dur / max * 100) : 100}%"></i></span></span>
        <span class="du">${dur(it.dur)}</span>
        <span class="ac"><button type="button" class="ico" data-a="subir" title="Subir" aria-label="Subir"${i ? '' : ' disabled'}>${ICO.subir}</button><button type="button" class="ico" data-a="bajar" title="Bajar" aria-label="Bajar"${i < its.length - 1 ? '' : ' disabled'}>${ICO.bajar}</button><button type="button" class="ico" data-a="sacar" title="Quitar de la lista" aria-label="Quitar de la lista">${ICO.sacar}</button></span>
        ${it.visto ? `<span class="sello${it.id === vista.recien ? ' recien' : ''}">${sello(it.visto)}</span>` : ''}
      </li>`).join('')}</ol>`
    : `<div class="vac"><b>La ficha está vacía</b>Agrega el primer video con su ruta.</div>`}
    ${vista.agregando ? formAgregar() : ''}
    <div class="pie">
      ${vista.agregando ? '' : `<button type="button" class="bf lleno" data-a="agregar">${ICO.mas}Agregar video</button>`}
      ${vista.avisoCompartir ? `<div class="conf"><span>Las películas de Butaca no van en el enlace (sus enlaces son personales). Se comparten solo los otros ${videos(its.filter(x => !esButaca(x.video)).length)}.</span><button type="button" class="bf" data-a="noCompartir">Cancelar</button>${its.some(x => !esButaca(x.video)) ? '<button type="button" class="bf lleno" data-a="compartir">Copiar sin ellas</button>' : ''}</div>`
        : its.length ? `<button type="button" class="bf" data-a="compartir">${ICO.enlace}Copiar enlace</button>` : ''}
      ${its.some(i => i.visto) ? `<button type="button" class="bf" data-a="limpiar">Quitar timbres</button>` : ''}
      ${vista.confirmar ? `<div class="conf"><span>¿Borrar la lista «${esc(l.nombre)}»? Los videos no se borran, solo la ficha.</span><button type="button" class="bf" data-a="no">Cancelar</button><button type="button" class="bf peligro" data-a="borrar">Borrar lista</button></div>`
        : `<button type="button" class="bf peligro" data-a="confirmar" style="margin-left:auto">Borrar lista</button>`}
      ${notaCuenta()}
    </div>`;
  if (vista.renombrando) { const f = ficha.querySelector('.ren'), inp = f.n; inp.focus(); inp.select();
    f.onsubmit = e => { e.preventDefault(); l.nombre = inp.value.trim() || l.nombre; vista.renombrando = false; guardar(); pintar(); };
    inp.onkeydown = e => { if (e.key === 'Escape') { vista.renombrando = false; pintar(); } }; }
  if (vista.agregando) prepararAgregar(l);
}
function formAgregar() {
  const sonando = vista.suelto && vista.sonando === vista.suelto.id;
  return `<form class="form-f" id="formAgregar">
    ${sonando ? `<button type="button" class="bf lleno" data-a="agregarSonando">${ICO.mas}Agregar el video que está sonando</button>` : ''}
    <label>Ruta o dirección del video<input name="video" type="text" inputmode="url" autocomplete="off" spellcheck="false" required placeholder="https://… o carpeta/video.mp4"></label>
    <label><span>Título <span style="font-weight:400">(opcional)</span></span><input name="titulo" type="text" autocomplete="off"></label>
    <fieldset class="extA"><legend>Otros audios</legend></fieldset><fieldset class="extS"><legend>Subtítulos .vtt</legend></fieldset>
    <div class="acciones"><button type="button" class="enlace" data-mas="audio">Agregar audio</button><button type="button" class="enlace" data-mas="sub">Agregar subtítulos</button></div>
    <div class="acciones"><span class="sp"></span><button type="button" class="bf" data-a="cancelarAgregar">Cancelar</button><button class="bf lleno">Agregar a la ficha</button></div>
  </form>`;
}
function prepararAgregar(l) {
  const f = $('#formAgregar'); prepararExtras(f, f.querySelector('.extA'), f.querySelector('.extS')); f.video.focus();
  f.onsubmit = e => {
    e.preventDefault(); const it = itemDe(new URLSearchParams(new FormData(f)));
    if (!it) { aviso('Esa ruta no sirve: tiene que empezar con http:// o https:// o ser una ruta de este sitio.'); f.video.focus(); return; }
    l.items.push(it); vista.agregando = false; vista.movida = it.id; guardar(); pintar(); aviso('Agregado a «' + l.nombre + '».');
  };
}
function pintarFichero() {
  const ls = datos.listas;
  ficha.innerHTML = `<div class="fh"><h2>Mis listas</h2><div class="meta">${ls.length ? ls.length + (ls.length === 1 ? ' lista' : ' listas') : 'Todavía no tienes listas'}</div></div>
    ${ls.length ? `<ol class="lst fichero">${ls.map(l => { const vist = l.items.filter(i => i.visto).length;
      return `<li class="it${l.items.some(i => i.id === vista.sonando) ? ' on' : ''}" data-lista="${l.id}" tabindex="0"><span><span class="t">${esc(l.nombre)}</span><small>${[videos(l.items.length), durTotal(l.items).replace(/ \(.*/, ''), vist ? vist + (vist === 1 ? ' visto' : ' vistos') : ''].filter(Boolean).join(' · ')}</small></span><span class="du">${ICO.volver.replace('m14.5 6-6 6 6 6', 'm9.5 6 6 6-6 6')}</span></li>`; }).join('')}</ol>`
    : `<div class="vac"><b>Arma tu primera lista</b>Una lista es una ficha con videos en orden: una saga, un curso, unos capítulos. Se reproduce de corrido y cada video visto recibe su timbre.</div>`}
    <form class="pie" id="formNueva"><label class="oculto" for="nombreNueva">Nombre de la lista nueva</label>
      <input id="nombreNueva" name="n" required maxlength="80" placeholder="Nombre de la lista nueva" style="flex:1;min-width:0;height:36px;border-radius:5px;border:1px solid rgba(26,22,17,.45);background:var(--papel);color:var(--tinta);padding:0 10px;caret-color:var(--tinta)">
      <button class="bf lleno">${ICO.mas}Crear lista</button>${notaCuenta()}</form>`;
  $('#formNueva').onsubmit = e => {
    e.preventDefault(); const l = { id: nuevoId(), nombre: e.target.n.value.trim() || 'Lista', creada: Date.now(), items: [] };
    if (vista.suelto && vista.sonando === vista.suelto.id) { l.items.push(vista.suelto); vista.suelto = null; }
    datos.listas.push(l); guardar(); vista.modo = 'lista'; vista.listaId = l.id; vista.agregando = !l.items.length; escribir(CLAVE_ULT, l.id); pintar();
  };
}
function pintarSuelto() {
  const it = vista.suelto, ls = datos.listas;
  ficha.innerHTML = `<div class="fh"><h2>${esc(tituloDe(it))}</h2><div class="meta">${it.dur > 0 ? dur(it.dur) + ' · ' : ''}No está en ninguna lista</div></div>
    <div class="vac" style="padding-bottom:8px">Guárdalo en una lista para verlo después en orden con otros videos.</div>
    ${ls.length ? `<ol class="lst fichero">${ls.map(l => `<li class="it" data-meter="${l.id}" tabindex="0"><span><span class="t">${esc(l.nombre)}</span><small>${videos(l.items.length)}</small></span><span class="du">${ICO.mas}</span></li>`).join('')}</ol>` : ''}
    <form class="pie" id="formNueva"><label class="oculto" for="nombreNueva">Nombre de la lista nueva</label>
      <input id="nombreNueva" name="n" required maxlength="80" placeholder="Nombre de una lista nueva" style="flex:1;min-width:0;height:36px;border-radius:5px;border:1px solid rgba(26,22,17,.45);background:var(--papel);color:var(--tinta);padding:0 10px;caret-color:var(--tinta)">
      <button class="bf lleno">${ICO.mas}Crear con este video</button>${notaCuenta()}</form>`;
  $('#formNueva').onsubmit = e => {
    e.preventDefault(); const l = { id: nuevoId(), nombre: e.target.n.value.trim() || 'Lista', creada: Date.now(), items: [it] };
    datos.listas.push(l); vista.suelto = null; guardar(); vista.modo = 'lista'; vista.listaId = l.id; escribir(CLAVE_ULT, l.id); pintar(); aviso('Lista «' + l.nombre + '» creada.');
  };
}
function pintarRecibida() {
  const r = vista.recibida;
  ficha.innerHTML = `<div class="fh"><h2>${esc(r.nombre)}</h2><div class="meta">Lista compartida · ${videos(r.items.length)}</div></div>
    <ol class="lst">${r.items.map((it, i) => `<li class="it" data-rec="${i}" tabindex="0"><span class="n">${String(i + 1).padStart(2, '0')}</span><span><span class="t">${esc(tituloDe(it))}</span></span><span></span><span></span></li>`).join('')}</ol>
    <div class="pie"><button type="button" class="bf lleno" data-a="guardarRecibida">${ICO.mas}Guardar en mis listas</button><button type="button" class="bf" data-a="fichero">No, gracias</button>${notaCuenta()}</div>`;
}

// ---------- Acciones de la ficha ----------
let arrastrado = null;
function mover(l, de, a) { if (a < 0 || a >= l.items.length || de === a) return; const [x] = l.items.splice(de, 1); l.items.splice(a, 0, x); vista.movida = x.id; guardar(); pintar(); }
ficha.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'), li = e.target.closest('.it');
  const l = listaDe(vista.listaId);
  if (b) {
    e.stopPropagation(); const a = b.dataset.a, i = li && l ? l.items.findIndex(x => x.id === li.dataset.id) : -1;
    if (a === 'fichero') { vista.modo = 'fichero'; vista.confirmar = vista.agregando = vista.renombrando = vista.avisoCompartir = false; if (vista.recibida) { vista.recibida = null; history.replaceState(null, '', location.pathname); } }
    else if (a === 'renombrar') vista.renombrando = true;
    else if (a === 'sig') { const s = l.items.some(x => x.id === vista.sonando) ? siguienteDe(l, vista.sonando) : l.items.find(x => !x.visto) || l.items[0]; if (s) return reproducir(s, l); }
    else if (a === 'subir') return mover(l, i, i - 1);
    else if (a === 'bajar') return mover(l, i, i + 1);
    else if (a === 'sacar') { const [x] = l.items.splice(i, 1); guardar(); pintar(); return aviso('Quitaste «' + tituloDe(x) + '».', { texto: 'Deshacer', fn: () => { l.items.splice(i, 0, x); vista.movida = x.id; guardar(); pintar(); } }); }
    else if (a === 'agregar') vista.agregando = true;
    else if (a === 'cancelarAgregar') vista.agregando = false;
    else if (a === 'agregarSonando') { l.items.push(vista.suelto); vista.movida = vista.suelto.id; vista.suelto = null; vista.agregando = false; guardar(); }
    else if (a === 'compartir') { if (l.items.some(x => esButaca(x.video)) && !vista.avisoCompartir) { vista.avisoCompartir = true; return pintar(); } vista.avisoCompartir = false; return compartir(l); }
    else if (a === 'noCompartir') vista.avisoCompartir = false;
    else if (a === 'limpiar') { l.items.forEach(x => { delete x.visto; }); guardar(); }
    else if (a === 'confirmar') vista.confirmar = true;
    else if (a === 'no') vista.confirmar = false;
    else if (a === 'borrar') { datos.listas = datos.listas.filter(x => x !== l); vista.confirmar = false; vista.modo = 'fichero'; guardar(); aviso('Borraste la lista «' + l.nombre + '».'); }
    else if (a === 'guardarRecibida') { const r = vista.recibida, n = { id: nuevoId(), nombre: r.nombre, creada: Date.now(), items: r.items.map(x => ({ ...x, id: nuevoId() })) }; datos.listas.push(n); guardar(); vista.recibida = null; vista.modo = 'lista'; vista.listaId = n.id; history.replaceState(null, '', location.pathname); aviso('Guardaste «' + n.nombre + '».'); }
    return pintar();
  }
  if (!li) return;
  if (li.dataset.lista) { vista.modo = 'lista'; vista.listaId = li.dataset.lista; vista.agregando = vista.confirmar = false; escribir(CLAVE_ULT, li.dataset.lista); return pintar(); }
  if (li.dataset.meter) { const d = listaDe(li.dataset.meter); d.items.push(vista.suelto); vista.movida = vista.suelto.id; vista.suelto = null; vista.modo = 'lista'; vista.listaId = d.id; guardar(); pintar(); return aviso('Agregado a «' + d.nombre + '».'); }
  if (li.dataset.rec) return reproducir(vista.recibida.items[+li.dataset.rec], null);
  if (l && li.dataset.id) { const it = l.items.find(x => x.id === li.dataset.id); if (it) reproducir(it, l); }
});
ficha.addEventListener('keydown', e => { const li = e.target.closest('.it'); if (li && e.target === li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); li.click(); } });
// La fila que se movió queda marcada hasta que la miras
ficha.addEventListener('pointerover', e => { const li = e.target.closest('.it.movida'); if (li) { li.classList.remove('movida'); vista.movida = null; } });
// Arrastrar para ordenar (mouse); en el teléfono, los botones subir y bajar
ficha.addEventListener('dragstart', e => { const li = e.target.closest('.it[data-id]'); if (!li) return; arrastrado = li.dataset.id; li.classList.add('arrastrando'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', arrastrado); });
ficha.addEventListener('dragover', e => { const li = e.target.closest('.it[data-id]'); if (!li || !arrastrado) return; e.preventDefault(); ficha.querySelectorAll('.destino').forEach(x => x.classList.remove('destino')); li.classList.add('destino'); });
ficha.addEventListener('dragend', () => { arrastrado = null; ficha.querySelectorAll('.arrastrando,.destino').forEach(x => x.classList.remove('arrastrando', 'destino')); });
ficha.addEventListener('drop', e => { const li = e.target.closest('.it[data-id]'), l = listaDe(vista.listaId); if (!li || !arrastrado || !l) return; e.preventDefault();
  const de = l.items.findIndex(x => x.id === arrastrado), a = l.items.findIndex(x => x.id === li.dataset.id); arrastrado = null; mover(l, de, a); });

// ---------- Compartir una lista por enlace ----------
const b64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deB64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));
async function compartir(l) {
  // Las películas de Butaca nunca van en el enlace: su ruta lleva una firma que deja verlas sin iniciar sesión
  const datosL = { n: l.nombre, i: l.items.filter(x => !firmada(x.video)).map(x => [x.video, x.titulo || '', (x.audio || []).filter(a => !firmada(a.src)).map(a => [a.src, a.nombre || '']), (x.sub || []).filter(s => !firmada(s.src)).map(s => [s.src, s.nombre || ''])]) };
  const url = location.origin + location.pathname + '?l=' + b64(JSON.stringify(datosL));
  try { await navigator.clipboard.writeText(url); aviso('Enlace copiado: quien lo abra ve esta lista y puede guardarla.'); }
  catch { prompt('Copia este enlace:', url); }
}
function leerRecibida(s) {
  try { const d = JSON.parse(deB64(s)); return { nombre: String(d.n || 'Lista compartida').slice(0, 80), items: (d.i || []).filter(([video]) => !firmada(segura(video) || '')).map(([video, titulo, au, su]) => ({ id: nuevoId(), video: segura(video), titulo: String(titulo || ''), audio: (au || []).map(([src, nombre]) => ({ src: segura(src), nombre })).filter(x => x.src && !firmada(x.src)), sub: (su || []).map(([src, nombre]) => ({ src: segura(src), nombre })).filter(x => x.src && !firmada(x.src)) })).filter(x => x.video) }; }
  catch { return null; }
}

// ---------- Medir duraciones que faltan (una a la vez, sin descargar el video) ----------
const fallidas = new Set(); let midiendo = false;
function medir() {
  if (midiendo) return; const l = listaDe(vista.listaId); if (!l) return;
  const it = l.items.find(x => !(x.dur > 0) && !fallidas.has(x.id)); if (!it) return;
  midiendo = true; const m = document.createElement('video'); m.preload = 'metadata'; m.muted = true;
  const fin = ok => { clearTimeout(t); if (ok && isFinite(m.duration) && m.duration > 0) { it.dur = Math.round(m.duration); guardar(); if (vista.modo === 'lista') pintar(); } else fallidas.add(it.id); m.removeAttribute('src'); m.load(); midiendo = false; setTimeout(medir, 300); };
  const t = setTimeout(() => fin(false), 20000);
  m.onloadedmetadata = () => fin(true); m.onerror = () => fin(false); m.src = it.video;
}
setInterval(medir, 4000);

// ---------- Formularios: filas de audio y subtítulos extra ----------
function prepararExtras(form, cajaA, cajaS) {
  const fila = (caja, ruta, nombre) => {
    const d = document.createElement('div'); d.className = 'fila';
    d.innerHTML = `<input type="text" name="${ruta}" inputmode="url" placeholder="Ruta del archivo" autocomplete="off" spellcheck="false" aria-label="Ruta"><input type="text" name="${nombre}" placeholder="Nombre" autocomplete="off" aria-label="Nombre"><button type="button" class="quitar" aria-label="Quitar">${ICO.x}</button>`;
    d.querySelector('.quitar').onclick = () => d.remove(); caja.append(d); d.querySelector('input').focus();
  };
  form.querySelectorAll('[data-mas]').forEach(b => { b.innerHTML = ICO.mas + esc(b.textContent); b.onclick = () => b.dataset.mas === 'audio' ? fila(cajaA, 'audio', 'audionombre') : fila(cajaS, 'sub', 'subtitulo'); });
  // Filas vacías no viajan; el nombre vacío se manda como «-» para que los nombres no se corran de fila
  form.addEventListener('submit', () => form.querySelectorAll('.fila').forEach(d => { const [r, n] = d.querySelectorAll('input'); if (!r.value.trim()) d.remove(); else if (!n.value.trim()) n.value = '-'; }), true);
}
prepararExtras($('#formLargo'), $('#extAudio'), $('#extSub'));
$('#btnFichero').onclick = () => { vista.modo = vista.modo === 'fichero' && vista.listaId && listaDe(vista.listaId) ? 'lista' : 'fichero'; vista.agregando = vista.confirmar = false; pintar(); if (matchMedia('(max-width:900px)').matches) ficha.scrollIntoView({ behavior: 'smooth' }); };
Cuenta.alCambiar(d => { if (d && Array.isArray(d.listas)) { datos = d; escribir(CLAVE, datos); pintar(); } });

// ---------- Arranque: lo que diga la dirección ----------
const q = new URLSearchParams(location.search);
const ult = leer(CLAVE_ULT, null);
if (q.get('l')) { const r = leerRecibida(q.get('l')); if (r && r.items.length) { vista.recibida = r; vista.modo = 'recibida'; } else aviso('El enlace de la lista está incompleto.'); }
if (q.get('video') || q.get('v')) {
  const it = itemDe(q);
  if (it) { vista.suelto = it; vista.modo = 'suelto'; $('#rutaRapida').value = q.get('video') || q.get('v'); reproducir(it, null); }
  else { aviso('La ruta del video no es válida: tiene que empezar con http:// o https://.'); }
} else if (q.get('lista') && listaDe(q.get('lista'))) {
  const l = listaDe(q.get('lista')); vista.modo = 'lista'; vista.listaId = l.id;
  const n = Math.max(1, parseInt(q.get('n'), 10) || 1) - 1; if (l.items[n]) reproducir(l.items[n], l);
} else if (vista.modo !== 'recibida' && ult && listaDe(ult)) { vista.modo = 'lista'; vista.listaId = ult; }
pintar();
})();
