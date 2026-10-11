'use strict';
/* ════════════════════════════════════════════════════════════
   Tareas (registro diario) y Reportes
   Datos: { "AAAA-MM-DD": [ { nombre, tareas:[{texto,hecho}], comentarios } ] }
   ════════════════════════════════════════════════════════════ */

const DEF_TASKS = ['Inventario', 'Precios', 'Cliente', 'Email', 'Llenar', 'Pedir', 'Limpiar'];
const DB = () => App.stores.data.data;
const saveData = () => App.stores.data.save();
const pctOf = ts => ts.length ? Math.round(ts.filter(x => x.hecho).length / ts.length * 100) : 0;

function trTask(text) {
  const lo = text.toLowerCase().trim();
  for (const k of Object.keys(DICT))
    if (DICT[k].match.some(m => lo.includes(m))) return DICT[k][App.lang];
  return text;
}
function spellHint(text) {
  const lo = text.toLowerCase().trim();
  if (lo.length < 3) return null;
  for (const k of Object.keys(DICT))
    if (DICT[k].match.some(m => lo.includes(m))) {
      const s = DICT[k][App.lang];
      return s.toLowerCase() !== lo ? s : null;
    }
  return null;
}

const ICON = {
  prev:  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>',
  next:  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
  user:  '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  pdf:   '<svg viewBox="0 0 24 24"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/></svg>',
};

/* ── Registro diario ───────────────────────────────────── */
const Tareas = {
  title: 'mTareas', sub: 'sTareas', stores: ['data'],
  date: tod(),

  render(root) {
    const f = this.date, datos = DB()[f] || [];
    const y = shiftDate(tod(), -1);
    const tag = f === tod() ? t('tod') : f === y ? t('yes') : fmtDate(f);
    const cards = datos.map((w, wi) => this.card(f, w, wi)).join('');
    root.innerHTML = `
      <div class="t-bar">
        <div class="date-ctr">
          <button class="icon-btn" data-act="day" data-d="-1" title="${t('prev')}" aria-label="${t('prev')}">${ICON.prev}</button>
          <input type="date" class="inp" id="tDate" value="${f}">
          <button class="icon-btn" data-act="day" data-d="1" title="${t('next')}" aria-label="${t('next')}">${ICON.next}</button>
          <span class="date-tag">${esc(tag)}</span>
        </div>
        <form class="add-w" id="addW">
          <input class="inp" id="nomTrab" placeholder="${t('wph')}" autocomplete="off" aria-label="${t('wlbl')}">
          <button class="btn btn-pri">${t('addW')}</button>
        </form>
      </div>
      ${datos.length ? `<div class="grid-w">${cards}</div>` :
        `<div class="panel empty">${ICON.user}<h3>${t('emp')}</h3><p>${t('empD')}</p></div>`}`;
    this.bind(root);
  },

  card(f, w, wi) {
    const p = pctOf(w.tareas), done = w.tareas.filter(x => x.hecho).length;
    const rows = w.tareas.map((x, ti) => `
      <div class="task-row">
        <input type="checkbox" ${x.hecho ? 'checked' : ''} data-act="toggle" data-w="${wi}" data-t="${ti}" aria-label="${esc(trTask(x.texto))}">
        <span class="task-lbl ${x.hecho ? 'done' : ''}" data-act="edit" data-w="${wi}" data-t="${ti}">${esc(trTask(x.texto))}</span>
        <button class="x-btn" data-act="delT" data-w="${wi}" data-t="${ti}" aria-label="${t('del')}">×</button>
      </div>`).join('');
    return `<article class="wcard">
      <div class="wcard-h">
        <h3>${esc(w.nombre)}</h3>
        <span class="pct ${pctCls(p)}">${done}/${w.tareas.length}  ${p}%</span>
      </div>
      <div class="bar"><i class="${fillCls(p)}" style="width:${p}%"></i></div>
      <div class="task-list">${rows}</div>
      <div class="add-t">
        <button type="button" class="spell" id="sh-${wi}" hidden></button>
        <input class="inp" id="ni-${wi}" placeholder="${t('tph')}" data-w="${wi}" autocomplete="off">
        <button class="btn btn-ghost btn-sm" data-act="addT" data-w="${wi}" aria-label="${t('add')}">+</button>
      </div>
      <textarea class="ta" data-note="${wi}" placeholder="${t('nph')}">${esc(w.comentarios || '')}</textarea>
      <div class="wcard-f">
        <button class="btn btn-ghost btn-sm" data-act="pdfOne" data-w="${wi}">PDF</button>
        <button class="btn btn-ghost btn-sm" data-act="rmW" data-w="${wi}">${t('del')}</button>
      </div>
    </article>`;
  },

  bind(root) {
    const f = this.date;
    $('#tDate', root).onchange = e => { if (e.target.value) { this.date = e.target.value; App.render(); } };
    $('#addW', root).onsubmit = e => {
      e.preventDefault();
      const n = $('#nomTrab', root).value.trim();
      if (!n) return;
      (DB()[f] ||= []).push({ nombre: n, tareas: DEF_TASKS.map(x => ({ texto: x, hecho: false })), comentarios: '' });
      saveData(); App.render();
      $('#nomTrab').focus();
    };
    root.onclick = async e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const w = +b.dataset.w, ti = +b.dataset.t, day = DB()[f];
      switch (b.dataset.act) {
        case 'day': this.date = shiftDate(f, +b.dataset.d); App.render(); break;
        case 'delT': day[w].tareas.splice(ti, 1); saveData(); App.render(); break;
        case 'addT': this.addTask(w); break;
        case 'edit': this.editTask(b, w, ti); break;
        case 'pdfOne': Exporter.runWith(this.exportData(w), 'pdf'); break;
        case 'rmW':
          if (await confirmDlg(t('cdel'))) { day.splice(w, 1); saveData(); App.render(); }
          break;
      }
    };
    root.onchange = e => {
      const el = e.target;
      if (el.dataset.act === 'toggle') {
        const x = DB()[f][+el.dataset.w].tareas[+el.dataset.t];
        x.hecho = el.checked; saveData(); App.render();
      } else if (el.dataset.note !== undefined) {
        DB()[f][+el.dataset.note].comentarios = el.value; saveData();
      }
    };
    root.oninput = e => {
      const el = e.target;
      if (!el.id || !el.id.startsWith('ni-')) return;
      const h = $('#sh-' + el.dataset.w, root), s = spellHint(el.value);
      if (s) { h.textContent = t('spell') + s + '?'; h.hidden = false; h.onclick = () => { el.value = s; h.hidden = true; el.focus(); }; }
      else h.hidden = true;
    };
    root.onkeydown = e => {
      if (e.key === 'Enter' && e.target.id && e.target.id.startsWith('ni-')) { e.preventDefault(); this.addTask(+e.target.dataset.w); }
    };
  },

  addTask(w) {
    const inp = $('#ni-' + w), v = inp.value.trim();
    if (!v) return;
    DB()[this.date][w].tareas.push({ texto: v, hecho: false });
    saveData(); App.render();
    $('#ni-' + w)?.focus();
  },

  editTask(el, w, ti) {
    const task = DB()[this.date][w].tareas[ti];
    const inp = document.createElement('input');
    inp.className = 'task-edit';
    inp.value = task.texto;
    let done = false;
    const commit = () => {
      if (done) return; done = true;
      task.texto = inp.value.trim() || task.texto;
      saveData(); App.render();
    };
    inp.onblur = commit;
    inp.onkeydown = e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { done = true; App.render(); } };
    el.textContent = ''; el.appendChild(inp); inp.focus();
  },

  exportData(onlyIdx) {
    const f = this.date;
    let datos = DB()[f] || [];
    if (onlyIdx !== undefined) datos = [datos[onlyIdx]].filter(Boolean);
    const done = datos.reduce((a, w) => a + w.tareas.filter(x => x.hecho).length, 0);
    const tot = datos.reduce((a, w) => a + w.tareas.length, 0);
    return {
      title: t('rDaily'),
      subtitle: fmtDateLong(f) + (onlyIdx !== undefined && datos[0] ? ' — ' + datos[0].nombre : ''),
      filename: 'tareas-' + f + (onlyIdx !== undefined && datos[0] ? '-' + datos[0].nombre : ''),
      summary: [
        [t('wlbl'), String(datos.length)],
        [t('stTasks'), done + ' / ' + tot],
        [t('thS'), (tot ? Math.round(done / tot * 100) : 0) + '%'],
      ],
      sections: [
        {
          title: t('thS'),
          head: [t('wlbl'), t('thDone'), t('thTasks'), t('thS'), t('thCmt')],
          types: ['text', 'int', 'int', 'pct', 'text'],
          body: datos.map(w => [w.nombre, w.tareas.filter(x => x.hecho).length, w.tareas.length, pctOf(w.tareas), w.comentarios || '']),
        },
        {
          title: t('thTasks'),
          head: [t('wlbl'), t('thTasks'), t('thDone')],
          types: ['text', 'text', 'text'],
          body: datos.flatMap(w => w.tareas.map(x => [w.nombre, trTask(x.texto), x.hecho ? '✓' : '—'])),
        },
      ],
      signatures: datos.map(w => w.nombre),
    };
  },
};

/* ── Reportes ──────────────────────────────────────────── */
const weekOf  = s => { const d = isoToDate(s); d.setDate(d.getDate() - d.getDay()); return d.toLocaleDateString('en-CA'); };
const monthOf = s => s.substring(0, 7);

function statsFor(dates) {
  const st = {};
  dates.forEach(fecha => (DB()[fecha] || []).forEach(w => {
    const s = st[w.nombre] ||= { total: 0, done: 0, days: 0, cmts: [] };
    s.total += w.tareas.length;
    s.done += w.tareas.filter(x => x.hecho).length;
    s.days += 1;
    if (w.comentarios && w.comentarios.trim()) s.cmts.push({ fecha, cmt: w.comentarios.trim() });
  }));
  return st;
}
function periodLabel(mode, key) {
  if (mode === 'week') {
    const s = isoToDate(key), e = isoToDate(key); e.setDate(e.getDate() + 6);
    return s.toLocaleDateString(loc(), { day: 'numeric', month: 'short' }) + ' – ' + e.toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return isoToDate(key + '-01').toLocaleDateString(loc(), { month: 'long', year: 'numeric' });
}
function periods(mode) {
  const keyOf = mode === 'week' ? weekOf : monthOf, p = {};
  Object.keys(DB()).sort().forEach(f => { if ((DB()[f] || []).length) (p[keyOf(f)] ||= []).push(f); });
  return p;
}

const Reportes = {
  title: 'mReportes', sub: 'sReportes', stores: ['data'],
  tab: 'hist',

  render(root) {
    const tabs = ['hist', 'week', 'month'].map(k =>
      `<button class="${this.tab === k ? 'active' : ''}" data-tab="${k}">${t({ hist: 'rtHist', week: 'rtWeek', month: 'rtMonth' }[k])}</button>`).join('');
    root.innerHTML = `<div class="subtabs">${tabs}</div><div id="repBody"></div>`;
    root.onclick = async e => {
      const tb = e.target.closest('[data-tab]');
      if (tb) { this.tab = tb.dataset.tab; App.render(); return; }
      const del = e.target.closest('[data-del]');
      if (del) {
        const name = decodeURIComponent(del.dataset.del);
        if (await confirmDlg(t('cdAll') + name + t('cdAll2'))) {
          Object.keys(DB()).forEach(f => { DB()[f] = DB()[f].filter(x => x.nombre !== name); });
          saveData(); App.render();
        }
      }
    };
    const body = $('#repBody', root);
    const empty = `<div class="panel empty">${ICON.chart}<h3>${t('empR')}</h3><p>${t('empRD')}</p></div>`;
    if (this.tab === 'hist') {
      const st = statsFor(Object.keys(DB())), names = Object.keys(st).sort();
      if (!names.length) { body.innerHTML = empty; return; }
      body.innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr>
        <th>${t('wlbl')}</th><th>${t('thD')}</th><th>${t('thT')}</th><th>${t('thS')}</th><th>${t('thCmt')}</th><th></th></tr></thead>
        <tbody>${names.map(n => {
          const s = st[n], p = s.total ? Math.round(s.done / s.total * 100) : 0, last = s.cmts[s.cmts.length - 1];
          return `<tr><td><b>${esc(n)}</b></td><td><span class="tag">${s.days} ${t('du')}</span></td>
            <td class="num">${Math.round(s.done / s.days)}/${Math.round(s.total / s.days)}</td>
            <td><div class="bar-w"><div class="bar"><i class="${fillCls(p)}" style="width:${p}%"></i></div><b class="${pctCls(p)} num">${p}%</b></div></td>
            <td class="cmt">${last ? esc(last.cmt) : `<span class="muted">${t('noCmt')}</span>`}</td>
            <td><button class="btn btn-ghost btn-sm" data-del="${encodeURIComponent(n)}">${t('del')}</button></td></tr>`;
        }).join('')}</tbody></table></div>`;
      return;
    }
    const p = periods(this.tab), keys = Object.keys(p).sort().reverse();
    if (!keys.length) { body.innerHTML = empty; return; }
    const cur = this.tab === 'week' ? weekOf(tod()) : monthOf(tod());
    body.innerHTML = keys.map(k => {
      const st = statsFor(p[k]);
      return `<div class="rep-period"><h4>${esc(periodLabel(this.tab, k))}${k === cur ? `<span class="tag sun">${t('current')}</span>` : ''}</h4>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('wlbl')}</th><th>${t('thS')}</th><th>${t('thT')}</th><th>${t('thCmt')}</th></tr></thead><tbody>
        ${Object.keys(st).sort().map(n => {
          const s = st[n], pc = s.total ? Math.round(s.done / s.total * 100) : 0;
          const c = s.cmts.length ? s.cmts.map(x => `<div><em>${esc(fmtDate(x.fecha))}</em> ${esc(x.cmt)}</div>`).join('') : `<span class="muted">${t('noCmt')}</span>`;
          return `<tr><td><b>${esc(n)}</b><br><span class="muted small">${s.days} ${t('du')}</span></td>
            <td><div class="bar-w"><div class="bar"><i class="${fillCls(pc)}" style="width:${pc}%"></i></div><b class="${pctCls(pc)} num">${pc}%</b></div></td>
            <td class="num">${Math.round(s.done / s.days)}/${Math.round(s.total / s.days)}</td><td class="cmt">${c}</td></tr>`;
        }).join('')}</tbody></table></div></div>`;
    }).join('');
  },

  exportData() {
    const head = [t('wlbl'), t('thD'), t('thDone'), t('thTasks'), t('thS'), t('thCmt')];
    const types = ['text', 'int', 'int', 'int', 'pct', 'text'];
    const rowsOf = st => Object.keys(st).sort().map(n => {
      const s = st[n];
      return [n, s.days, s.done, s.total, s.total ? Math.round(s.done / s.total * 100) : 0,
        s.cmts.map(x => fmtDate(x.fecha) + ': ' + x.cmt).join('\n')];
    });
    const label = t({ hist: 'rtHist', week: 'rtWeek', month: 'rtMonth' }[this.tab]);
    let sections;
    if (this.tab === 'hist') sections = [{ title: t('rtHist'), head, types, body: rowsOf(statsFor(Object.keys(DB()))) }];
    else {
      const p = periods(this.tab);
      sections = Object.keys(p).sort().reverse().map(k => ({ title: periodLabel(this.tab, k), head, types, body: rowsOf(statsFor(p[k])) }));
    }
    return { title: t('mReportes') + ': ' + t('thS'), subtitle: label, filename: 'reporte-' + this.tab + '-' + tod(), landscape: true, sections };
  },
};

App.register('tareas', Tareas);
App.register('reportes', Reportes);
