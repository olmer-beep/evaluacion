'use strict';
/* Inicio: resumen del día — tareas y caja */
(() => {
  const QUICK = [
    ['caja', 'cobrar', 'qCobrar', 'qCobrarD', '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>'],
    ['caja', 'arqueo', 'qArqueo', 'qArqueoD', '<path d="M4 7h16M4 12h16M4 17h10"/>'],
    ['tareas', null, 'qTareas', 'qTareasD', '<path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>'],
    ['calc', null, 'qCalc', 'qCalcD', '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v4"/>'],
  ];

  function today() {
    const day = App.stores.data.data[tod()] || [];
    const done = day.reduce((a, w) => a + w.tareas.filter(x => x.hecho).length, 0);
    const tot = day.reduce((a, w) => a + w.tareas.length, 0);
    const caja = App.modules.caja;
    const arqs = [...App.stores.caja.data.arqueos].sort((a, b) => b.ts - a.ts);
    return { day, done, tot, pct: tot ? Math.round(done / tot * 100) : 0, sales: caja.daySales(tod()),
      expXCG: caja.expected('XCG'), expUSD: caja.expected('USD'), lastArq: arqs[0] };
  }

  const Inicio = {
    title: 'mInicio', sub: 'sInicio', stores: ['data', 'caja'],
    render(root) {
      const d = today(), h = new Date().getHours();
      const greet = h < 12 ? t('gMorning') : h < 19 ? t('gAfternoon') : t('gEvening');
      const la = d.lastArq;
      const laTxt = la ? `${fmtDateTime(la.ts)}${la.cajero ? ', ' + esc(la.cajero) : ''}` : t('none');
      root.innerHTML = `
        <div class="hero">
          <div class="hero-main">
            <svg class="waves" viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 150Q75 120 150 150T300 150T450 150T600 150V220H0z" fill="#1b7f8c" opacity=".35"/>
              <path d="M0 178Q75 150 150 178T300 178T450 178T600 178V220H0z" fill="#1b7f8c" opacity=".45"/>
              <path d="M0 120Q75 96 150 120T300 120T450 120T600 120" stroke="#f2b705" stroke-width="2" fill="none" opacity=".55"/>
              <circle cx="520" cy="56" r="26" fill="#f2b705" opacity=".85"/>
            </svg>
            <p>${esc(fmtDateLong(tod()))}</p>
            <h2>${greet}</h2>
          </div>
          <div class="hero-cash">
            <h3>${t('cashNow')}</h3>
            <div class="cash-line"><span>${t('xcgName')}</span><b>${money(d.expXCG, 'XCG')}</b></div>
            <div class="cash-line"><span>${t('usdName')}</span><b>${money(d.expUSD, 'USD')}</b></div>
            <span class="small muted">${t('lastArq')}: ${laTxt}</span>
          </div>
        </div>
        <div class="stats">
          <div class="stat"><span>${t('stWorkers')}</span><b>${d.day.length}</b></div>
          <div class="stat"><span>${t('stTasks')}</span><b class="${d.tot ? pctCls(d.pct) : ''}">${d.done}/${d.tot}</b><div class="bar" style="margin-top:8px"><i class="${fillCls(d.pct)}" style="width:${d.pct}%"></i></div></div>
          <div class="stat"><span>${t('stSales')}</span><b>${d.sales.n}</b></div>
          <div class="stat"><span>${t('stCollected')}</span><b>${money(d.sales.totalXCG, 'XCG')}</b></div>
        </div>
        <div class="quick">${QUICK.map(([m, tab, l, dsc, ic], i) => `
          <button data-q="${i}"><svg viewBox="0 0 24 24">${ic}</svg><span><b>${t(l)}</b><small>${t(dsc)}</small></span></button>`).join('')}
        </div>`;
      root.onclick = e => {
        const b = e.target.closest('[data-q]'); if (!b) return;
        const [m, tab] = QUICK[+b.dataset.q];
        if (tab) { App.modules.caja.tab = tab; LS.set('gestRend_cajaTab', tab); }
        App.show(m);
      };
    },

    exportData() {
      const d = today();
      const tareas = App.modules.tareas, prevDate = tareas.date;
      tareas.date = tod();
      const tSec = tareas.exportData().sections[0];
      tareas.date = prevDate;
      const caja = App.modules.caja, prevTab = caja.tab;
      caja.tab = 'cobrar';
      const cSec = caja.exportData().sections;
      caja.tab = prevTab;
      return {
        title: t('summary') + ': ' + fmtDateLong(tod()), filename: 'resumen-' + tod(), landscape: true,
        summary: [
          [t('stWorkers'), String(d.day.length)],
          [t('stTasks'), `${d.done} / ${d.tot} (${d.pct}%)`],
          [t('stSales'), String(d.sales.n)],
          [t('stCollected'), money(d.sales.totalXCG, 'XCG')],
          [t('cashNow') + ' XCG', money(d.expXCG, 'XCG')],
          [t('cashNow') + ' USD', money(d.expUSD, 'USD')],
        ],
        sections: [tSec, ...cSec],
      };
    },
  };
  App.register('inicio', Inicio);
})();
