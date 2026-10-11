'use strict';
/* ════════════════════════════════════════════════════════════
   Caja registradora — dólar (USD) y florín caribeño (XCG)
   Todo en centavos. Cada movimiento guarda cuánto efectivo entró
   o salió físicamente de cada moneda (cash.USD / cash.XCG).
   ════════════════════════════════════════════════════════════ */
(() => {
  const C = () => App.stores.caja.data;
  const saveCaja = () => App.stores.caja.save();
  let saveTimer = null;
  const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveCaja, 600); };
  const OTHER = { USD: 'XCG', XCG: 'USD' };
  const sumCount = counts => Object.entries(counts || {}).reduce((a, [d, n]) => a + (+d) * (+n || 0), 0);
  const curName = c => c === 'USD' ? t('usdName') + ' (USD)' : t('xcgName') + ' (XCG)';

  function conv(cents, from, to) {
    if (from === to) return cents;
    const r = C().tasa || 1.79;
    return from === 'USD' ? Math.round(cents * r) : Math.round(cents / r);
  }

  /* Billete o moneda volando desde el botón hasta el cajón */
  function fly(svg, a, b, coin) {
    if (reducedMotion()) return Promise.resolve();
    const g = document.createElement('div');
    g.className = 'fly';
    g.innerHTML = svg;
    Object.assign(g.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
    document.body.appendChild(g);
    const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
    const dy = (b.top + b.height / 2) - (a.top + a.height / 2);
    const s = (b.width / a.width).toFixed(3), r = (Math.random() * 14 - 7).toFixed(1), P = 'perspective(700px) ';
    const frames = coin ? [
      { transform: P + 'translate(0,0) rotateY(0) scale(1)' },
      { transform: P + `translate(${dx * .5}px,${dy * .5 - 110}px) rotateY(540deg) scale(1.4)`, offset: .5 },
      { transform: P + `translate(${dx}px,${dy}px) rotateY(1080deg) scale(${s})` },
    ] : [
      { transform: P + 'translate(0,0) scale(1) rotate(0)' },
      { transform: P + 'translate(0,-34px) scale(1.6) rotate(-3deg)', offset: .3 },
      { transform: P + 'translate(0,-34px) scale(1.6) rotate(2deg) rotateX(0)', offset: .46 },
      { transform: P + `translate(${dx}px,${dy}px) scale(${s}) rotate(${r}deg) rotateX(35deg)` },
    ];
    const anim = g.animate(frames, { duration: coin ? 760 : 980, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'forwards' });
    return anim.finished.then(() => g.remove(), () => g.remove());
  }
  const rectOf = (el, w, h) => {
    const r = el.getBoundingClientRect();
    return w ? { left: r.left + r.width / 2 - w / 2, top: r.top + r.height / 2 - h / 2, width: w, height: h } : r;
  };

  const newSale = old => ({
    priceCur: old?.priceCur || 'XCG', padCur: old?.padCur || 'USD', changeCur: old?.changeCur || 'XCG',
    due: '', concepto: '', cliente: '', metodo: 'cash', recv: { USD: {}, XCG: {} }, items: [],
    paid: '', paidCur: old?.paidCur || 'XCG',   // monto escrito a mano que entrega el cliente
  });
  const CFG = () => App.stores.config.data;
  const prodList = () => App.stores.productos.data.lista || [];

  const Caja = {
    title: 'mCaja', sub: 'sCaja', stores: ['caja', 'productos'],
    tab: LS.get('gestRend_cajaTab', 'cobrar'),
    sale: Object.assign(newSale(), LS.get('gestRend_sale', {})),
    posQ: '',
    movDate: tod(),
    lastSig: '',
    conv,

    /* ── Cálculos compartidos (también los usa Inicio) ─── */
    dayMovs(f) { return C().movs.filter(m => m.fecha === f).sort((a, b) => a.ts - b.ts); },
    expected(cur, f = tod()) {
      return (C().fondo[cur] || 0) + this.dayMovs(f).reduce((a, m) => a + (m.cash?.[cur] || 0), 0);
    },
    daySales(f) {
      const v = this.dayMovs(f).filter(m => m.tipo === 'venta');
      return { n: v.length, totalXCG: v.reduce((a, m) => a + conv(m.total, m.moneda, 'XCG'), 0) };
    },
    saveSale() { LS.set('gestRend_sale', this.sale); },

    render(root) {
      const tabs = [['cobrar', 'cCobrar'], ['arqueo', 'cArqueo'], ['movs', 'cMovs']]
        .map(([k, l]) => `<button class="${this.tab === k ? 'active' : ''}" data-tab="${k}">${t(l)}</button>`).join('');
      root.innerHTML = `
        <div class="caja-top">
          <div class="subtabs" style="margin:0;flex:1;min-width:260px">${tabs}</div>
          <label class="rate" title="${esc(t('rateHint'))}">${t('rate')}
            <input class="inp" id="tasa" inputmode="decimal" value="${C().tasa}"> XCG</label>
        </div>
        <div id="cajaBody"></div>`;
      $('#tasa', root).onchange = e => {
        const v = parseNum(e.target.value);
        if (v > 0) { C().tasa = v; saveCaja(); }
        App.render();
      };
      root.onclick = e => {
        const tb = e.target.closest('[data-tab]');
        if (tb) { this.tab = tb.dataset.tab; LS.set('gestRend_cajaTab', this.tab); App.render(); }
      };
      const body = $('#cajaBody', root);
      if (this.tab === 'cobrar') this.renderPos(body);
      else if (this.tab === 'arqueo') this.renderArqueo(body);
      else this.renderMovs(body);
    },

    /* ════════════ Cobrar ════════════ */
    renderPos(body) {
      const s = this.sale, pc = s.padCur;
      const seg = (id, val, opts) => `<div class="seg" id="${id}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" class="${val === v ? 'active' : ''}">${l}</button>`).join('')}</div>`;
      const bills = Money[pc].bills.map(d => `<button class="bill-btn ${pc === 'XCG' ? 'xcg' : ''}" data-add="${d}" aria-label="${Money.label(pc, d)}">${Billetes.svg(pc, d)}</button>`).join('');
      const coins = Money[pc].coins.map(d => {
        const z = Billetes.size(pc, d, 150).w;
        return `<button class="coin-btn" data-add="${d}" style="width:${z}px;height:${z}px" aria-label="${Money.label(pc, d)}">${Billetes.svg(pc, d)}</button>`;
      }).join('');
      const card = s.metodo === 'card';
      s.items ||= [];
      body.innerHTML = `
        <div class="pos">
          <div class="pos-left">
          <div class="panel">
            <div class="panel-h"><h3>${t('mProductos')}</h3>
              ${prodList().length ? `<input class="inp" id="posQ" placeholder="${t('searchProd')}" value="${esc(this.posQ)}" autocomplete="off" style="max-width:280px;flex:1">` : ''}</div>
            <div class="pos-prods" id="posProds"></div>
          </div>
          <div class="money-pad" style="${card ? 'opacity:.4;pointer-events:none' : ''}">
            <div class="panel">
              <div class="panel-h"><h3>${t('payWith')}</h3>${seg('padCur', pc, [['USD', 'USD $'], ['XCG', 'XCG Cg']])}</div>
              <div class="lbl" style="margin-bottom:8px">${t('bills')}</div>
              <div class="bills" id="pad">${bills}</div>
              <div class="lbl" style="margin:16px 0 8px">${t('coins')}</div>
              <div class="coins" id="padCoins">${coins}</div>
            </div>
            <div class="tray" id="tray"></div>
          </div>
          </div>
          <aside class="ticket">
            <div class="row" style="justify-content:space-between"><span class="lbl">${t('priceIn')}</span>${seg('priceCur', s.priceCur, [['XCG', 'XCG'], ['USD', 'USD']])}</div>
            <div id="cartBox"></div>
            <div class="field">
              <label for="due">${t('due')} (${s.priceCur})</label>
              <input id="due" class="inp inp-big num" inputmode="decimal" autocomplete="off" placeholder="0.00" value="${esc(s.due)}">
              <span class="small muted" id="dueEq"></span>
            </div>
            <input id="concepto" class="inp" placeholder="${t('concept')}" value="${esc(s.concepto)}">
            <div class="row">
              <input id="cliente" class="inp grow" placeholder="${t('customer')}" value="${esc(s.cliente)}" aria-label="${t('customer')}">
              <input id="cajeroPos" class="inp grow" placeholder="${t('cashier')}" value="${esc(LS.get('gestRend_cajero', ''))}" aria-label="${t('cashier')}">
            </div>
            <div class="row" style="justify-content:space-between"><span class="lbl">${t('method')}</span>${seg('metodo', s.metodo, [['cash', t('cash')], ['card', t('card')]])}</div>
            ${card ? '' : `<div class="field">
              <label for="paid">${t('paidLbl')}</label>
              <div class="row" style="flex-wrap:nowrap">
                <input id="paid" class="inp inp-big num" inputmode="decimal" autocomplete="off" placeholder="0.00" value="${esc(s.paid)}">
                ${seg('paidCur', s.paidCur, [['XCG', 'XCG'], ['USD', 'USD']])}
              </div>
              <div class="quick-pay" id="quickPay"></div>
              <span class="small muted">${t('paidHint')}</span>
            </div>`}
            <div class="t-lines" id="tLines"></div>
            <div class="t-result" id="tRes"></div>
            <div id="giveWrap" class="row" style="justify-content:space-between"><span class="lbl">${t('giveIn')}</span>${seg('changeCur', s.changeCur, [['XCG', 'XCG'], ['USD', 'USD']])}</div>
            <div class="change-list" id="changeList"></div>
            <div class="row">
              <button class="btn btn-sun btn-lg grow" id="btnReg">${t('register')}</button>
              <button class="btn btn-ghost btn-lg" id="btnNew">${t('newSale')}</button>
            </div>
          </aside>
        </div>`;
      this.lastSig = '';
      this.renderTray();
      this.updateTicket();

      const segBind = (id, key, rerender) => {
        $('#' + id, body).onclick = e => {
          const b = e.target.closest('[data-v]'); if (!b) return;
          s[key] = b.dataset.v; this.saveSale();
          if (rerender) App.render();
          else { $$('#' + id + ' button', body).forEach(x => x.classList.toggle('active', x === b)); this.updateTicket(); }
        };
      };
      segBind('padCur', 'padCur', true);
      segBind('priceCur', 'priceCur', true);
      segBind('metodo', 'metodo', true);
      segBind('changeCur', 'changeCur', false);

      $('#due', body).oninput = e => { s.due = e.target.value; this.saveSale(); this.updateTicket(); };
      $('#due', body).onkeydown = e => { if (e.key === 'Enter') this.register(); };
      $('#concepto', body).oninput = e => { s.concepto = e.target.value; this.saveSale(); };
      $('#cliente', body).oninput = e => { s.cliente = e.target.value; this.saveSale(); };
      if (!card) {
        segBind('paidCur', 'paidCur', false);
        $('#paid', body).oninput = e => { s.paid = e.target.value; this.saveSale(); this.updateTicket(); };
        $('#paid', body).onkeydown = e => { if (e.key === 'Enter') this.register(); };
        $('#quickPay', body).onclick = e => {
          const b = e.target.closest('[data-qp]'); if (!b) return;
          s.paid = b.dataset.qp; $('#paid').value = s.paid; this.saveSale(); this.updateTicket();
        };
      }
      $('#cajeroPos', body).oninput = e => LS.set('gestRend_cajero', e.target.value);

      // Productos: tocar agrega al carrito; Enter agrega el único resultado o el código exacto (lector de barras)
      this.renderPick();
      const q = $('#posQ', body);
      if (q) {
        q.oninput = () => { this.posQ = q.value; this.renderPick(); };
        q.onkeydown = e => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const v = q.value.trim().toLowerCase(), list = this.pickList();
          const p = prodList().find(x => (x.codigo || '').toLowerCase() === v) || (list.length === 1 ? list[0] : null);
          if (p) { this.addItem(p, $(`[data-pid="${p.id}"]`)); q.value = ''; this.posQ = ''; this.renderPick(); }
        };
      }
      $('#posProds', body).onclick = e => {
        const b = e.target.closest('[data-pid]');
        if (b) { const p = prodList().find(x => x.id === b.dataset.pid); if (p) this.addItem(p, b); return; }
        if (e.target.closest('[data-goprods]')) App.show('productos');
      };
      $('#cartBox', body).onclick = e => {
        const q2 = e.target.closest('[data-cq]'), rm = e.target.closest('[data-crm]');
        if (q2) { const it = s.items[+q2.dataset.i]; it.cantidad = Math.max(1, it.cantidad + (+q2.dataset.cq)); }
        else if (rm) s.items.splice(+rm.dataset.crm, 1);
        else return;
        this.saveSale(); this.updateTicket();
      };
      $('#btnReg', body).onclick = () => this.register();
      $('#btnNew', body).onclick = () => { this.sale = newSale(s); this.saveSale(); App.render(); };

      $('.money-pad', body).onclick = e => {
        const add = e.target.closest('[data-add]');
        if (add) return this.addPiece(add, pc, +add.dataset.add);
        const pile = e.target.closest('.pile');
        if (pile) this.removePiece(pile, pile.dataset.cur, +pile.dataset.den);
      };
    },

    renderTray() {
      const tray = $('#tray'); if (!tray) return;
      const s = this.sale;
      const piles = [];
      for (const cur of ['USD', 'XCG']) {
        for (const d of Money.all(cur)) {
          const n = s.recv[cur][d] || 0;
          if (!n) continue;
          const z = Billetes.size(cur, d, 96), svg = Billetes.svg(cur, d);
          let layers = '';
          for (let i = 0; i < Math.min(n, 5); i++)
            layers += `<span class="layer" style="width:${z.w}px;height:${z.h}px;transform:translate(${i * 2}px,${-i * 3}px) rotate(${(i % 2 ? 1 : -1) * i * 1.3}deg);z-index:${i}">${svg}</span>`;
          piles.push(`<button class="pile" data-cur="${cur}" data-den="${d}" style="width:${z.w + 10}px;height:${z.h + 14}px" aria-label="${Money.label(cur, d)} × ${n}">${layers}<b class="badge">×${n}</b></button>`);
        }
      }
      const tot = conv(sumCount(s.recv.USD), 'USD', s.priceCur) + conv(sumCount(s.recv.XCG), 'XCG', s.priceCur);
      tray.innerHTML = `
        <div class="tray-h"><span>${t('drawer')}</span><b>${money(tot, s.priceCur)}</b></div>
        <div class="tray-slots" id="traySlots">${piles.join('') || `<span class="tray-empty">${t('trayEmpty')}</span>`}</div>
        ${piles.length ? `<div class="tray-h" style="margin:10px 0 0;font-size:.8rem;opacity:.8">${t('trayHint')}</div>` : ''}`;
    },

    addPiece(btn, cur, den) {
      const s = this.sale;
      s.recv[cur][den] = (s.recv[cur][den] || 0) + 1;
      this.saveSale();
      this.updateTicket();
      const coin = Money.isCoin(cur, den), z = Billetes.size(cur, den, 96);
      const pile = $(`.pile[data-cur="${cur}"][data-den="${den}"]`);
      const target = pile ? rectOf(pile, z.w, z.h) : rectOf($('#traySlots'), z.w, z.h);
      fly(Billetes.svg(cur, den), btn.getBoundingClientRect(), target, coin).then(() => {
        this.renderTray();
        const p = $(`.pile[data-cur="${cur}"][data-den="${den}"]`);
        if (p) { p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }
      });
    },

    removePiece(pile, cur, den) {
      const s = this.sale;
      if (!s.recv[cur][den]) return;
      s.recv[cur][den]--;
      if (!s.recv[cur][den]) delete s.recv[cur][den];
      this.saveSale();
      const from = pile.getBoundingClientRect();
      const btn = s.padCur === cur ? $(`[data-add="${den}"]`) : null;
      this.renderTray();
      this.updateTicket();
      if (btn) fly(Billetes.svg(cur, den), from, btn.getBoundingClientRect(), Money.isCoin(cur, den));
    },

    /* ── Productos en el cobro ─── */
    pickList() {
      const q = this.posQ.trim().toLowerCase();
      return prodList().filter(p => !q || p.nombre.toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q) || (p.categoria || '').toLowerCase().includes(q))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    },
    renderPick() {
      const box = $('#posProds'); if (!box) return;
      const pc = this.sale.priceCur;
      if (!prodList().length) {
        box.innerHTML = `<p class="muted small">${t('noProdsPos')} <button class="btn btn-ghost btn-sm" data-goprods>${t('goProds')}</button></p>`;
        return;
      }
      const list = this.pickList();
      box.innerHTML = list.length ? list.map(p => `
        <button class="pos-prod" data-pid="${p.id}" title="${esc(p.nombre)}">
          ${App.modules.productos.thumb(p, 'pp-img')}
          <span class="pp-name">${esc(p.nombre)}</span>
          <b class="num">${money(conv(p.precio, p.moneda, pc), pc)}</b>
        </button>`).join('') : `<p class="muted small">—</p>`;
    },
    addItem(p, fromEl) {
      const s = this.sale;
      const it = s.items.find(i => i.pid === p.id);
      if (it) it.cantidad++;
      else s.items.push({ pid: p.id, codigo: p.codigo || '', nombre: p.nombre, precio: p.precio, moneda: p.moneda, imagen: p.imagen || '', cantidad: 1 });
      this.saveSale();
      this.updateTicket();
      const target = $('#cartBox');
      const img = fromEl && fromEl.querySelector('.pp-img');
      if (img && target && !reducedMotion()) {
        const a = img.getBoundingClientRect(), b = target.getBoundingClientRect();
        const g = document.createElement('div');
        g.className = 'fly'; g.innerHTML = img.outerHTML;
        Object.assign(g.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
        document.body.appendChild(g);
        const dx = b.left + 30 - (a.left + a.width / 2), dy = b.top + 20 - (a.top + a.height / 2);
        g.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx}px,${dy}px) scale(.4)`, opacity: .3 }],
          { duration: 520, easing: 'cubic-bezier(.4,0,.2,1)' }).finished.then(() => g.remove(), () => g.remove());
      }
    },
    /* Precio de una línea del carrito en la moneda de la venta */
    linePrice(it, pc) { return conv(it.precio, it.moneda, pc); },

    calcSale() {
      const s = this.sale, pc = s.priceCur, items = s.items || [];
      let subtotal = 0, impuesto = 0, pct = 0, due;
      if (items.length) {
        subtotal = items.reduce((a, it) => a + this.linePrice(it, pc) * it.cantidad, 0);
        pct = CFG().impuesto_activo ? (+CFG().impuesto_porcentaje || 0) : 0;
        impuesto = Math.round(subtotal * pct / 100);
        due = subtotal + impuesto;
      } else due = Math.max(0, toCents(s.due));
      // Lo que entrega el cliente: billetes tocados + monto escrito a mano
      const manual = { USD: 0, XCG: 0 };
      if (s.metodo === 'cash') manual[s.paidCur || 'XCG'] = Math.max(0, toCents(s.paid));
      const rUSD = sumCount(s.recv.USD) + manual.USD, rXCG = sumCount(s.recv.XCG) + manual.XCG;
      const recv = s.metodo === 'card' ? due : conv(rUSD, 'USD', pc) + conv(rXCG, 'XCG', pc);
      const diff = recv - due;
      const change = diff > 0 && s.metodo === 'cash' ? conv(diff, pc, s.changeCur) : 0;
      return { pc, due, subtotal, impuesto, pct, rUSD, rXCG, manual, recv, diff, change };
    },

    /* Botones rápidos: pago exacto y los billetes redondos siguientes */
    renderQuickPay(r) {
      const box = $('#quickPay'); if (!box) return;
      const cur = this.sale.paidCur || 'XCG';
      const due = conv(r.due, r.pc, cur);
      if (!due) { box.innerHTML = ''; return; }
      const opts = [due];
      for (const step of [500, 1000, 2000, 5000, 10000, 20000, 50000]) {
        const v = Math.ceil(due / step) * step;
        if (v > due && !opts.includes(v)) opts.push(v);
        if (opts.length >= 5) break;
      }
      box.innerHTML = opts.map((v, i) => `<button type="button" class="chip" data-qp="${(v / 100).toFixed(2)}">${i === 0 ? t('exactBtn') + ' ' : ''}${money(v, cur)}</button>`).join('');
    },

    renderCart(r) {
      const s = this.sale, box = $('#cartBox'), dueIn = $('#due');
      if (!box) return;
      const items = s.items || [];
      dueIn.readOnly = !!items.length;
      dueIn.closest('.field').querySelector('label').textContent = `${items.length ? t('total') : t('due')} (${r.pc})`;
      if (items.length) { dueIn.value = (r.due / 100).toFixed(2); dueIn.dataset.auto = '1'; }
      else if (dueIn.dataset.auto) { dueIn.value = s.due; delete dueIn.dataset.auto; }
      if (!items.length) { box.innerHTML = prodList().length ? `<p class="small muted">${t('cartEmpty')}</p>` : ''; return; }
      box.innerHTML = `<div class="lbl" style="margin-bottom:6px">${t('cart')}</div><div class="cart">${items.map((it, i) => `
        <div class="cart-line">
          ${App.modules.productos.thumb({ nombre: it.nombre, imagen: it.imagen }, 'cl-img')}
          <span class="cl-name">${esc(it.nombre)}<small>${money(this.linePrice(it, r.pc), r.pc)}</small></span>
          <div class="stepper sm"><button type="button" data-cq="-1" data-i="${i}" aria-label="−1">−</button><b class="num">${it.cantidad}</b><button type="button" data-cq="1" data-i="${i}" aria-label="+1">+</button></div>
          <b class="num cl-tot">${money(this.linePrice(it, r.pc) * it.cantidad, r.pc)}</b>
          <button type="button" class="x-btn" data-crm="${i}" aria-label="${t('del')}">×</button>
        </div>`).join('')}</div>
        ${r.impuesto ? `<div class="t-line small"><span>${t('subtotal')}</span><b>${money(r.subtotal, r.pc)}</b></div>
          <div class="t-line small"><span>${esc(CFG().impuesto_nombre || 'OB')} ${r.pct}%</span><b>${money(r.impuesto, r.pc)}</b></div>` : ''}`;
    },

    updateTicket() {
      const s = this.sale, r = this.calcSale(), o = OTHER[r.pc];
      this.renderCart(r);
      this.renderQuickPay(r);
      const eq = $('#dueEq');
      if (eq) eq.textContent = r.due ? t('equiv') + ' ' + money(conv(r.due, r.pc, o), o) : '';
      const lines = [];
      if (s.metodo === 'cash') {
        if (r.rUSD) lines.push([t('received') + ' USD', money(r.rUSD, 'USD')]);
        if (r.rXCG) lines.push([t('received') + ' XCG', money(r.rXCG, 'XCG')]);
        lines.push([t('received') + ' (' + r.pc + ')', money(r.recv, r.pc)]);
      } else lines.push([t('card'), money(r.due, r.pc)]);
      $('#tLines').innerHTML = lines.map(([k, v]) => `<div class="t-line"><span>${k}</span><b>${v}</b></div>`).join('');

      const res = $('#tRes');
      let sig = '';
      if (!r.due && !r.recv) { res.className = 't-result'; res.innerHTML = `<span>${t('change')}</span><b>—</b>`; }
      else if (r.diff < 0) { res.className = 't-result short'; res.innerHTML = `<span>${t('pending')}</span><b>${money(-r.diff, r.pc)}</b>`; }
      else if (r.diff === 0 || s.metodo === 'card') { res.className = 't-result change'; res.innerHTML = `<span>${t('exact')}</span><b>${money(0, r.pc)}</b>`; }
      else {
        res.className = 't-result change';
        res.innerHTML = `<span>${t('change')}</span><b>${money(r.change, s.changeCur)}</b>`;
        sig = s.changeCur + r.change;
      }
      $('#giveWrap').hidden = !sig;
      if (sig === this.lastSig) return;
      this.lastSig = sig;
      const list = $('#changeList');
      if (!sig) { list.innerHTML = ''; return; }
      list.innerHTML = `<div class="lbl" style="width:100%">${t('giveThis')}</div>` +
        Money.breakdown(r.change, s.changeCur).map(([d, n], i) => {
          const z = Billetes.size(s.changeCur, d, 70);
          return `<div class="change-item" style="animation-delay:${i * 70}ms"><span style="width:${z.w}px;height:${z.h}px;display:block">${Billetes.svg(s.changeCur, d)}</span><small>${n} × ${Money.label(s.changeCur, d)}</small></div>`;
        }).join('');
    },

    register() {
      const s = this.sale, r = this.calcSale();
      if (!r.due) { toast(t('needTotal'), 'err'); $('#due')?.focus(); return; }
      if (s.metodo === 'cash' && r.diff < 0) { toast(t('notEnough'), 'err'); return; }
      const cash = { USD: 0, XCG: 0 };
      if (s.metodo === 'cash') {
        cash.USD += r.rUSD; cash.XCG += r.rXCG;
        cash[s.changeCur] -= r.change;
      }
      C().seq = (C().seq || 0) + 1;
      const mov = {
        id: uid(), ts: Date.now(), fecha: tod(), tipo: 'venta', numero: 'B-' + String(C().seq).padStart(6, '0'),
        concepto: s.concepto.trim(), cliente: (s.cliente || '').trim(), cajero: LS.get('gestRend_cajero', '').trim(),
        metodo: s.metodo, moneda: r.pc, tasa: C().tasa,
        items: (s.items || []).map(it => ({ pid: it.pid, codigo: it.codigo, nombre: it.nombre, cantidad: it.cantidad, precio: this.linePrice(it, r.pc), imagen: it.imagen })),
        subtotal: (s.items || []).length ? r.subtotal : r.due, impuesto: r.impuesto, impuestoPct: r.pct,
        total: r.due, recibido: JSON.parse(JSON.stringify(s.recv)), recibidoMonto: s.metodo === 'cash' ? r.manual : { USD: 0, XCG: 0 },
        cambioMoneda: s.changeCur, cambio: r.change, desglose: Money.breakdown(r.change, s.changeCur), cash,
      };
      C().movs.push(mov);
      saveCaja();
      const slots = $('#traySlots');
      const finish = () => { this.sale = newSale(s); this.saveSale(); App.render(); this.receiptDialog(mov); };
      if (slots && !reducedMotion() && slots.querySelector('.pile')) { slots.classList.add('sweep'); setTimeout(finish, 420); }
      else finish();
    },

    /* Tras registrar: descargar el bon de 80 mm o el invoice A4 */
    receiptDialog(mov) {
      const m = document.createElement('div');
      m.className = 'modal';
      m.innerHTML = `<div class="modal-box rcp-box" role="dialog" aria-modal="true" aria-labelledby="rcpT">
        <svg class="rcp-ok" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7 12.5l3.2 3L17 9"/></svg>
        <h3 id="rcpT">${t('rcpDone')}</h3>
        <p class="muted">${esc(mov.numero)}: <b>${money(mov.total, mov.moneda)}</b>${mov.cambio ? `<br>${t('change')}: <b>${money(mov.cambio, mov.cambioMoneda)}</b>` : ''}</p>
        <div class="rcp-act">
          <button class="btn btn-sun btn-lg" data-r="bon">${t('rcpBon')}</button>
          <button class="btn btn-ghost btn-lg" data-r="factura">${t('rcpInv')}</button>
        </div>
        <button class="btn btn-ghost" data-r="close">${t('close')}</button>
      </div>`;
      document.body.appendChild(m);
      const close = () => { m.remove(); document.removeEventListener('keydown', onKey); $('#due')?.focus(); };
      const onKey = e => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', onKey);
      m.onclick = e => {
        const b = e.target.closest('[data-r]');
        if (e.target === m || b?.dataset.r === 'close') return close();
        if (b) downloadReceipt(mov.id, b.dataset.r);
      };
      $('[data-r="bon"]', m).focus();
    },

    /* ════════════ Arqueo (contar caja) ════════════ */
    renderArqueo(body) {
      const c = C();
      c.conteo ||= { USD: {}, XCG: {} };
      c.fondo ||= { USD: 0, XCG: 0 };
      const rows = cur => Money.all(cur).map(d => {
        const coin = Money.isCoin(cur, d), n = c.conteo[cur][d] || 0;
        return `<div class="arq-row">
          <button class="thumb ${coin ? 'coin' : ''}" data-inc="${cur}:${d}" aria-label="+1 ${Money.label(cur, d)}">${Billetes.svg(cur, d)}</button>
          <span class="den">${Money.label(cur, d)}</span>
          <div class="stepper"><button data-step="-1" data-k="${cur}:${d}" aria-label="−1">−</button><input class="num" data-cnt="${cur}:${d}" inputmode="numeric" value="${n}" aria-label="${t('qty')} ${Money.label(cur, d)}"><button data-step="1" data-k="${cur}:${d}" aria-label="+1">+</button></div>
          <span class="sub" id="sub-${cur}-${d}">${money(n * d, cur)}</span>
        </div>`;
      }).join('');
      const hist = [...c.arqueos].sort((a, b) => b.ts - a.ts);
      const dCls = v => v === 0 ? 'ok' : v > 0 ? 'warn' : 'err';
      body.innerHTML = `
        <div class="panel" style="margin-bottom:18px">
          <div class="row" style="align-items:flex-end">
            <div class="field grow"><label for="cajero">${t('cashier')}</label><input id="cajero" class="inp" placeholder="${t('cashierPh')}" value="${esc(LS.get('gestRend_cajero', ''))}"></div>
            <div class="field"><label for="fUSD">${t('fondo')} USD</label><input id="fUSD" class="inp num" inputmode="decimal" value="${(c.fondo.USD / 100).toFixed(2)}" style="width:130px"></div>
            <div class="field"><label for="fXCG">${t('fondo')} XCG</label><input id="fXCG" class="inp num" inputmode="decimal" value="${(c.fondo.XCG / 100).toFixed(2)}" style="width:130px"></div>
            <button class="btn btn-ghost" id="arqReset">${t('resetCount')}</button>
            <button class="btn btn-sun" id="arqSave">${t('saveArq')}</button>
          </div>
        </div>
        <div class="arq">
          ${['XCG', 'USD'].map(cur => `<div class="panel"><div class="panel-h"><h3>${curName(cur)}</h3><b class="num" id="arqTot-${cur}"></b></div>${rows(cur)}</div>`).join('')}
        </div>
        <div class="arq-sum" id="arqSum"></div>
        <h3 style="margin:28px 0 10px">${t('arqHist')}</h3>
        ${hist.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>
          <th>${t('date')}</th><th>${t('cashier')}</th><th class="r">${t('counted')} USD</th><th class="r">${t('counted')} XCG</th><th class="r">${t('diff')} USD</th><th class="r">${t('diff')} XCG</th><th></th></tr></thead><tbody>
          ${hist.map(a => `<tr><td>${esc(fmtDateTime(a.ts))}</td><td>${esc(a.cajero || '—')}</td>
            <td class="r">${money(a.contado.USD, 'USD')}</td><td class="r">${money(a.contado.XCG, 'XCG')}</td>
            <td class="r ${dCls(a.diff.USD)}">${money(a.diff.USD, 'USD')}</td><td class="r ${dCls(a.diff.XCG)}">${money(a.diff.XCG, 'XCG')}</td>
            <td><button class="x-btn" data-delarq="${a.id}" aria-label="${t('del')}">×</button></td></tr>`).join('')}
          </tbody></table></div>` : `<p class="muted">${t('none')}</p>`}`;
      this.updateArqueo();

      const setCount = (key, n) => {
        const [cur, d] = key.split(':');
        n = Math.max(0, Math.floor(n) || 0);
        if (n) c.conteo[cur][d] = n; else delete c.conteo[cur][d];
        const inp = $(`[data-cnt="${key}"]`, body);
        if (inp && +inp.value !== n) inp.value = n;
        $(`#sub-${cur}-${d}`, body).textContent = money(n * d, cur);
        this.updateArqueo();
        saveSoon();
      };
      body.onclick = async e => {
        const st = e.target.closest('[data-step]');
        if (st) { const k = st.dataset.k, [cur, d] = k.split(':'); setCount(k, (c.conteo[cur][d] || 0) + (+st.dataset.step)); return; }
        const th = e.target.closest('[data-inc]');
        if (th) {
          const k = th.dataset.inc, [cur, d] = k.split(':');
          setCount(k, (c.conteo[cur][d] || 0) + 1);
          const sub = $(`#sub-${cur}-${d}`, body), z = th.getBoundingClientRect();
          fly(Billetes.svg(cur, +d), z, rectOf(sub, z.width * .4, z.height * .4), Money.isCoin(cur, +d));
          return;
        }
        const da = e.target.closest('[data-delarq]');
        if (da && await confirmDlg(t('cdelArq'))) {
          c.arqueos = c.arqueos.filter(a => a.id !== da.dataset.delarq); saveCaja(); App.render();
        }
      };
      body.oninput = e => { if (e.target.dataset.cnt) setCount(e.target.dataset.cnt, parseNum(e.target.value)); };
      $('#cajero', body).oninput = e => LS.set('gestRend_cajero', e.target.value);
      ['USD', 'XCG'].forEach(cur => {
        $('#f' + cur, body).onchange = e => { c.fondo[cur] = Math.max(0, toCents(e.target.value)); e.target.value = (c.fondo[cur] / 100).toFixed(2); this.updateArqueo(); saveCaja(); };
      });
      $('#arqReset', body).onclick = async () => {
        if (await confirmDlg(t('cReset'), t('resetCount'))) { c.conteo = { USD: {}, XCG: {} }; saveCaja(); App.render(); }
      };
      $('#arqSave', body).onclick = () => {
        const r = this.arqueoTotals();
        c.arqueos.push({
          id: uid(), ts: Date.now(), fecha: tod(), cajero: $('#cajero').value.trim(), tasa: c.tasa,
          conteo: JSON.parse(JSON.stringify(c.conteo)), fondo: { ...c.fondo },
          contado: r.contado, esperado: r.esperado, diff: r.diff,
        });
        saveCaja(); toast(t('arqSaved')); App.render();
      };
    },

    arqueoTotals() {
      const c = C(), out = { contado: {}, esperado: {}, diff: {} };
      for (const cur of ['USD', 'XCG']) {
        out.contado[cur] = sumCount(c.conteo[cur]);
        out.esperado[cur] = this.expected(cur);
        out.diff[cur] = out.contado[cur] - out.esperado[cur];
      }
      return out;
    },

    updateArqueo() {
      const r = this.arqueoTotals();
      ['USD', 'XCG'].forEach(cur => { const el = $('#arqTot-' + cur); if (el) el.textContent = money(r.contado[cur], cur); });
      const st = (cur) => {
        const d = r.diff[cur], cls = d === 0 ? 'ok' : d > 0 ? 'warn' : 'err', lbl = d === 0 ? t('balanced') : d > 0 ? t('over') : t('short');
        return `<div class="stat"><span>${t('counted')} ${cur}</span><b>${money(r.contado[cur], cur)}</b><span>${t('expected')}: ${money(r.esperado[cur], cur)}</span></div>
          <div class="stat"><span>${t('diff')} ${cur}</span><b class="${cls}">${money(d, cur)}</b><span class="tag ${cls === 'ok' ? 'ok' : cls === 'err' ? 'err' : 'sun'}">${lbl}</span></div>`;
      };
      const totXCG = r.contado.XCG + conv(r.contado.USD, 'USD', 'XCG');
      const el = $('#arqSum');
      if (el) el.innerHTML = st('XCG') + st('USD') +
        `<div class="stat"><span>${t('totalEq')}</span><b>${money(totXCG, 'XCG')}</b><span>${money(conv(totXCG, 'XCG', 'USD'), 'USD')}</span></div>`;
    },

    /* ════════════ Movimientos ════════════ */
    renderMovs(body) {
      const f = this.movDate, movs = this.dayMovs(f), sales = this.daySales(f);
      const net = cur => movs.reduce((a, m) => a + (m.cash?.[cur] || 0), 0);
      const tName = { venta: t('tVenta'), entrada: t('tEntrada'), salida: t('tSalida') };
      const tCls = { venta: '', entrada: 'ok', salida: 'err' };
      body.innerHTML = `
        <div class="t-bar">
          <div class="date-ctr">
            <button class="icon-btn" data-day="-1" aria-label="${t('prev')}">${ICON.prev}</button>
            <input type="date" class="inp" id="movDate" value="${f}">
            <button class="icon-btn" data-day="1" aria-label="${t('next')}">${ICON.next}</button>
            <span class="date-tag">${f === tod() ? t('tod') : esc(fmtDate(f))}</span>
          </div>
        </div>
        <div class="stats">
          <div class="stat"><span>${t('sales')}</span><b>${sales.n}</b></div>
          <div class="stat"><span>${t('stCollected')}</span><b>${money(sales.totalXCG, 'XCG')}</b></div>
          <div class="stat"><span>${t('netCash')} XCG</span><b>${money(net('XCG'), 'XCG')}</b></div>
          <div class="stat"><span>${t('netCash')} USD</span><b>${money(net('USD'), 'USD')}</b></div>
        </div>
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-h"><h3>${t('manualMov')}</h3></div>
          <form class="row" id="movForm">
            <select class="sel" id="mTipo" aria-label="${t('type')}"><option value="entrada">${t('tEntrada')}</option><option value="salida">${t('tSalida')}</option></select>
            <select class="sel" id="mCur" aria-label="${t('currency')}"><option>XCG</option><option>USD</option></select>
            <input class="inp num" id="mMonto" inputmode="decimal" placeholder="${t('amount')}" style="width:130px" required>
            <input class="inp grow" id="mConc" placeholder="${t('concept')}">
            <button class="btn btn-pri">${t('addMov')}</button>
          </form>
        </div>
        ${movs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>
          <th>${t('time')}</th><th>${t('receiptNo')}</th><th>${t('type')}</th><th>${t('concept').replace(/\s*\(.*\)/, '')}</th><th>${t('method')}</th><th class="r">${t('total')}</th><th class="r">${t('change')}</th><th class="r">${t('netCash')} XCG</th><th class="r">${t('netCash')} USD</th><th>${t('rcpShort')}</th><th></th></tr></thead><tbody>
          ${movs.map(m => {
            const desc = m.items?.length ? m.items.map(i => `${i.cantidad}× ${i.nombre}`).join(', ') : (m.concepto || '—');
            return `<tr><td class="num">${fmtTime(m.ts)}</td><td class="num">${esc(m.numero || '—')}</td><td><span class="tag ${tCls[m.tipo]}">${tName[m.tipo]}</span></td>
            <td>${esc(desc)}${m.cliente ? `<br><span class="small muted">${esc(m.cliente)}</span>` : ''}</td><td>${m.metodo === 'card' ? t('card') : t('cash')}</td>
            <td class="r">${money(m.total, m.moneda)}</td><td class="r">${m.cambio ? money(m.cambio, m.cambioMoneda) : '—'}</td>
            <td class="r">${m.cash?.XCG ? money(m.cash.XCG, 'XCG') : '—'}</td><td class="r">${m.cash?.USD ? money(m.cash.USD, 'USD') : '—'}</td>
            <td>${m.tipo === 'venta' ? `<div class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn btn-ghost btn-sm" data-rcp="${m.id}" data-k="bon" title="${t('rcpBon')}">Bon</button><button class="btn btn-ghost btn-sm" data-rcp="${m.id}" data-k="factura" title="${t('rcpInv')}">A4</button></div>` : ''}</td>
            <td><button class="x-btn" data-delmov="${m.id}" aria-label="${t('del')}">×</button></td></tr>`;
          }).join('')}
          </tbody><tfoot><tr><td colspan="7">${t('total')}</td><td class="r">${money(net('XCG'), 'XCG')}</td><td class="r">${money(net('USD'), 'USD')}</td><td colspan="2"></td></tr></tfoot></table></div>`
          : `<div class="panel empty"><svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg><h3>${t('noMovs')}</h3><p>${t('noMovsD')}</p></div>`}`;

      $('#movDate', body).onchange = e => { if (e.target.value) { this.movDate = e.target.value; App.render(); } };
      body.onclick = async e => {
        const dd = e.target.closest('[data-day]');
        if (dd) { this.movDate = shiftDate(f, +dd.dataset.day); App.render(); return; }
        const rc = e.target.closest('[data-rcp]');
        if (rc) { downloadReceipt(rc.dataset.rcp, rc.dataset.k); return; }
        const dm = e.target.closest('[data-delmov]');
        if (dm && await confirmDlg(t('cdelMov'))) {
          C().movs = C().movs.filter(m => m.id !== dm.dataset.delmov); saveCaja(); App.render();
        }
      };
      $('#movForm', body).onsubmit = e => {
        e.preventDefault();
        const tipo = $('#mTipo').value, cur = $('#mCur').value, monto = Math.abs(toCents($('#mMonto').value));
        if (!monto) { toast(t('amount') + '?', 'err'); return; }
        const ts = f === tod() ? Date.now() : isoToDate(f).getTime();
        C().movs.push({ id: uid(), ts, fecha: f, tipo, metodo: 'cash', moneda: cur, total: monto,
          concepto: $('#mConc').value.trim(), cash: { [cur]: tipo === 'entrada' ? monto : -monto } });
        saveCaja(); toast(t('movAdded')); App.render();
      };
    },

    /* ════════════ Exportar ════════════ */
    exportData() {
      const c = C();
      if (this.tab === 'arqueo') {
        const r = this.arqueoTotals(), cajero = LS.get('gestRend_cajero', '');
        const totXCG = r.contado.XCG + conv(r.contado.USD, 'USD', 'XCG');
        const sec = cur => {
          const body = Money.all(cur).map(d => [Money.label(cur, d), c.conteo[cur][d] || 0, { v: (c.conteo[cur][d] || 0) * d, cur }]);
          return { title: curName(cur), head: [t('denom'), t('qty'), t('subtotal') + ' ' + cur], types: ['text', 'int', 'money'], body,
            foot: [t('total'), body.reduce((a, x) => a + x[1], 0), { v: r.contado[cur], cur }] };
        };
        const summary = [];
        for (const cur of ['XCG', 'USD']) {
          summary.push([t('fondo') + ' ' + cur, money(c.fondo[cur] || 0, cur)]);
          summary.push([t('counted') + ' ' + cur, money(r.contado[cur], cur)]);
          summary.push([t('expected') + ' ' + cur, money(r.esperado[cur], cur)]);
          summary.push([t('diff') + ' ' + cur, money(r.diff[cur], cur) + '  (' + (r.diff[cur] === 0 ? t('balanced') : r.diff[cur] > 0 ? t('over') : t('short')) + ')']);
        }
        summary.push([t('totalEq'), money(totXCG, 'XCG') + '  /  ' + money(conv(totXCG, 'XCG', 'USD'), 'USD')]);
        summary.push([t('rate').split(':')[0], '1 USD = ' + c.tasa + ' XCG']);
        return { title: t('cArqueo'), subtitle: fmtDateLong(tod()) + (cajero ? ' — ' + cajero : ''), filename: 'arqueo-' + tod(),
          summary, sections: [sec('XCG'), sec('USD')], signatures: [cajero || t('cashier')] };
      }
      const f = this.tab === 'movs' ? this.movDate : tod();
      const movs = this.dayMovs(f), sales = this.daySales(f);
      const net = cur => movs.reduce((a, m) => a + (m.cash?.[cur] || 0), 0);
      const tName = { venta: t('tVenta'), entrada: t('tEntrada'), salida: t('tSalida') };
      const arqs = c.arqueos.filter(a => a.fecha === f);
      const sections = [{
        title: t('cMovs'),
        head: [t('time'), t('type'), t('concept').replace(/\s*\(.*\)/, ''), t('method'), t('currency'), t('total'), t('change'), t('netCash') + ' XCG', t('netCash') + ' USD'],
        types: ['text', 'text', 'text', 'text', 'text', 'money', 'text', 'money', 'money'],
        body: movs.map(m => [fmtTime(m.ts), tName[m.tipo], m.concepto || '', m.metodo === 'card' ? t('card') : t('cash'), m.moneda,
          m.total / 100, m.cambio ? money(m.cambio, m.cambioMoneda) : '', (m.cash?.XCG || 0) / 100, (m.cash?.USD || 0) / 100]),
        foot: [t('total'), '', '', '', '', '', '', net('XCG') / 100, net('USD') / 100],
      }];
      if (arqs.length) sections.push({
        title: t('arqHist'),
        head: [t('time'), t('cashier'), t('counted') + ' XCG', t('counted') + ' USD', t('diff') + ' XCG', t('diff') + ' USD'],
        types: ['text', 'text', 'money', 'money', 'money', 'money'],
        body: arqs.map(a => [fmtTime(a.ts), a.cajero || '', a.contado.XCG / 100, a.contado.USD / 100, a.diff.XCG / 100, a.diff.USD / 100]),
      });
      return {
        title: t('cajaRep'), subtitle: fmtDateLong(f), filename: 'caja-' + f, landscape: true,
        summary: [
          [t('sales'), String(sales.n)],
          [t('stCollected'), money(sales.totalXCG, 'XCG')],
          [t('netCash') + ' XCG', money(net('XCG'), 'XCG')],
          [t('netCash') + ' USD', money(net('USD'), 'USD')],
          [t('rate').split(':')[0], '1 USD = ' + c.tasa + ' XCG'],
        ],
        sections,
      };
    },
  };

  App.register('caja', Caja);
})();
