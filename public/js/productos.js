'use strict';
/* ════════════════════════════════════════════════════════════
   Productos: catálogo con foto, código, precio y categoría.
   { id, codigo, nombre, precio (centavos), moneda, categoria, imagen:'/img/…' }
   ════════════════════════════════════════════════════════════ */
(() => {
  const P = () => App.stores.productos.data;
  const save = () => App.stores.productos.save();
  const initials = s => String(s || '?').split(/\s+/).map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();
  const thumb = (p, cls = 'p-img') => p.imagen
    ? `<img class="${cls}" src="${esc(p.imagen)}" alt="" loading="lazy">`
    : `<span class="${cls} p-ph">${esc(initials(p.nombre))}</span>`;

  const Productos = {
    title: 'mProductos', sub: 'sProductos', stores: ['productos'],
    q: '', cat: '',
    edit: null,       // producto en edición (copia) o null
    thumb,

    list() { return [...(P().lista || [])].sort((a, b) => a.nombre.localeCompare(b.nombre)); },
    cats() { return [...new Set(this.list().map(p => p.categoria).filter(Boolean))].sort(); },
    match(p, q) {
      q = q.trim().toLowerCase();
      return !q || p.nombre.toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q) || (p.categoria || '').toLowerCase().includes(q);
    },

    render(root) {
      const cats = this.cats();
      const items = this.list().filter(p => this.match(p, this.q) && (!this.cat || p.categoria === this.cat));
      const tasa = App.stores.caja.data.tasa || 1.79;
      const other = p => p.moneda === 'USD' ? money(Math.round(p.precio * tasa), 'XCG') : money(Math.round(p.precio / tasa), 'USD');
      root.innerHTML = `
        <div class="t-bar">
          <div class="row" style="flex:1;max-width:640px">
            <input class="inp grow" id="pq" placeholder="${t('searchProd')}" value="${esc(this.q)}" autocomplete="off">
            <select class="sel" id="pcat"><option value="">${t('allCats')}</option>${cats.map(c => `<option ${c === this.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
          </div>
          <button class="btn btn-pri" id="pNew">${t('newProd')}</button>
        </div>
        <div id="pForm"></div>
        ${items.length ? `<div class="p-grid">${items.map(p => `
          <article class="p-card">
            ${thumb(p)}
            <div class="p-body">
              <h3>${esc(p.nombre)}</h3>
              <span class="small muted">${esc([p.codigo, p.categoria].filter(Boolean).join(' / ')) || '&nbsp;'}</span>
              <b class="p-price">${money(p.precio, p.moneda)}</b>
              <span class="small muted">${other(p)}</span>
            </div>
            <div class="p-act">
              <button class="btn btn-ghost btn-sm" data-edit="${p.id}">${t('edit')}</button>
              <button class="btn btn-ghost btn-sm" data-del="${p.id}">${t('del')}</button>
            </div>
          </article>`).join('')}</div>`
        : `<div class="panel empty"><svg viewBox="0 0 24 24"><path d="M3 7l9-4 9 4-9 4z M3 7v10l9 4 9-4V7 M12 11v10"/></svg><h3>${t('noProds')}</h3><p>${t('noProdsD')}</p></div>`}`;

      const pq = $('#pq', root);
      pq.oninput = () => { this.q = pq.value; const pos = pq.selectionStart; App.render(); const n = $('#pq'); n.focus(); n.setSelectionRange(pos, pos); };
      $('#pcat', root).onchange = e => { this.cat = e.target.value; App.render(); };
      $('#pNew', root).onclick = () => { this.edit = { id: '', codigo: '', nombre: '', precio: 0, moneda: 'XCG', categoria: '', imagen: '' }; this.renderForm(); };
      root.onclick = async e => {
        const ed = e.target.closest('[data-edit]');
        if (ed) { this.edit = { ...P().lista.find(p => p.id === ed.dataset.edit) }; this.renderForm(); return; }
        const dl = e.target.closest('[data-del]');
        if (dl && await confirmDlg(t('cdelProd'))) {
          const p = P().lista.find(x => x.id === dl.dataset.del);
          // la foto se conserva si alguna venta ya la usa en su recibo
          if (p && !App.stores.caja.data.movs.some(m => (m.items || []).some(i => i.imagen === p.imagen))) deleteImage(p.imagen);
          P().lista = P().lista.filter(x => x.id !== dl.dataset.del);
          save(); App.render();
        }
      };
      if (this.edit) this.renderForm();
    },

    renderForm() {
      const box = $('#pForm'); if (!box) return;
      const p = this.edit;
      if (!p) { box.innerHTML = ''; return; }
      box.innerHTML = `
        <form class="panel p-form" id="prodForm">
          <div class="p-photo">
            <label class="p-drop" for="pFile">${p.imagen ? `<img src="${esc(p.imagen)}" alt="">` : `<span>${t('addPhoto')}</span>`}</label>
            <input type="file" id="pFile" accept="image/*" hidden>
            <div class="row" style="justify-content:center">
              <label class="btn btn-ghost btn-sm" for="pFile">${p.imagen ? t('changePhoto') : t('addPhoto')}</label>
              ${p.imagen ? `<button type="button" class="btn btn-ghost btn-sm" id="pRmImg">${t('rmPhoto')}</button>` : ''}
            </div>
          </div>
          <div class="p-fields">
            <h3>${p.id ? t('editProd') : t('newProd')}</h3>
            <div class="field"><label for="fNom">${t('pName')}</label><input class="inp" id="fNom" value="${esc(p.nombre)}" required></div>
            <div class="row">
              <div class="field grow"><label for="fCod">${t('pCode')}</label><input class="inp" id="fCod" value="${esc(p.codigo)}"></div>
              <div class="field grow"><label for="fCat">${t('pCat')}</label><input class="inp" id="fCat" list="catList" value="${esc(p.categoria)}"><datalist id="catList">${this.cats().map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
            </div>
            <div class="row">
              <div class="field grow"><label for="fPre">${t('price')}</label><input class="inp num" id="fPre" inputmode="decimal" value="${p.precio ? (p.precio / 100).toFixed(2) : ''}" placeholder="0.00" required></div>
              <div class="field"><label for="fMon">${t('currency')}</label><select class="sel" id="fMon"><option ${p.moneda === 'XCG' ? 'selected' : ''}>XCG</option><option ${p.moneda === 'USD' ? 'selected' : ''}>USD</option></select></div>
            </div>
            <div class="row"><button class="btn btn-pri">${t('save')}</button><button type="button" class="btn btn-ghost" id="pCancel">${t('cancel')}</button></div>
          </div>
        </form>`;
      box.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
      const keep = () => Object.assign(p, { nombre: $('#fNom').value, codigo: $('#fCod').value, categoria: $('#fCat').value, moneda: $('#fMon').value, precio: toCents($('#fPre').value) });
      $('#pFile').onchange = async e => {
        const f = e.target.files[0]; if (!f) return;
        keep();
        toast(t('uploading'));
        try {
          const url = await uploadImage(await resizeImage(f, 640));
          if (p.imagen && p.imagen !== url && !this.imageInUse(p.imagen, p.id)) deleteImage(p.imagen);
          p.imagen = url;
          this.renderForm();
        } catch { toast(t('imgErr'), 'err'); }
      };
      $('#pRmImg')?.addEventListener('click', () => { keep(); p.imagen = ''; this.renderForm(); });
      $('#pCancel').onclick = () => { this.edit = null; this.renderForm(); };
      $('#prodForm').onsubmit = e => {
        e.preventDefault();
        keep();
        p.nombre = p.nombre.trim(); p.codigo = p.codigo.trim(); p.categoria = p.categoria.trim();
        if (!p.nombre || !(p.precio > 0)) { toast(t('needName'), 'err'); return; }
        const lista = P().lista ||= [];
        if (p.id) {
          const old = lista.find(x => x.id === p.id);
          if (old && old.imagen && old.imagen !== p.imagen && !this.imageInUse(old.imagen, p.id)) deleteImage(old.imagen);
          Object.assign(old, p);
        } else lista.push({ ...p, id: uid(), creado: Date.now() });
        this.edit = null;
        save(); toast(t('prodSaved')); App.render();
      };
      $('#fNom').focus();
    },

    /* ¿Otra ficha o una venta ya registrada usa esta foto? */
    imageInUse(url, exceptId) {
      return P().lista.some(x => x.id !== exceptId && x.imagen === url) ||
        App.stores.caja.data.movs.some(m => (m.items || []).some(i => i.imagen === url));
    },

    exportData() {
      const tasa = App.stores.caja.data.tasa || 1.79;
      const items = this.list().filter(p => this.match(p, this.q) && (!this.cat || p.categoria === this.cat));
      return {
        title: t('catalog'), subtitle: App.stores.config.data.empresa_nombre || '', filename: 'productos-' + tod(),
        sections: [{
          title: t('mProductos'),
          head: [t('pCode'), t('pName'), t('pCat'), t('currency'), t('price'), t('price') + ' XCG', t('price') + ' USD'],
          types: ['text', 'text', 'text', 'text', 'money', 'money', 'money'],
          body: items.map(p => [p.codigo || '', p.nombre, p.categoria || '', p.moneda, p.precio / 100,
            (p.moneda === 'XCG' ? p.precio : Math.round(p.precio * tasa)) / 100,
            (p.moneda === 'USD' ? p.precio : Math.round(p.precio / tasa)) / 100]),
        }],
      };
    },
  };
  App.register('productos', Productos);
})();
