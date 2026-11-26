// Reproductor de Taller (reproductor.taller.ink): controles propios, calidad, audio y subtítulos, zoom y encuadre.
// Uso: Reproductor.abrir({ titulo, sub, kind: 'video'|'image', src, dl, cred, inicio, pistas, alTerminar, alCerrar, alDuracion })
//   pistas: async () => ({ calidades: [{alto, label, src}], audios: [{label, src|null}], subs: [{label, src}] })
// Se monta dentro de #escenario si existe. Audio: la pista 1 suena desde el video; las otras desde un <audio>
// sincronizado. Subtítulos: se dibujan aquí, sobre los controles.
(() => {
const I = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const IC = {
  x: I('<path d="M7 7l10 10M17 7 7 17"/>'),
  play: I('<path class="f" d="M7 4.5v15l12.5-7.5z"/>'), pause: I('<path class="f" d="M6 4.5h4.2v15H6zM13.8 4.5H18v15h-4.2z"/>'),
  back: I('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 3.5v4.8h4.8"/><path d="M10 10v5M13 10h2.4v5H13z"/>'),
  fwd: I('<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 3.5v4.8h-4.8"/><path d="M9 10v5M12 10h2.4v5H12z"/>'),
  cast: I('<path d="M3 8V5h18v14h-6"/><path d="M3 19h.01M3 15.5a3.5 3.5 0 0 1 3.5 3.5M3 12a7 7 0 0 1 7 7"/>'),
  pip: I('<path d="M3 5h18v14H3z"/><path class="f" d="M12 11.5h7V17h-7z"/>'),
  code: I('<path d="M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5"/>'),
  vol: I('<path class="f" d="M3.5 9h4L12 5v14l-4.5-4h-4z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10"/>'),
  mute: I('<path class="f" d="M3.5 9h4L12 5v14l-4.5-4h-4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>'),
  cc: I('<path d="M3 5.5h18v13H3z"/><path d="M10.5 10h-3v4h3M16.5 10h-3v4h3"/>'),
  gear: I('<path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1"/><path d="M13 5v4M7 10v4M15 15v4"/>'),
  full: I('<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>'), nofull: I('<path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/>'),
  dl: I('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'), chev: I('<path d="m9.5 6 6 6-6 6"/>'), left: I('<path d="m14.5 6-6 6 6 6"/>'), check: I('<path d="m5 12.5 4.5 4.5L19 7.5"/>')
};
const css = `
#rp{--tinta:#0d0b08;--papel:#f3ead2;--manila:#d8c48e;--borde:#4a4032;--menu:#241e16;position:fixed;inset:0;z-index:80;display:none;flex-direction:column;background:var(--tinta);color:var(--papel);font:14px/1.4 Archivo,system-ui,"Segoe UI",sans-serif;user-select:none;overflow:hidden}
#escenario #rp{position:absolute;z-index:3;border-radius:inherit}
#rp.on{display:flex}
#rp svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:square;stroke-linejoin:miter}#rp svg .f{fill:currentColor;stroke:none}
#rp button{all:unset;cursor:pointer;display:grid;place-items:center;border-radius:6px;color:var(--papel)}
#rp button:focus-visible{outline:2px solid var(--manila);outline-offset:2px}
#rp .rp-top{position:absolute;left:0;right:0;top:0;z-index:2;display:flex;align-items:flex-start;gap:16px;padding:18px 18px 18px 24px;background:rgba(13,11,8,.72);transition:opacity .25s}
#rp:not(.ui) .rp-top{opacity:0;pointer-events:none}
#rp .rp-tt{flex:1;min-width:0}#rp .rp-tt h2{margin:0;font-size:1.25rem;font-weight:700;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#rp .rp-tt small{color:#cbbf9f;font-size:.82rem}
#rp .rp-x{flex:none;width:42px;height:42px;border-radius:50%;background:rgba(243,234,210,.12);border:1px solid rgba(243,234,210,.28)}#rp .rp-x:hover{background:rgba(243,234,210,.22)}
#rp .rp-stage{position:relative;flex:1;min-height:0;overflow:hidden;background:var(--tinta);touch-action:none}
#rp .rp-media{position:absolute;inset:0;transform-origin:0 0}#rp.zoom .rp-media{will-change:transform}
#rp video,#rp .rp-img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:transparent;outline:none}
#rp .rp-subs{position:absolute;left:5%;right:5%;bottom:7%;text-align:center;pointer-events:none;transition:bottom .2s}
#rp .rp-subs span{display:inline;padding:.12em .45em;background:rgba(13,11,8,.7);border-radius:3px;font-size:clamp(16px,2.4vw,32px);line-height:1.5;font-weight:500;white-space:pre-line;box-decoration-break:clone;-webkit-box-decoration-break:clone}
#rp.ui .rp-subs{bottom:max(7%,100px)}
#rp .rp-ui{position:absolute;left:0;right:0;bottom:0;padding:14px 18px 12px;background:rgba(13,11,8,.78);transition:opacity .25s}
#rp:not(.ui) .rp-ui,#rp:not(.ui) .rp-menu{opacity:0;pointer-events:none}#rp:not(.ui).rp-play .rp-stage{cursor:none}
#rp .rp-bar{position:relative;height:18px;display:flex;align-items:center;cursor:pointer;margin:0 4px 6px}
#rp .rp-track{position:relative;width:100%;height:4px;border-radius:1px;background:rgba(243,234,210,.2);transition:height .12s}
#rp .rp-bar:hover .rp-track{height:7px}
#rp .rp-buf,#rp .rp-pos{position:absolute;left:0;top:0;bottom:0;border-radius:1px}#rp .rp-buf{background:rgba(243,234,210,.3)}#rp .rp-pos{background:var(--manila)}
#rp .rp-knob{position:absolute;top:50%;width:4px;height:16px;margin:-8px 0 0 -2px;border-radius:1px;background:var(--papel);transform:scaleY(0);transition:transform .12s}
#rp .rp-bar:hover .rp-knob{transform:scaleY(1)}
#rp .rp-tip{position:absolute;bottom:22px;padding:3px 7px;border-radius:3px;background:var(--menu);border:1px solid var(--borde);font:13px "Courier Prime",monospace;transform:translateX(-50%);display:none;white-space:nowrap}
#rp .rp-bar:hover .rp-tip{display:block}
#rp .rp-row{display:flex;align-items:center;gap:4px}
#rp .rp-row button{width:40px;height:40px}#rp .rp-row button:hover{background:rgba(243,234,210,.1)}
#rp .rp-row .rp-pp{width:44px;height:44px;border-radius:50%;background:var(--papel);color:var(--tinta)}#rp .rp-row .rp-pp:hover{background:#fff}
#rp .rp-vol{display:flex;align-items:center}#rp .rp-vol input{width:0;opacity:0;transition:width .2s,opacity .2s;accent-color:var(--manila)}
#rp .rp-vol:hover input,#rp .rp-vol input:focus{width:84px;opacity:1;margin:0 8px 0 2px}
#rp .rp-time{font:14px "Courier Prime",monospace;font-variant-numeric:tabular-nums;color:#e4d9bb;margin-left:10px;white-space:nowrap}
#rp .rp-sp{flex:1}
#rp .rp-set{position:relative}#rp .rp-q{position:absolute;top:2px;right:-2px;padding:0 3px;border-radius:2px;background:var(--manila);color:var(--tinta);font:700 .56rem "Courier Prime",monospace;line-height:1.4;pointer-events:none}
#rp .rp-cc.on{color:var(--manila)}
#rp .rp-menu{position:absolute;right:18px;bottom:84px;min-width:250px;max-height:calc(100% - 110px);overflow:auto;padding:6px;border-radius:6px;background:var(--menu);border:1px solid var(--borde);box-shadow:0 10px 30px rgba(0,0,0,.5);display:none}
#rp .rp-menu.on{display:block}
#rp .rp-menu button{display:flex;width:100%;box-sizing:border-box;align-items:center;gap:10px;padding:9px 10px;border-radius:4px;font-size:.9rem}
#rp .rp-menu button:hover{background:rgba(216,196,142,.12)}
#rp .rp-menu button .v{margin-left:auto;color:#cbbf9f;font-size:.84rem}#rp .rp-menu svg{width:16px;height:16px}
#rp .rp-menu .h{font-weight:700;border-bottom:1px solid var(--borde);border-radius:4px 4px 0 0;margin-bottom:4px}
#rp .rp-menu .ck{width:16px;display:inline-grid;color:var(--manila)}
#rp .cod{display:inline-block;min-width:1.9em;padding:0 3px;border:1px solid currentColor;border-radius:2px;font:700 .68rem/1.5 "Courier Prime",monospace;text-align:center;opacity:.85}
#rp .rp-big{position:absolute;left:50%;top:50%;width:76px;height:76px;margin:-38px 0 0 -38px;border-radius:50%;background:rgba(13,11,8,.7);display:grid;place-items:center;opacity:0;transform:scale(.8);transition:.25s;pointer-events:none}
#rp .rp-big.on{opacity:1;transform:scale(1)}#rp .rp-big svg{width:34px;height:34px}
#rp .rp-spin{position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid rgba(243,234,210,.2);border-top-color:var(--manila);animation:rpgira .8s linear infinite;display:none;pointer-events:none}
#rp.cargando .rp-spin{display:block}@keyframes rpgira{to{transform:rotate(360deg)}}
#rp .rp-err{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);max-width:min(440px,90%);padding:16px 18px;border-radius:6px;background:var(--menu);border:1px solid var(--borde);text-align:center;display:none}#rp .rp-err a{color:var(--manila)}
#rp .rp-aviso{position:absolute;left:50%;top:84px;transform:translateX(-50%);padding:7px 14px;border-radius:4px;background:var(--menu);border:1px solid var(--borde);font-size:.88rem;opacity:0;transition:opacity .3s;pointer-events:none}#rp .rp-aviso.on{opacity:1}
#rp .rp-ctx{position:absolute;z-index:5;min-width:250px;padding:6px;border-radius:6px;background:var(--menu);border:1px solid var(--borde);box-shadow:0 10px 30px rgba(0,0,0,.5);display:none}
#rp .rp-ctx.on{display:block}
#rp .rp-ctx button{display:flex;width:100%;box-sizing:border-box;align-items:center;gap:11px;padding:9px 10px;border-radius:4px;font-size:.9rem}
#rp .rp-ctx button:hover{background:rgba(216,196,142,.12)}#rp .rp-ctx svg{width:18px;height:18px}
#rp .rp-ctx hr{border:0;border-top:1px solid var(--borde);margin:5px 4px}
#rp .rp-ctx .t{padding:6px 10px 2px;font:700 .74rem "Courier Prime",monospace;color:#cbbf9f;text-transform:uppercase;letter-spacing:.06em}
#rp .rp-ctx button.on{color:var(--manila)}#rp .rp-ctx .fl{width:2.2em;text-align:center}
#rp .rp-emb{position:absolute;inset:0;z-index:6;display:none;place-items:center;background:rgba(13,11,8,.7)}
#rp .rp-emb.on{display:grid}
#rp .rp-emb>div{width:min(560px,92%);padding:20px;border-radius:6px;background:var(--menu);border:1px solid var(--borde);display:flex;flex-direction:column;gap:12px}
#rp .rp-emb h3{margin:0;font-size:1rem}#rp .rp-emb p{margin:0;color:#cbbf9f;font-size:.86rem;user-select:text}
#rp .rp-emb textarea{width:100%;box-sizing:border-box;height:96px;resize:none;padding:10px;border-radius:4px;border:1px solid var(--borde);background:var(--tinta);color:var(--papel);font:12px/1.5 "Courier Prime",monospace;user-select:text}
#rp .rp-emb .a{display:flex;justify-content:flex-end;gap:8px}#rp .rp-emb .a button{padding:8px 16px;border-radius:4px;font-weight:700;font-size:.88rem;background:var(--manila);color:var(--tinta)}#rp .rp-emb .a button.s{background:transparent;color:var(--papel);border:1px solid var(--borde)}
#rp.emb .rp-x{display:none}
@media(max-width:600px){#rp .rp-top{padding:12px 12px 12px 16px}#rp .rp-tt h2{font-size:1.05rem}#rp .rp-ui{padding:10px 8px 6px}#rp .rp-row button{width:36px;height:36px}#rp .rp-row .rp-pp{width:40px;height:40px}#rp .rp-hide-m{display:none!important}#rp .rp-menu{right:8px;left:8px;min-width:0;bottom:74px}#rp .rp-aviso{top:70px}}
@media(prefers-reduced-motion:reduce){#rp *{transition:none!important;animation-duration:0s!important}}`;
const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

const el = document.createElement('div'); el.id = 'rp'; el.tabIndex = -1;
el.innerHTML = `<div class="rp-stage"><div class="rp-top"><div class="rp-tt"><h2></h2><small></small></div><button class="rp-x" type="button" aria-label="Cerrar" title="Cerrar (Esc)">${IC.x}</button></div>
<div class="rp-media"></div><div class="rp-subs"></div><div class="rp-big"></div><div class="rp-spin"></div><div class="rp-err"></div><div class="rp-aviso"></div>
<div class="rp-ui"><div class="rp-bar"><div class="rp-track"><div class="rp-buf"></div><div class="rp-pos"></div><div class="rp-knob"></div></div><div class="rp-tip"></div></div>
<div class="rp-row"><button class="rp-pp" type="button" title="Reproducir (espacio)">${IC.play}</button><button class="rp-b10 rp-hide-m" type="button" title="Atrás 10 s (←)">${IC.back}</button><button class="rp-f10 rp-hide-m" type="button" title="Adelante 10 s (→)">${IC.fwd}</button>
<span class="rp-vol"><button class="rp-mute" type="button" title="Silenciar (M)">${IC.vol}</button><input type="range" min="0" max="1" step="0.02" aria-label="Volumen"></span>
<span class="rp-time">0:00 / 0:00</span><span class="rp-sp"></span>
<button class="rp-cc" type="button" title="Subtítulos (C)">${IC.cc}</button><button class="rp-cast" type="button" title="Transmitir a un dispositivo">${IC.cast}</button><button class="rp-set" type="button" title="Ajustes: calidad, audio, subtítulos, encuadre y velocidad"><span class="rp-q"></span>${IC.gear}</button>
<button class="rp-pipb rp-hide-m" type="button" title="Pantalla en pantalla (P)">${IC.pip}</button><button class="rp-fs" type="button" title="Pantalla completa (F)">${IC.full}</button></div></div>
<div class="rp-menu"></div><div class="rp-ctx"></div><div class="rp-emb"></div></div>`;
(document.getElementById('escenario') || document.body).appendChild(el);
const $ = s => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mmss = t => { if (!isFinite(t)) t = 0; t = Math.floor(t); const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60; return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); };
const hms = t => { if (!isFinite(t)) t = 0; t = Math.floor(t); const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };
const pref = { get(k, d) { try { const v = localStorage.getItem('rp-' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('rp-' + k, JSON.stringify(v)); } catch {} } };

// Bandera de un idioma, por su nombre («Español latino») o código («spa»)
const FLAGS = [[/latin|lat\b|mex|es-?419|es-?mx|castellano|españa|es-?es/i, 'ES'], [/^(es|spa)$|espa[ñn]ol|spanish/i, 'ES'], [/brasil|pt-?br/i, 'BR'], [/^(pt|por)$|portugu/i, 'PT'],
  [/brit|uk\b|en-?gb/i, 'GB'], [/^(en|eng)$|ingl[eéè]s|english/i, 'US'], [/^(fr|fra|fre)$|franc[eé]s|french/i, 'FR'], [/^(it|ita)$|italian/i, 'IT'], [/^(de|deu|ger)$|alem[aá]n|german/i, 'DE'],
  [/^(ja|jpn)$|japon[eé]s|japanese/i, 'JP'], [/^(ko|kor)$|coreano|korean/i, 'KR'], [/^(zh|chi|zho)$|chino|chinese|mandar/i, 'CN'], [/^(ru|rus)$|ruso|russian/i, 'RU'], [/^(hi|hin)$|hindi/i, 'IN'],
  [/^(ca|cat)$|catal/i, 'ES'], [/^(nl|dut|nld)$|holand|dutch/i, 'NL'], [/^(sv|swe)$|sueco|swedish/i, 'SE'], [/^(pl|pol)$|polaco|polish/i, 'PL'], [/^(tr|tur)$|turco|turkish/i, 'TR'], [/^(ar|ara)$|[aá]rabe|arabic/i, 'SA']];
function bandera(l) {
  const x = String(l || '').trim(); if (!x) return '';
  const hit = FLAGS.find(([re]) => re.test(x)); return hit ? hit[1] : '';
}
// x: texto, o pista { label, lang }. Devuelve un código de país (ES, US…) o ''.
const banderaDe = x => typeof x === 'string' ? bandera(x) : bandera(x.lang || x.c) || bandera(x.label || x.l);
const conBandera = x => typeof x === 'string' ? x : (x.label || x.l);
const codigo = x => { const b = banderaDe(x); return b ? `<span class="cod">${b === 'US' || b === 'GB' ? 'EN' : b === 'BR' ? 'PT' : b}</span>` : ''; };
let v = null, st0 = null, cleanup = [];
function cerrar() {
  cleanup.forEach(f => { try { f(); } catch {} }); cleanup = [];
  if (document.fullscreenElement === el) document.exitFullscreen().catch(() => {});
  el.querySelectorAll('video,audio').forEach(m => { m.pause(); m.removeAttribute('src'); m.load(); });
  $('.rp-media').innerHTML = ''; $('.rp-subs').innerHTML = ''; $('.rp-menu').classList.remove('on'); $('.rp-err').style.display = 'none';
  el.classList.remove('on', 'cargando', 'rp-play'); if (el.parentNode === document.body) document.body.style.overflow = ''; v = null; st0 = null; zoomA(1, 0, 0);
}
let alCerrar0 = null;
$('.rp-x').onclick = () => { const f = alCerrar0; cerrar(); if (f) f(); };

// --- Mostrar/ocultar controles ---
let idle = 0;
function despertar() { el.classList.add('ui'); clearTimeout(idle); idle = setTimeout(() => { if (v && !v.paused && !$('.rp-menu').classList.contains('on')) el.classList.remove('ui'); }, 2600); }
el.addEventListener('mousemove', despertar); el.addEventListener('touchstart', despertar, { passive: true });
function aviso(t) { const a = $('.rp-aviso'); a.textContent = t; a.classList.add('on'); clearTimeout(a._t); a._t = setTimeout(() => a.classList.remove('on'), 1600); }
function big(icon) { const b = $('.rp-big'); b.innerHTML = icon; b.classList.add('on'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('on'), 450); }

// --- Controles ---
const toggle = () => { if (!v) return; if (v.paused) v.play().catch(() => {}); else v.pause(); };
$('.rp-pp').onclick = toggle;
$('.rp-b10').onclick = () => salto(-10); $('.rp-f10').onclick = () => salto(10);
function salto(s) { if (!v) return; v.currentTime = Math.max(0, Math.min((v.duration || 0) - 0.5, v.currentTime + s)); aviso((s > 0 ? '+' : '') + s + ' s'); }
let tapT = 0;
$('.rp-stage').addEventListener('click', e => {
  if (!v || e.target.closest('.rp-ui,.rp-menu,.rp-err,.rp-top')) return;
  if (Date.now() - gestoT < 400) return;   // fue un pellizco o un arrastre, no un toque
  if ($('.rp-menu').classList.contains('on')) return $('.rp-menu').classList.remove('on');
  if (matchMedia('(hover:none)').matches && !el.classList.contains('ui')) return despertar();
  const now = Date.now(); if (now - tapT < 280) { clearTimeout(tapT._t); tapT = 0; return fs(); }
  tapT = now; tapT._t = setTimeout(() => { toggle(); big(v.paused ? IC.pause : IC.play); }, 280);
});
const fs = () => { if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.().catch(() => {}); };
$('.rp-fs').onclick = fs;
document.addEventListener('fullscreenchange', () => { $('.rp-fs').innerHTML = document.fullscreenElement ? IC.nofull : IC.full; });
const volIn = $('.rp-vol input');
volIn.oninput = () => { if (!v) return; v.volume = +volIn.value; v.muted = v.volume === 0; pref.set('vol', v.volume); };
$('.rp-mute').onclick = () => { if (v) v.muted = !v.muted; };
// Barra de progreso
const bar = $('.rp-bar');
const posDe = e => { const r = $('.rp-track').getBoundingClientRect(); return Math.max(0, Math.min(1, ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width)); };
let arrastre = false;
bar.addEventListener('pointerdown', e => { if (!v || !v.duration) return; arrastre = true; bar.setPointerCapture(e.pointerId); pintar(posDe(e)); });
bar.addEventListener('pointermove', e => { const p = posDe(e), tip = $('.rp-tip'); tip.textContent = hms(p * (v && v.duration || 0)); tip.style.left = (p * 100) + '%'; if (arrastre) pintar(p); });
bar.addEventListener('pointerup', e => { if (!arrastre) return; arrastre = false; v.currentTime = posDe(e) * v.duration; });
function pintar(p) { $('.rp-pos').style.width = (p * 100) + '%'; $('.rp-knob').style.left = (p * 100) + '%'; }
function tick() {
  if (!v) return;
  if (!arrastre && v.duration) pintar(v.currentTime / v.duration);
  $('.rp-time').textContent = mmss(v.currentTime) + ' / ' + hms(v.duration);
  let b = 0; for (let i = 0; i < v.buffered.length; i++) if (v.buffered.start(i) <= v.currentTime + 1) b = v.buffered.end(i);
  $('.rp-buf').style.width = (v.duration ? b / v.duration * 100 : 0) + '%';
}
// Teclado
addEventListener('keydown', e => {
  if (!el.classList.contains('on') || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.target !== volIn) return;
  const k = e.key.toLowerCase(); let hecho = true;
  if (k === 'escape') { if (emb.classList.contains('on')) emb.classList.remove('on'); else if (ctx.classList.contains('on')) cerrarCtx(); else if ($('.rp-menu').classList.contains('on')) $('.rp-menu').classList.remove('on'); else if (!document.fullscreenElement) cerrar(); else hecho = false; }
  else if (!v) hecho = false;
  else if (k === ' ' || k === 'k') { toggle(); big(v.paused ? IC.pause : IC.play); }
  else if (k === 'arrowleft' || k === 'j') salto(k === 'j' ? -10 : -5);
  else if (k === 'arrowright' || k === 'l') salto(k === 'l' ? 10 : 5);
  else if (k === 'arrowup' || k === 'arrowdown') { v.muted = false; v.volume = Math.max(0, Math.min(1, v.volume + (k === 'arrowup' ? .05 : -.05))); aviso('Volumen ' + Math.round(v.volume * 100) + ' %'); }
  else if (k === 'f') fs(); else if (k === 'm') v.muted = !v.muted; else if (k === 'p') pip();
  else if (k === 'c') $('.rp-cc').click();
  else if (k === 'z') { const ks = Object.keys(ENCUADRES); setEncuadre(ks[(ks.indexOf(encuadre) + 1) % ks.length]); }
  else if (/^[0-9]$/.test(k) && v.duration) v.currentTime = v.duration * (+k / 10);
  else hecho = false;
  if (hecho) { e.preventDefault(); despertar(); }
});

// --- Pantalla en pantalla y transmitir ---
async function pip() {
  if (!v) return;
  try { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await v.requestPictureInPicture(); }
  catch { aviso('Este navegador no permite pantalla en pantalla'); }
}
$('.rp-pipb').onclick = pip;
$('.rp-cast').onclick = () => { if (!v || !v.remote) return aviso('Este navegador no puede transmitir'); v.remote.prompt().catch(e => aviso(e.name === 'NotFoundError' ? 'No encontré dispositivos para transmitir en tu red' : 'No se pudo transmitir')); };
// --- Clic derecho: menú propio ---
const ctx = $('.rp-ctx'), emb = $('.rp-emb');
const cerrarCtx = () => ctx.classList.remove('on');
el.addEventListener('click', e => { if (!e.target.closest('.rp-ctx')) cerrarCtx(); }, true);
$('.rp-stage').addEventListener('contextmenu', e => {
  if (!v || e.target.closest('.rp-menu,.rp-emb')) return;
  e.preventDefault(); menu.classList.remove('on');
  const btn = (ico, txt, fn, cls = '') => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.innerHTML = ico + '<span>' + esc(txt) + '</span>'; b.onclick = ev => { ev.stopPropagation(); cerrarCtx(); fn(); }; return b; };
  const fl = x => `<span class="fl">${codigo(x)}</span>`;
  ctx.innerHTML = '';
  if (document.pictureInPictureEnabled) ctx.append(btn(IC.pip, document.pictureInPictureElement ? 'Salir de pantalla en pantalla' : 'Pantalla en pantalla', pip));
  if (st0.insertar) ctx.append(btn(IC.code, 'Insertar (código HTML)', insertar));
  if (st0.audios.length) {
    ctx.append(Object.assign(document.createElement('hr')), Object.assign(document.createElement('div'), { className: 't', textContent: 'Idiomas de audio' }));
    st0.audios.forEach((a, i) => ctx.append(btn(fl(a), a.label, () => setAudio(i), i === st0.a ? 'on' : '')));
  }
  if (st0.subs.length) {
    ctx.append(Object.assign(document.createElement('div'), { className: 't', textContent: 'Subtítulos' }));
    st0.subs.forEach((s2, i) => ctx.append(btn(fl(s2), s2.label, () => setSub(i), i === st0.s ? 'on' : '')));
  }
  if (st0.dl) { ctx.append(document.createElement('hr')); ctx.append(btn(IC.dl, 'Descargar', () => { const a = document.createElement('a'); a.href = st0.dl; a.download = ''; a.click(); })); }
  ctx.classList.add('on');
  const r = el.getBoundingClientRect(), w = ctx.offsetWidth, h = ctx.offsetHeight;
  ctx.style.left = Math.min(e.clientX - r.left, r.width - w - 8) + 'px';
  ctx.style.top = Math.max(8, Math.min(e.clientY - r.top, r.height - h - 8)) + 'px';
});
function insertar() {
  const code = `<iframe src="${st0.insertar}" width="960" height="540" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  emb.innerHTML = '<div><h3>Insertar</h3><p>Pega este código en cualquier página para mostrar el video. Ojo: quien tenga el código puede verlo sin iniciar sesión.</p><textarea readonly></textarea><div class="a"><button type="button" class="s">Cerrar</button><button type="button" class="c">Copiar</button></div></div>';
  const ta = emb.querySelector('textarea'); ta.value = code;
  emb.classList.add('on'); ta.focus(); ta.select();
  emb.querySelector('.s').onclick = () => emb.classList.remove('on');
  emb.querySelector('.c').onclick = async () => { try { await navigator.clipboard.writeText(code); } catch { ta.select(); document.execCommand('copy'); } aviso('Código copiado'); emb.classList.remove('on'); };
  emb.onclick = e => { if (e.target === emb) emb.classList.remove('on'); };
}

// --- Menú de ajustes ---
const menu = $('.rp-menu');
$('.rp-set').onclick = e => { e.stopPropagation(); if (menu.classList.toggle('on')) menuPrincipal(); despertar(); };
function opcion(label, val, fn) { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = label + (val != null ? `<span class="v">${esc(val)}</span>${IC.chev}` : ''); b.onclick = e => { e.stopPropagation(); fn(); }; return b; }
function menuPrincipal() {
  menu.innerHTML = '';
  if (st0.kind === 'video') menu.append(opcion('Calidad', st0.calidades[st0.q].label, () => lista('Calidad', st0.calidades.map(c => c.label), st0.q, setCalidad, st0.calidades.length < 2 ? 'Las otras calidades (720p, 480p…) se están preparando.' : '')));
  if (st0.audios.length > 1) menu.append(opcion('Audio', conBandera(st0.audios[st0.a]), () => lista('Audio', st0.audios.map(a => conBandera(a)), st0.a, setAudio)));
  menu.append(opcion('Subtítulos', st0.s < 0 ? (forzadoAuto() >= 0 ? 'Solo forzados' : 'No') : conBandera(st0.subs[st0.s]), () => lista('Subtítulos', ['No'].concat(st0.subs.map(s => conBandera(s))), st0.s + 1, i => setSub(i - 1))));
  const vel = [0.5, 0.75, 1, 1.25, 1.5, 2];
  menu.append(opcion('Encuadre', ENCUADRES[encuadre][0], () => lista('Encuadre', Object.values(ENCUADRES).map(x => x[0]), Object.keys(ENCUADRES).indexOf(encuadre), i => setEncuadre(Object.keys(ENCUADRES)[i]))));
  if (zoom.s > 1) menu.append(opcion('Quitar zoom', null, () => { zoomA(1, 0, 0); menu.classList.remove('on'); }));
  menu.append(opcion('Velocidad', v.playbackRate === 1 ? 'Normal' : v.playbackRate + '×', () => lista('Velocidad', vel.map(x => x === 1 ? 'Normal' : x + '×'), vel.indexOf(v.playbackRate), i => { v.playbackRate = vel[i]; })));
}
function lista(titulo, ops, sel, fn, nota) {
  menu.innerHTML = '';
  const h = document.createElement('button'); h.type = 'button'; h.className = 'h'; h.innerHTML = IC.left + esc(titulo); h.onclick = e => { e.stopPropagation(); menuPrincipal(); }; menu.append(h);
  ops.forEach((o, i) => { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `<span class="ck">${i === sel ? IC.check : ''}</span>${esc(o)}`; b.onclick = e => { e.stopPropagation(); fn(i); menuPrincipal(); }; menu.append(b); });
  if (nota) { const n = document.createElement('div'); n.style.cssText = 'padding:8px 10px 4px;font-size:.78rem;color:#cbbf9f;max-width:230px'; n.textContent = nota; menu.append(n); }
}

// --- Calidad ---
function setCalidad(i, auto) {
  const c = st0.calidades[i]; if (!c) return;
  const t = v.currentTime, playing = !v.paused || auto === 'inicio';
  st0.q = i; $('.rp-q').textContent = c.label; $('.rp-q').style.display = '';
  if (!auto) pref.set('calidad', c.alto);
  el.classList.add('cargando');
  v.src = c.src;
  v.addEventListener('loadedmetadata', () => { if (t) v.currentTime = t; if (playing) v.play().catch(() => {}); }, { once: true });
  if (!auto) aviso('Calidad: ' + c.label);
}
// --- Audio (pista interna o externa sincronizada) ---
let ext = null, actx = null, gain = null;
function silenciarInterno(on) {
  try {
    if (!actx) { actx = new (window.AudioContext || window.webkitAudioContext)(); const s = actx.createMediaElementSource(v); gain = actx.createGain(); s.connect(gain).connect(actx.destination); const a0 = actx; cleanup.push(() => a0.close()); }
    gain.gain.value = on ? 0 : 1; actx.resume();
  } catch { v.muted = on; }
}
function sync(forzar) {
  if (!ext || st0.a === 0) return;
  if (forzar || Math.abs(ext.currentTime - v.currentTime) > 0.3) ext.currentTime = v.currentTime;
  ext.playbackRate = v.playbackRate; ext.volume = v.volume; ext.muted = v.muted;
  if (v.paused || v.seeking || v.readyState < 3) ext.pause(); else if (ext.paused) ext.play().catch(() => {});
}
function setAudio(i) {
  const a = st0.audios[i]; st0.a = i; pref.set('audio', a.label); aplicarSubs();
  if (!a.src) { if (ext) ext.pause(); silenciarInterno(false); return; }
  if (!ext) {
    ext = document.createElement('audio'); ext.preload = 'auto'; if (st0.co) ext.crossOrigin = st0.co; $('.rp-media').appendChild(ext);
    const h = () => sync(false), hs = () => sync(true);
    ['play', 'pause', 'seeking', 'waiting', 'playing', 'ratechange', 'volumechange'].forEach(n => v.addEventListener(n, h)); v.addEventListener('seeked', hs);
    const t = setInterval(h, 1000), e0 = ext; cleanup.push(() => { clearInterval(t); e0.pause(); e0.removeAttribute('src'); e0.load(); ext = null; actx = null; gain = null; });
  }
  silenciarInterno(true);
  if (ext.getAttribute('src') !== a.src) { ext.src = a.src; ext.addEventListener('loadedmetadata', () => sync(true), { once: true }); } else sync(true);
}
// --- Subtítulos (dibujados aquí) ---
// Subtítulos forzados (carteles y diálogos en otro idioma): con los subtítulos apagados, se muestran solos
// si son del mismo idioma del audio que suena.
const LG = { spa: 'es', es: 'es', eng: 'en', en: 'en', por: 'pt', pt: 'pt', fre: 'fr', fra: 'fr', fr: 'fr', ita: 'it', it: 'it', ger: 'de', deu: 'de', de: 'de', jpn: 'ja', ja: 'ja', kor: 'ko', ko: 'ko' };
const idioma = x => { if (!x) return ''; const l = LG[String(x.lang || '').toLowerCase()]; if (l) return l; const t = String(x.label || '').toLowerCase();
  return /espa|latin|castell/.test(t) ? 'es' : /ingl|english/.test(t) ? 'en' : /portu/.test(t) ? 'pt' : /fran/.test(t) ? 'fr' : /ital/.test(t) ? 'it' : ''; };
function forzadoAuto() { if (!st0 || st0.s >= 0) return -1; const la = idioma(st0.audios[st0.a]); return la ? st0.subs.findIndex(s => s.forzado && idioma(s) === la) : -1; }
const subActivo = () => st0.s >= 0 ? st0.s : forzadoAuto();
function aplicarSubs() { if (!v) return; const i = subActivo(); [...v.textTracks].forEach((tt, j) => { tt.mode = j === i ? 'hidden' : 'disabled'; }); pintarSubs(); }
function setSub(i) {
  st0.s = i; $('.rp-cc').classList.toggle('on', i >= 0);
  aplicarSubs();
  if (i >= 0) { pref.set('sub', st0.subs[i].label); st0.ultimoSub = i; } else pref.set('sub', null);
}
$('.rp-cc').onclick = () => { if (!st0 || !st0.subs.length) return aviso('Este video no tiene subtítulos'); setSub(st0.s >= 0 ? -1 : (st0.ultimoSub ?? 0)); aviso(st0.s >= 0 ? 'Subtítulos: ' + st0.subs[st0.s].label : 'Sin subtítulos'); };
function pintarSubs() {
  const box = $('.rp-subs'); box.innerHTML = '';
  if (!v) return; const i = subActivo(); if (i < 0) return;
  const tt = v.textTracks[i]; if (!tt || !tt.activeCues) return;
  [...tt.activeCues].forEach(c => { const sp = document.createElement('span'); try { sp.append(c.getCueAsHTML()); } catch { sp.textContent = c.text; } box.append(sp, document.createElement('br')); });
}

// --- Encuadre y zoom ---
// Encuadre: tamaño original (con franjas), recortar para llenar la pantalla o estirar. Se recuerda.
const ENCUADRES = { original: ['Tamaño original', 'contain'], recortar: ['Recortar a la pantalla', 'cover'], estirar: ['Estirar', 'fill'] };
let encuadre = ENCUADRES[pref.get('encuadre', 'original')] ? pref.get('encuadre', 'original') : 'original';
function pintarEncuadre() { el.querySelectorAll('.rp-media video,.rp-media .rp-img').forEach(m => { m.style.objectFit = ENCUADRES[encuadre][1]; }); }
function setEncuadre(k) { encuadre = k; pref.set('encuadre', k); zoomA(1, 0, 0); pintarEncuadre(); aviso(ENCUADRES[k][0]); }
// Zoom: pellizcar con dos dedos (o el trackpad) agranda; con zoom, un dedo mueve la imagen.
const zoom = { s: 1, x: 0, y: 0 }, ZMAX = 5;
let gestoT = 0;
function zoomA(s, x, y) {
  const r = $('.rp-stage').getBoundingClientRect();
  s = Math.max(1, Math.min(ZMAX, s)); if (s < 1.02) { s = 1; x = 0; y = 0; }
  zoom.s = s; zoom.x = Math.min(0, Math.max(r.width * (1 - s), x)); zoom.y = Math.min(0, Math.max(r.height * (1 - s), y));
  $('.rp-media').style.transform = s === 1 ? '' : `translate(${zoom.x}px,${zoom.y}px) scale(${s})`;
  el.classList.toggle('zoom', s > 1);
}
// Zoom alrededor de un punto de la pantalla (px, py relativos al escenario): ese punto queda quieto
const zoomEn = (s, px, py) => { const k = Math.max(1, Math.min(ZMAX, s)) / zoom.s; zoomA(zoom.s * k, px - (px - zoom.x) * k, py - (py - zoom.y) * k); };
{
  const stage = $('.rp-stage'), toques = new Map(); let g = null;
  const rel = p => { const r = stage.getBoundingClientRect(); return { x: p.x - r.left, y: p.y - r.top }; };
  const dos = () => { const [a, b] = [...toques.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, m: rel({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }) }; };
  stage.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || e.target.closest('.rp-ui,.rp-menu,.rp-ctx,.rp-emb,.rp-err,.rp-top')) return;
    toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (toques.size === 2) { const t = dos(); g = { d0: t.d, m0: t.m, s0: zoom.s, x0: zoom.x, y0: zoom.y }; }
    else if (toques.size === 1 && zoom.s > 1) g = { pan: true, p0: { x: e.clientX, y: e.clientY }, x0: zoom.x, y0: zoom.y, mov: false };
  });
  stage.addEventListener('pointermove', e => {
    if (!toques.has(e.pointerId)) return; toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!g) return;
    if (toques.size >= 2 && !g.pan) {
      const t = dos(), s = Math.max(1, Math.min(ZMAX, g.s0 * t.d / g.d0)), k = s / g.s0;
      // el punto que estaba bajo los dedos sigue bajo los dedos (y se puede arrastrar con los dos)
      zoomA(s, t.m.x - (g.m0.x - g.x0) * k, t.m.y - (g.m0.y - g.y0) * k); gestoT = Date.now(); despertar();
    } else if (g.pan) {
      const dx = e.clientX - g.p0.x, dy = e.clientY - g.p0.y;
      if (!g.mov && Math.hypot(dx, dy) < 8) return;
      g.mov = true; zoomA(zoom.s, g.x0 + dx, g.y0 + dy); gestoT = Date.now();
    }
  });
  const fin = e => {
    if (!toques.delete(e.pointerId)) return;
    if (g && !g.pan && toques.size < 2) { gestoT = Date.now(); if (zoom.s > 1) aviso('Zoom ' + zoom.s.toFixed(1).replace('.', ',') + '×'); }
    g = null;
    if (toques.size === 1 && zoom.s > 1) { const [p] = [...toques.values()]; g = { pan: true, p0: p, x0: zoom.x, y0: zoom.y, mov: true }; }
  };
  stage.addEventListener('pointerup', fin); stage.addEventListener('pointercancel', fin);
  // Trackpad (pellizco = rueda con Ctrl) y Ctrl + rueda del mouse
  stage.addEventListener('wheel', e => {
    if (!e.ctrlKey || !v && !$('.rp-img')) return;
    e.preventDefault(); const p = rel({ x: e.clientX, y: e.clientY });
    zoomEn(zoom.s * Math.exp(-e.deltaY / 120), p.x, p.y); clearTimeout(zoom._t);
    zoom._t = setTimeout(() => { if (zoom.s > 1) aviso('Zoom ' + zoom.s.toFixed(1).replace('.', ',') + '×'); }, 250);
  }, { passive: false });
  // Safari en Mac: gesto de pellizco propio
  let s0 = 1; stage.addEventListener('gesturestart', e => { e.preventDefault(); s0 = zoom.s; });
  stage.addEventListener('gesturechange', e => { e.preventDefault(); const p = rel({ x: e.clientX, y: e.clientY }); zoomEn(s0 * e.scale, p.x, p.y); });
  addEventListener('resize', () => zoomA(1, 0, 0));
  document.addEventListener('fullscreenchange', () => zoomA(1, 0, 0));
}

function abrir({ titulo, sub, sinopsis, fondo, kind, src, dl, pistas, cred, insertar: ins, embed, inicio, progreso, alTerminar, alCerrar, alDuracion, cors }) {
  cerrar(); alCerrar0 = alCerrar || null;
  const co = cred ? 'use-credentials' : cors === false ? null : 'anonymous';
  $('.rp-tt h2').textContent = titulo; $('.rp-tt small').textContent = sub || '';
  
  el.classList.toggle('emb', !!embed); cerrarCtx(); emb.classList.remove('on');
  el.classList.add('on', 'ui'); if (el.parentNode === document.body) document.body.style.overflow = 'hidden'; el.focus({ preventScroll: true });
  if (kind === 'image') { $('.rp-ui').style.display = 'none'; const im = document.createElement('img'); im.className = 'rp-img'; im.alt = ''; im.src = src; $('.rp-media').appendChild(im); pintarEncuadre(); return; }
  $('.rp-ui').style.display = '';
  v = document.createElement('video'); const mio0 = v; v.playsInline = true; if (co) v.crossOrigin = co; v.preload = 'auto';
  v.volume = pref.get('vol', 1);
  $('.rp-media').appendChild(v); pintarEncuadre();
  st0 = { co, kind, dl: dl || src, insertar: ins || null, calidades: [{ alto: 0, label: 'Original', src }], q: 0, audios: [{ label: 'Original', src: null }], a: 0, subs: [], s: -1 };
  $('.rp-q').style.display = 'none'; $('.rp-cc').style.display = kind === 'video' ? '' : 'none';
  $('.rp-pipb').style.display = kind === 'video' && document.pictureInPictureEnabled ? '' : 'none';
  $('.rp-cast').style.display = v.remote ? '' : 'none';
  const mio = v;
  const on = (n, f) => { v.addEventListener(n, f); };
  on('play', () => { $('.rp-pp').innerHTML = IC.pause; el.classList.add('rp-play'); despertar(); });
  on('pause', () => { $('.rp-pp').innerHTML = IC.play; el.classList.remove('rp-play'); el.classList.add('ui'); });
  on('timeupdate', tick); on('progress', tick); on('durationchange', tick);
  on('waiting', () => el.classList.add('cargando')); on('playing', () => el.classList.remove('cargando')); on('canplay', () => el.classList.remove('cargando'));
  on('volumechange', () => { volIn.value = v.muted ? 0 : v.volume; $('.rp-mute').innerHTML = v.muted || v.volume === 0 ? IC.mute : IC.vol; });
  on('ended', () => { el.classList.add('ui'); guardar(); if (alTerminar) alTerminar(); });
  if (alDuracion) on('loadedmetadata', () => { if (v === mio && isFinite(v.duration)) alDuracion(Math.round(v.duration)); });
  // Progreso: se guarda cada 15 s mientras suena, al pausar y al cerrar (y se retoma al volver a abrir)
  let ultimo = -1;
  const guardar = () => { if (!progreso || !v || !v.duration || v !== mio) return; const t = Math.floor(v.currentTime); if (Math.abs(t - ultimo) < 3) return; ultimo = t; progreso(t, Math.floor(v.duration)); };
  if (progreso) { const iv = setInterval(() => { if (v === mio && !v.paused) guardar(); }, 15000); const v0 = mio; cleanup.push(() => { clearInterval(iv); if (v0.duration) { ultimo = -1; v = v0; guardar(); } }); on('pause', guardar); }
  if (inicio > 5) v.addEventListener('loadedmetadata', () => { if (v === mio && v.duration && inicio < v.duration - 30 && v.currentTime < 1) { v.currentTime = inicio; aviso('Continuando desde ' + hms(inicio)); } }, { once: true });
  on('error', () => {
    if (v !== mio) return;
    // Un servidor que no permite CORS rechaza el video pedido «anonymous»: se reintenta sin CORS (se pierden los
    // subtítulos y audios de otros sitios, pero el video se ve)
    if (v.crossOrigin && !st0.sinCors && v.error && v.error.code === 4 && v.currentTime < 1) {
      st0.sinCors = true; st0.co = null; v.removeAttribute('crossorigin'); const t0 = v.src; v.src = ''; v.src = t0;
      v.play().catch(() => {}); return;
    }
    // Si esta calidad no se puede reproducir aquí (por ejemplo un .mkv en Safari), se prueba con la siguiente
    const sig = st0.calidades.findIndex((c, i) => i > st0.q);
    if (sig > 0) { aviso('Probando otra calidad…'); return setCalidad(sig, true); }
    el.classList.remove('cargando');
    const e = $('.rp-err'); e.innerHTML = 'Este navegador no puede reproducir este archivo.' + (st0.calidades.length < 2 ? ' Las calidades para cualquier navegador se están preparando.' : '') + ` <a href="${esc(dl || src)}" download>Descargar el archivo</a>`; e.style.display = 'block';
  });
  v.textTracks.addEventListener?.('change', pintarSubs);
  volIn.value = v.volume;
  const arrancar = () => { el.classList.add('cargando'); v.src = st0.calidades[st0.q].src; v.play().catch(() => { el.classList.remove('cargando'); }); };
  if (kind !== 'video' || !pistas) { arrancar(); return; }
  // Con pistas: se piden primero (rápido) para empezar ya en la calidad preferida
  let empezado = false; const plan = setTimeout(() => { empezado = true; arrancar(); }, 1500);
  pistas().then(p => {
    if (v !== mio || !p) { if (!empezado) { clearTimeout(plan); arrancar(); } return; }
    if (p.calidades && p.calidades.length) st0.calidades = p.calidades;
    st0.audios = p.audios && p.audios.length ? p.audios : st0.audios; st0.subs = p.subs || [];
    // Calidad: la última que elegiste, o la más alta que no pase de la pantalla
    const quiero = pref.get('calidad', null), pant = Math.max(screen.width, screen.height) * (devicePixelRatio || 1);
    let qi = quiero ? st0.calidades.findIndex(c => c.alto <= quiero) : st0.calidades.findIndex(c => c.alto * 16 / 9 <= pant * 1.1);
    if (qi < 0) qi = st0.calidades.length - 1;
    $('.rp-q').style.display = '';
    if (!empezado) { clearTimeout(plan); st0.q = qi; $('.rp-q').textContent = st0.calidades[qi].label; arrancar(); }
    else if (v.src !== st0.calidades[qi].src) setCalidad(qi, true);
    else { st0.q = qi; $('.rp-q').textContent = st0.calidades[qi].label; }
    // Subtítulos como <track> ocultos (se dibujan aquí)
    st0.subs.forEach(s => { const tr = document.createElement('track'); tr.kind = 'subtitles'; tr.label = s.label; tr.src = s.src; tr.srclang = s.lang || 'es'; v.appendChild(tr); });
    [...v.textTracks].forEach(tt => { tt.mode = 'disabled'; tt.addEventListener('cuechange', pintarSubs); });
    const ps = pref.get('sub', null), si = ps ? st0.subs.findIndex(s => s.label === ps) : -1;
    setSub(si);
    const pa = pref.get('audio', null), ai = pa ? st0.audios.findIndex(a => a.label === pa) : 0;
    if (ai > 0) v.addEventListener('loadedmetadata', () => setAudio(ai), { once: true });
  }).catch(() => { if (!empezado) { clearTimeout(plan); arrancar(); } });
}
window.Reproductor = { abrir, cerrar, bandera: banderaDe };
})();
