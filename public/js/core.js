'use strict';
/* ════════════════════════════════════════════════════════════
   Núcleo: estado, sincronización, idioma, tema, utilidades
   ════════════════════════════════════════════════════════════ */

const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};

function t(key) {
  const row = T[key];
  if (!row) return key;
  return row[LANGS.indexOf(App.lang)] ?? row[0];
}

/* ── Utilidades ─────────────────────────────────────────── */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const tod = () => new Date().toLocaleDateString('en-CA');
const isoToDate = s => new Date(s + 'T12:00:00');
const loc = () => LOCALES[App.lang] || 'es-ES';
const fmtDate     = s => isoToDate(s).toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'short' });
const fmtDateLong = s => isoToDate(s).toLocaleDateString(loc(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const fmtTime     = ts => new Date(ts).toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' });
const fmtDateTime = ts => new Date(ts).toLocaleString(loc(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const shiftDate = (s, d) => { const x = isoToDate(s); x.setDate(x.getDate() + d); return x.toLocaleDateString('en-CA'); };
const pctCls  = p => p >= 90 ? 'ph' : p >= 50 ? 'pm' : 'pl';
const fillCls = p => p >= 90 ? 'fh' : p >= 50 ? 'fm' : 'fl';
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Acepta "12,50", "1.234,56", "1,234.56" */
function parseNum(v) {
  if (typeof v === 'number') return v;
  let s = String(v ?? '').trim().replace(/\s/g, '');
  if (!s) return NaN;
  const c = s.lastIndexOf(','), d = s.lastIndexOf('.');
  if (c > -1 && d > -1) s = c > d ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (c > -1) s = s.replace(',', '.');
  return Number(s);
}

/* Dinero: todo se guarda en centavos (enteros) */
const CUR = {
  USD: { sym: '$',  name: () => t('usdName') },
  XCG: { sym: 'Cg', name: () => t('xcgName') },
};
const toCents = v => { const n = parseNum(v); return isFinite(n) ? Math.round(n * 100) : 0; };
function fmtNum(n, dec = 2) {
  return Number(n).toLocaleString(loc(), { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function money(cents, cur) {
  const neg = cents < 0;
  return (neg ? '−' : '') + CUR[cur].sym + ' ' + fmtNum(Math.abs(cents) / 100);
}

/* ── Avisos ─────────────────────────────────────────────── */
function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2600);
  setTimeout(() => el.remove(), 3000);
}
function confirmDlg(msg, yesLabel = t('del')) {
  return new Promise(res => {
    const m = $('#modal');
    $('#modalTxt').textContent = msg;
    $('#modalYes').textContent = yesLabel;
    $('#modalNo').textContent = t('cancel');
    m.hidden = false;
    $('#modalYes').focus();
    const done = v => { m.hidden = true; m.onclick = null; document.removeEventListener('keydown', onKey); res(v); };
    const onKey = e => { if (e.key === 'Escape') done(false); };
    document.addEventListener('keydown', onKey);
    $('#modalYes').onclick = () => done(true);
    $('#modalNo').onclick = () => done(false);
    m.onclick = e => { if (e.target === m) done(false); };
  });
}

/* ── Sincronización con el servidor ─────────────────────── */
function setSync(st) {
  const b = $('#sbadge');
  b.className = 'sync-badge ' + st;
  $('#stxt').textContent = { ok: t('sok'), saving: t('ssav'), error: t('serr'), loading: t('sload') }[st] || st;
}

class Store {
  constructor(name, defaults) {
    this.name = name;
    this.defaults = defaults;
    this.data = defaults();
    this.ts = 0;
    this.saving = false;
    this.pending = false;
  }
  async load() {
    const r = await fetch('/api/store/' + this.name);
    if (!r.ok) throw new Error('load ' + this.name);
    const j = await r.json();
    this.data = Object.assign(this.defaults(), j.data);
    this.ts = j.ts;
  }
  async save() {
    if (this.saving) { this.pending = true; return; }
    this.saving = true;
    setSync('saving');
    try {
      const r = await fetch('/api/store/' + this.name, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.data),
      });
      if (!r.ok) throw new Error();
      this.ts = (await r.json()).ts;
      setSync('ok');
    } catch {
      setSync('error');
      toast(t('saveErr'), 'err');
    } finally {
      this.saving = false;
      if (this.pending) { this.pending = false; this.save(); }
    }
  }
  get busy() { return this.saving || this.pending; }
  /* Espera a que termine de guardarse (antes de pedir un recibo al servidor) */
  async flush() { while (this.busy) await new Promise(r => setTimeout(r, 80)); }
}

/* ── Imágenes: se reducen en el navegador y se suben como archivo ── */
function resizeImage(file, max = 640, type = 'image/jpeg') {
  return new Promise((res, rej) => {
    if (!file || !/^image\//.test(file.type)) return rej(new Error('type'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const g = c.getContext('2d');
      if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL(type, .85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode')); };
    img.src = url;
  });
}
async function uploadImage(dataUrl) {
  const r = await fetch('/api/imagen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: dataUrl }) });
  if (!r.ok) throw new Error('upload');
  return (await r.json()).url;
}
function deleteImage(url) {
  const m = String(url || '').match(/^\/img\/([a-f0-9]{16}\.(?:jpg|png))$/);
  if (m) fetch('/api/imagen/' + m[1], { method: 'DELETE' }).catch(() => {});
}
/* Descarga un recibo (bon 80 mm o invoice A4) de una venta */
async function downloadReceipt(id, tipo) {
  await App.stores.caja.flush();
  const lang = App.stores.config.data.recibo_idioma || App.lang;
  try {
    const r = await fetch(`/api/recibo/${encodeURIComponent(id)}?tipo=${tipo}&lang=${lang}`);
    if (!r.ok || !(r.headers.get('content-type') || '').includes('pdf')) {
      // 404 con JSON genérico = el servidor no tiene la ruta de recibos (hay que reiniciarlo)
      toast(t(r.status === 404 && (r.headers.get('content-type') || '').includes('json') ? 'rcpRestart' : 'rcpFail'), 'err');
      return;
    }
    const name = (r.headers.get('content-disposition') || '').match(/filename=([^;]+)/)?.[1] || `${tipo}.pdf`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await r.blob());
    a.download = name.replace(/"/g, '');
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast(t('exported'));
  } catch {
    toast(t('rcpFail'), 'err');
  }
}

/* ── Aplicación ─────────────────────────────────────────── */
const App = {
  lang: LS.get('gestRend_lang', 'es'),
  mod: LS.get('gestRend_mod', 'inicio'),
  modules: {},
  stores: {
    data: new Store('data', () => ({})),
    caja: new Store('caja', () => ({ tasa: 1.79, movs: [], arqueos: [], conteo: { USD: {}, XCG: {} }, fondo: { USD: 0, XCG: 0 }, seq: 0 })),
    productos: new Store('productos', () => ({ lista: [] })),
    config: new Store('config', () => ({
      empresa_nombre: '', empresa_subtitulo: '', empresa_direccion: '', empresa_contacto: '',
      empresa_crib: '', empresa_ob_nr: '', empresa_logo: '',
      empresa_color_principal: '#1e293b', empresa_color_acento: '#0ea5e9',
      impuesto_activo: false, impuesto_nombre: 'OB', impuesto_porcentaje: 6,
      bon_mensaje: '', bon_politica: '', recibo_idioma: '',
    })),
  },
  staleRender: false,

  register(id, def) { this.modules[id] = def; },

  show(id) {
    if (!this.modules[id]) id = 'inicio';
    this.mod = id;
    LS.set('gestRend_mod', id);
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.mod === id));
    $$('.mod').forEach(s => s.classList.toggle('active', s.id === 'mod-' + id));
    this.renderHeader();
    this.render();
    window.scrollTo({ top: 0 });
  },

  renderHeader() {
    const m = this.modules[this.mod];
    $('#pageTitle').textContent = t(m.title);
    $('#pageSub').textContent = t(m.sub);
    document.title = 'GestRend · ' + t(m.title);
  },

  render() {
    this.staleRender = false;
    this.modules[this.mod].render($('#mod-' + this.mod));
  },

  setLang(l) {
    this.lang = LANGS.includes(l) ? l : 'es';
    LS.set('gestRend_lang', this.lang);
    document.documentElement.lang = this.lang === 'pap' ? 'pap' : this.lang;
    $('#langSel').value = this.lang;
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    setSync($('#sbadge').className.replace('sync-badge', '').trim() || 'loading');
    if (this.modules[this.mod]) { this.renderHeader(); this.render(); }
  },

  toggleTheme() {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    LS.set('gestRend_theme', root.dataset.theme);
    if (this.modules[this.mod].onTheme) this.modules[this.mod].onTheme();
  },

  /* Comprueba si otro equipo cambió los datos */
  async poll() {
    try {
      const ts = await (await fetch('/api/ping')).json();
      const deps = this.modules[this.mod].stores || [];
      for (const [name, st] of Object.entries(this.stores)) {
        if (!st.busy && ts[name] > st.ts) {
          await st.load();
          if (deps.includes(name)) this.staleRender = true;
        }
      }
      if (Object.values(this.stores).every(s => !s.busy)) setSync('ok');
      const typing = document.activeElement && document.activeElement.closest('.main') &&
                     /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      if (this.staleRender && !typing) this.render();
    } catch { setSync('error'); }
  },
};
