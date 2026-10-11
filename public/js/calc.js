'use strict';
/* ════════════════════════════════════════════════════════════
   Calculadora sencilla + Hoja estilo Excel
   Hoja: Descripción · Cantidad · Precio · Extendido (cant × precio)
   y la suma de todos los extendidos. Las celdas aceptan operaciones
   (12*3, 100/4, 50+10%) igual que en Excel.
   ════════════════════════════════════════════════════════════ */
(() => {
  /* ── Analizador: + − × ÷ % y paréntesis (sin eval) ─────── */
  function evalExpr(src) {
    let s = String(src ?? '').trim().replace(/^=/, '');
    if (!s) return null;
    const plain = parseNum(s);
    if (/^[\d\s.,-]+$/.test(s) && isFinite(plain)) return plain;
    s = s.replace(/×|x(?=\s*[\d(])/gi, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/,/g, '.').replace(/\s+/g, '');
    let p = 0;
    const peek = () => s[p];
    function num() {
      const m = s.slice(p).match(/^(\d+\.?\d*|\.\d+)/);
      if (!m) throw Error('num');
      p += m[0].length;
      return +m[0];
    }
    function atom() {
      if (peek() === '-') { p++; return { v: -atom().v }; }
      if (peek() === '+') { p++; return atom(); }
      let v;
      if (peek() === '(') { p++; v = add(); if (peek() === ')') p++; }
      else v = num();
      if (peek() === '%') { p++; return { v: v / 100, pct: true }; }
      return { v };
    }
    function mul() {
      let a = atom().v;
      while (peek() === '*' || peek() === '/') {
        const op = s[p++], b = atom().v;
        a = op === '*' ? a * b : a / b;
      }
      return a;
    }
    function add() {
      let a = mul();
      while (peek() === '+' || peek() === '-') {
        const op = s[p++], save = p;
        const b = atom();
        // 200 + 10% = 220 · 200 − 10% = 180 (como en una calculadora de tienda)
        if (b.pct && (p >= s.length || '+-)'.includes(peek()))) { a = op === '+' ? a + a * b.v : a - a * b.v; continue; }
        p = save;
        const r = mul();
        a = op === '+' ? a + r : a - r;
      }
      return a;
    }
    const v = add();
    if (p < s.length || !isFinite(v)) throw Error('expr');
    return v;
  }
  const tryEval = s => { try { return evalExpr(s); } catch { return undefined; } };
  const fmtRes = v => String(parseFloat(v.toPrecision(12)));

  /* ── Estado ─────────────────────────────────────────────── */
  const SKEY = 'gestRend_hoja', TKEY = 'gestRend_cinta';
  const emptyRow = () => ({ desc: '', cant: '', precio: '' });
  const newSheet = old => ({ titulo: '', moneda: old?.moneda || 'XCG', descuento: '', impuesto: '', filas: [emptyRow(), emptyRow(), emptyRow()] });
  const prods = () => App.stores.productos.data.lista || [];

  const KEYS = [
    ['C', 'ac', 'clr'], ['⌫', 'bs', 'fn'], ['%', '%', 'fn'], ['÷', '÷', 'op'],
    ['7', '7'], ['8', '8'], ['9', '9'], ['×', '×', 'op'],
    ['4', '4'], ['5', '5'], ['6', '6'], ['−', '-', 'op'],
    ['1', '1'], ['2', '2'], ['3', '3'], ['+', '+', 'op'],
    ['±', 'neg', 'fn'], ['0', '0'], ['.', '.'], ['=', 'eq', 'eq'],
  ];

  const Calc = {
    title: 'mCalc', sub: 'sCalc', stores: ['productos'],
    tool: LS.get('gestRend_calcTool2', 'hoja'),
    sheet: LS.get(SKEY, null) || newSheet(),
    tape: LS.get(TKEY, []),
    expr: '', justEval: false, ans: 0,

    saveSheet() { LS.set(SKEY, this.sheet); },

    render(root) {
      root.innerHTML = `
        <div class="subtabs">${[['hoja', 'kHoja'], ['calc', 'kBasic']].map(([k, l]) => `<button class="${this.tool === k ? 'active' : ''}" data-tool="${k}">${t(l)}</button>`).join('')}</div>
        <div id="calcBody"></div>`;
      root.querySelector('.subtabs').onclick = e => {
        const b = e.target.closest('[data-tool]');
        if (b) { this.tool = b.dataset.tool; LS.set('gestRend_calcTool2', this.tool); App.render(); }
      };
      const body = $('#calcBody', root);
      if (this.tool === 'hoja') this.renderSheet(body); else this.renderBasic(body);
    },

    /* ════════════ Hoja estilo Excel ════════════ */
    calcSheet() {
      const sh = this.sheet;
      const rows = sh.filas.map(f => {
        const c = tryEval(f.cant), pr = tryEval(f.precio);
        const cant = c ?? 0, precio = pr ?? 0;
        return { cant, precio, ext: Math.round(cant * precio * 100) / 100, badC: c === undefined, badP: pr === undefined };
      });
      const subtotal = rows.reduce((a, r) => a + r.ext, 0);
      const dPct = tryEval(sh.descuento) || 0, iPct = tryEval(sh.impuesto) || 0;
      const descuento = Math.round(subtotal * dPct) / 100;
      const impuesto = Math.round((subtotal - descuento) * iPct) / 100;
      const total = subtotal - descuento + impuesto;
      return { rows, qty: rows.reduce((a, r) => a + r.cant, 0), subtotal, dPct, iPct, descuento, impuesto, total };
    },

    renderSheet(body, focus) {
      const sh = this.sheet, cur = sh.moneda;
      const r = this.calcSheet();
      const m = v => money(Math.round(v * 100), cur);
      body.innerHTML = `
        <div class="sheet-bar">
          <input class="inp grow" id="shTitle" placeholder="${t('sheetTitlePh')}" value="${esc(sh.titulo)}">
          <div class="seg" id="shCur">${['XCG', 'USD'].map(c => `<button type="button" data-v="${c}" class="${cur === c ? 'active' : ''}">${c}</button>`).join('')}</div>
          <button class="btn btn-ghost" id="shAdd">${t('addRow')}</button>
          <button class="btn btn-ghost" id="shNew">${t('newSheet')}</button>
        </div>
        <div class="sheet-wrap">
          <table class="sheet">
            <thead><tr><th class="rn">#</th><th>${t('colDesc')}</th><th class="r w-num">${t('colQty')}</th><th class="r w-num">${t('colPrice')}</th><th class="r w-ext">${t('colExt')}</th><th class="w-x"></th></tr></thead>
            <tbody>${sh.filas.map((f, i) => `<tr>
              <td class="rn">${i + 1}</td>
              <td><input class="cell" data-r="${i}" data-c="desc" value="${esc(f.desc)}" list="prodNames" autocomplete="off" aria-label="${t('colDesc')} ${i + 1}"></td>
              <td><input class="cell r num ${r.rows[i].badC ? 'bad' : ''}" data-r="${i}" data-c="cant" value="${esc(f.cant)}" inputmode="decimal" autocomplete="off" aria-label="${t('colQty')} ${i + 1}"></td>
              <td><input class="cell r num ${r.rows[i].badP ? 'bad' : ''}" data-r="${i}" data-c="precio" value="${esc(f.precio)}" inputmode="decimal" autocomplete="off" aria-label="${t('colPrice')} ${i + 1}"></td>
              <td class="ext r num" id="ext-${i}">${r.rows[i].ext ? m(r.rows[i].ext) : ''}</td>
              <td><button class="x-btn" data-rm="${i}" aria-label="${t('del')}">×</button></td>
            </tr>`).join('')}</tbody>
            <tfoot><tr><td></td><td>${t('total')}</td><td class="r num" id="sumQty">${fmtRes(r.qty)}</td><td></td><td class="r num" id="sumExt">${m(r.subtotal)}</td><td></td></tr></tfoot>
          </table>
          <datalist id="prodNames">${prods().map(p => `<option value="${esc(p.nombre)}">`).join('')}</datalist>
        </div>
        <div class="sheet-foot">
          <p class="small muted">${t('sheetHint')}</p>
          <div class="sheet-totals">
            <div class="t-line"><span>${t('subtotal')}</span><b class="num" id="stSub">${m(r.subtotal)}</b></div>
            <div class="t-line"><label for="shDesc">${t('discountP')}</label><span class="row" style="flex-wrap:nowrap;gap:8px"><input class="inp num r pct-in" id="shDesc" inputmode="decimal" value="${esc(sh.descuento)}" placeholder="0"><b class="num" id="stDesc">${r.descuento ? '−' + m(r.descuento) : ''}</b></span></div>
            <div class="t-line"><label for="shImp">${t('taxP')}</label><span class="row" style="flex-wrap:nowrap;gap:8px"><input class="inp num r pct-in" id="shImp" inputmode="decimal" value="${esc(sh.impuesto)}" placeholder="0"><b class="num" id="stImp">${r.impuesto ? m(r.impuesto) : ''}</b></span></div>
            <div class="t-result"><span>${t('total')}</span><b class="num" id="stTot">${m(r.total)}</b></div>
            <span class="small muted" id="stEq">${t('equiv')} ${cur === 'XCG' ? money(App.modules.caja.conv(Math.round(r.total * 100), 'XCG', 'USD'), 'USD') : money(App.modules.caja.conv(Math.round(r.total * 100), 'USD', 'XCG'), 'XCG')}</span>
          </div>
        </div>`;

      const refresh = () => {
        const x = this.calcSheet();
        x.rows.forEach((row, i) => {
          const el = $('#ext-' + i, body); if (el) el.textContent = row.ext ? m(row.ext) : '';
          $(`[data-r="${i}"][data-c="cant"]`, body)?.classList.toggle('bad', row.badC);
          $(`[data-r="${i}"][data-c="precio"]`, body)?.classList.toggle('bad', row.badP);
        });
        $('#sumQty', body).textContent = fmtRes(x.qty);
        $('#sumExt', body).textContent = m(x.subtotal);
        $('#stSub', body).textContent = m(x.subtotal);
        $('#stDesc', body).textContent = x.descuento ? '−' + m(x.descuento) : '';
        $('#stImp', body).textContent = x.impuesto ? m(x.impuesto) : '';
        $('#stTot', body).textContent = m(x.total);
        const o = cur === 'XCG' ? 'USD' : 'XCG';
        $('#stEq', body).textContent = t('equiv') + ' ' + money(App.modules.caja.conv(Math.round(x.total * 100), cur, o), o);
      };
      const rerender = (r0, c0) => { this.saveSheet(); this.renderSheet(body, [r0, c0]); };
      const ensureRow = i => { while (sh.filas.length <= i) sh.filas.push(emptyRow()); };

      body.oninput = e => {
        const el = e.target;
        if (el.dataset.c) {
          const i = +el.dataset.r;
          sh.filas[i][el.dataset.c] = el.value;
          this.saveSheet(); refresh();
          // Al escribir en la última fila aparece otra vacía, como en Excel
          if (i === sh.filas.length - 1 && el.value.trim()) {
            sh.filas.push(emptyRow());
            const pos = el.selectionStart;
            rerender(i, el.dataset.c);
            const n = $(`[data-r="${i}"][data-c="${el.dataset.c}"]`, body);
            try { n.setSelectionRange(pos, pos); } catch { /* sin cursor en este tipo */ }
          }
        } else if (el.id === 'shTitle') { sh.titulo = el.value; this.saveSheet(); }
        else if (el.id === 'shDesc') { sh.descuento = el.value; this.saveSheet(); refresh(); }
        else if (el.id === 'shImp') { sh.impuesto = el.value; this.saveSheet(); refresh(); }
      };
      body.onchange = e => {
        const el = e.target;
        if (!el.dataset.c) return;
        const i = +el.dataset.r, f = sh.filas[i];
        // Descripción igual a un producto → se rellena su precio
        if (el.dataset.c === 'desc') {
          const p = prods().find(x => x.nombre.toLowerCase() === el.value.trim().toLowerCase());
          if (p && !f.precio) {
            f.precio = (App.modules.caja.conv(p.precio, p.moneda, cur) / 100).toFixed(2);
            if (!f.cant) f.cant = '1';
            rerender(i, 'cant');
          }
          return;
        }
        // Una operación (12*3) se reemplaza por su resultado al salir de la celda
        const v = tryEval(el.value);
        if (v !== undefined && v !== null && /[*/+×÷%()]|.-/.test(el.value.trim().replace(/^=/, ''))) {
          f[el.dataset.c] = fmtRes(v); el.value = f[el.dataset.c]; this.saveSheet(); refresh();
        }
      };
      body.onkeydown = e => {
        const el = e.target;
        if (!el.dataset.c) return;
        const i = +el.dataset.r, c = el.dataset.c;
        let to = null;
        if (e.key === 'Enter' || (e.key === 'ArrowDown' && c !== 'desc')) to = i + 1;
        else if (e.key === 'ArrowUp' && c !== 'desc') to = i - 1;
        if (to === null || to < 0) return;
        e.preventDefault();
        el.dispatchEvent(new Event('change', { bubbles: true }));
        if (to >= sh.filas.length) { ensureRow(to); rerender(to, c); return; }
        $(`[data-r="${to}"][data-c="${c}"]`, body)?.focus();
      };
      body.onclick = async e => {
        const rm = e.target.closest('[data-rm]');
        if (rm) {
          sh.filas.splice(+rm.dataset.rm, 1);
          if (!sh.filas.length) sh.filas.push(emptyRow());
          rerender(); return;
        }
        if (e.target.closest('#shAdd')) { sh.filas.push(emptyRow()); rerender(sh.filas.length - 1, 'desc'); return; }
        if (e.target.closest('#shNew') && await confirmDlg(t('cNewSheet'), t('newSheet'))) { this.sheet = newSheet(sh); this.saveSheet(); App.render(); return; }
        const cb = e.target.closest('#shCur [data-v]');
        if (cb) { sh.moneda = cb.dataset.v; rerender(); }
      };
      if (focus && focus[0] !== undefined) $(`[data-r="${focus[0]}"][data-c="${focus[1]}"]`, body)?.focus();
    },

    /* ════════════ Calculadora básica con cinta ════════════ */
    renderBasic(body) {
      body.innerHTML = `
        <div class="calc-wrap sci-mode">
          <div class="sci basic">
            <div class="screen">
              <input class="expr" id="expr" autocomplete="off" spellcheck="false" inputmode="decimal" aria-label="${t('operation')}" value="${esc(this.expr)}">
              <div class="res" id="res" aria-live="polite">0</div>
            </div>
            <div class="keys">${KEYS.map(([l, a, c = '']) => `<button class="key ${c}" data-k="${esc(a)}">${l}</button>`).join('')}</div>
            <p class="small" style="margin-top:10px;color:#8fb3b8">${t('kbdHint')}</p>
          </div>
          <div class="panel">
            <div class="panel-h"><h3>${t('tape')}</h3><button class="btn btn-ghost btn-sm" id="tapeClr">${t('clear')}</button></div>
            <div class="hist" id="tape"></div>
          </div>
        </div>`;
      const inp = $('#expr', body);
      this.renderTape();
      this.preview();
      inp.oninput = () => { this.expr = inp.value; this.justEval = false; this.preview(); };
      inp.onkeydown = e => {
        if (e.key === 'Enter') { e.preventDefault(); this.cmd('eq'); }
        else if (e.key === 'Escape') { e.preventDefault(); this.cmd('ac'); }
      };
      $('.keys', body).onclick = e => { const k = e.target.closest('[data-k]'); if (k) this.key(k.dataset.k); };
      $('#tape', body).onclick = e => {
        const b = e.target.closest('[data-h]'); if (!b) return;
        this.expr = this.tape[+b.dataset.h].res; this.justEval = false;
        inp.value = this.expr; this.preview(); inp.focus();
      };
      $('#tapeClr', body).onclick = async () => {
        if (await confirmDlg(t('cHist'), t('clear'))) { this.tape = []; LS.set(TKEY, []); this.renderTape(); }
      };
      if (matchMedia('(pointer:fine)').matches) inp.focus();
    },

    renderTape() {
      const el = $('#tape'); if (!el) return;
      el.innerHTML = this.tape.length
        ? this.tape.map((h, i) => `<button class="hist-item" data-h="${i}"><small>${esc(h.op)} =</small><b>${esc(h.res)}</b></button>`).join('')
        : `<p class="muted small" style="padding:8px">${t('tapeEmpty')}</p>`;
    },

    key(k) {
      if (['ac', 'bs', 'neg', 'eq'].includes(k)) return this.cmd(k);
      const inp = $('#expr');
      if (this.justEval) {
        this.expr = /^[+\-×÷%]/.test(k) ? fmtRes(this.ans) : '';
        inp.value = this.expr;
        this.justEval = false;
      }
      const a = inp.selectionStart ?? inp.value.length, b = inp.selectionEnd ?? inp.value.length;
      inp.value = inp.value.slice(0, a) + k + inp.value.slice(b);
      inp.setSelectionRange(a + k.length, a + k.length);
      this.expr = inp.value;
      if (matchMedia('(pointer:fine)').matches) inp.focus();
      this.preview();
    },

    preview() {
      const res = $('#res'); if (!res) return;
      res.classList.remove('err');
      const v = tryEval(this.expr);
      if (v === null || v === undefined) {
        if (!this.expr.trim()) res.textContent = '0';
        else if (this.justEval) { res.textContent = t('calcErr'); res.classList.add('err'); }
        res.style.opacity = this.justEval ? 1 : .55;
        return;
      }
      res.textContent = fmtNum(v, Number.isInteger(+fmtRes(v)) ? 0 : Math.min(10, (fmtRes(v).split('.')[1] || '').length));
      res.style.opacity = this.justEval ? 1 : .55;
    },

    cmd(c) {
      const inp = $('#expr');
      if (c === 'eq') {
        const v = tryEval(this.expr);
        this.justEval = true;
        if (v !== undefined && v !== null) {
          this.ans = v;
          const res = fmtRes(v), last = this.tape[0];
          if (!last || last.op !== this.expr || last.res !== res) {
            this.tape.unshift({ ts: Date.now(), op: this.expr, res });
            this.tape = this.tape.slice(0, 200);
            LS.set(TKEY, this.tape);
            this.renderTape();
          }
        }
        this.preview();
        if (v === undefined) this.justEval = false;
        return;
      }
      if (c === 'ac') { this.expr = ''; this.justEval = false; }
      else if (c === 'bs') { this.expr = this.justEval ? '' : this.expr.slice(0, -1); this.justEval = false; }
      else if (c === 'neg') {
        const e = this.justEval ? fmtRes(this.ans) : this.expr;
        this.expr = /^-\(.*\)$/.test(e) ? e.slice(2, -1) : e ? '-(' + e + ')' : '-';
        this.justEval = false;
      }
      inp.value = this.expr;
      this.preview();
      inp.focus();
    },

    /* ════════════ Exportar ════════════ */
    exportData() {
      if (this.tool === 'calc') {
        return {
          title: t('tape'), subtitle: fmtDateLong(tod()), filename: 'calculadora-' + tod(),
          sections: [{ title: t('tape'), head: [t('date'), t('operation'), t('result')], types: ['text', 'text', 'text'],
            body: this.tape.map(h => [fmtDateTime(h.ts), h.op, h.res]) }],
        };
      }
      const sh = this.sheet, r = this.calcSheet(), cur = sh.moneda;
      const filas = sh.filas.map((f, i) => ({ f, x: r.rows[i] })).filter(({ f, x }) => f.desc.trim() || x.cant || x.precio);
      const summary = [[t('subtotal'), money(Math.round(r.subtotal * 100), cur)]];
      if (r.descuento) summary.push([t('discountP') + ' (' + r.dPct + '%)', '−' + money(Math.round(r.descuento * 100), cur)]);
      if (r.impuesto) summary.push([t('taxP') + ' (' + r.iPct + '%)', money(Math.round(r.impuesto * 100), cur)]);
      summary.push([t('total'), money(Math.round(r.total * 100), cur)]);
      return {
        title: sh.titulo || t('sheetRep'), subtitle: fmtDateLong(tod()) + (App.stores.config.data.empresa_nombre ? ' — ' + App.stores.config.data.empresa_nombre : ''),
        filename: 'hoja-' + (sh.titulo || tod()),
        summary,
        sections: [{
          title: t('kHoja'),
          head: ['#', t('colDesc'), t('colQty'), t('colPrice') + ' ' + cur, t('colExt') + ' ' + cur],
          types: ['int', 'text', 'num', 'money', 'money'],
          // En Excel el extendido y el total quedan como fórmulas de verdad
          body: filas.map(({ f, x }, i) => [i + 1, f.desc, x.cant, x.precio, { v: x.ext, f: 'C{r}*D{r}' }]),
          foot: [t('total'), '', { v: r.qty, f: 'SUM(C{r0}:C{r1})' }, '', { v: r.subtotal, f: 'SUM(E{r0}:E{r1})' }],
        }],
      };
    },
  };

  /* Teclado físico en la calculadora cuando el foco no está en un campo */
  document.addEventListener('keydown', e => {
    if (App.mod !== 'calc' || Calc.tool !== 'calc' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || !$('#modal').hidden) return;
    const map = { '*': '×', '/': '÷' };
    if (/^[0-9+\-*/().%]$/.test(e.key)) { e.preventDefault(); Calc.key(map[e.key] || e.key); }
    else if (e.key === 'Enter') { e.preventDefault(); Calc.cmd('eq'); }
    else if (e.key === 'Backspace') { e.preventDefault(); Calc.cmd('bs'); }
    else if (e.key === 'Escape') Calc.cmd('ac');
  });

  window.MathEngine = { evalExpr };
  App.register('calc', Calc);
})();
