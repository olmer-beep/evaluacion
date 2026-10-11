'use strict';
/* ════════════════════════════════════════════════════════════
   Empresa: datos que aparecen en la cabecera del bon y del invoice
   ════════════════════════════════════════════════════════════ */
(() => {
  const CFG = () => App.stores.config.data;
  const FIELDS = [
    ['empresa_nombre', 'eNombre', 'Mi Tienda'], ['empresa_subtitulo', 'eSub', ''],
    ['empresa_direccion', 'eDir', 'Schottegatweg Oost 10, Willemstad'], ['empresa_contacto', 'eCont', '+599 9 123 4567  /  info@mitienda.cw'],
    ['empresa_crib', 'eCrib', ''], ['empresa_ob_nr', 'eOb', ''],
  ];

  const Empresa = {
    title: 'mEmpresa', sub: 'sEmpresa', stores: ['config'],
    render(root) {
      const c = CFG();
      const f = ([k, l, ph]) => `<div class="field"><label for="${k}">${t(l)}</label><input class="inp" id="${k}" value="${esc(c[k])}" placeholder="${esc(ph)}"></div>`;
      root.innerHTML = `
        <form id="empForm" class="emp">
          <section class="panel">
            <div class="panel-h"><h3>${t('eDatos')}</h3></div>
            <div class="emp-grid">${FIELDS.map(f).join('')}</div>
          </section>
          <section class="panel emp-logo">
            <div class="panel-h"><h3>${t('eLogo')}</h3></div>
            <label class="p-drop logo" for="eFile">${c.empresa_logo ? `<img src="${esc(c.empresa_logo)}" alt="">` : `<span>${t('addPhoto')}</span>`}</label>
            <input type="file" id="eFile" accept="image/png,image/jpeg" hidden>
            <div class="row"><label class="btn btn-ghost btn-sm" for="eFile">${c.empresa_logo ? t('changePhoto') : t('addPhoto')}</label>
              ${c.empresa_logo ? `<button type="button" class="btn btn-ghost btn-sm" id="eRmLogo">${t('rmPhoto')}</button>` : ''}</div>
            <p class="small muted">${t('eLogoHint')}</p>
            <div class="panel-h" style="margin-top:18px"><h3>${t('eColors')}</h3></div>
            <div class="row">
              <label class="color-f"><input type="color" id="empresa_color_principal" value="${esc(c.empresa_color_principal || '#1e293b')}"> ${t('eColor1')}</label>
              <label class="color-f"><input type="color" id="empresa_color_acento" value="${esc(c.empresa_color_acento || '#0ea5e9')}"> ${t('eColor2')}</label>
            </div>
          </section>
          <section class="panel">
            <div class="panel-h"><h3>${t('eTax')}</h3></div>
            <label class="row" style="gap:10px;margin-bottom:12px"><input type="checkbox" id="impuesto_activo" ${c.impuesto_activo ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--pri)"> ${t('eTaxOn')}</label>
            <div class="row">
              <div class="field grow"><label for="impuesto_nombre">${t('eTaxName')}</label><input class="inp" id="impuesto_nombre" value="${esc(c.impuesto_nombre || 'OB')}"></div>
              <div class="field"><label for="impuesto_porcentaje">%</label><input class="inp num" id="impuesto_porcentaje" inputmode="decimal" value="${esc(c.impuesto_porcentaje ?? 6)}" style="width:100px"></div>
            </div>
          </section>
          <section class="panel">
            <div class="panel-h"><h3>${t('eRcp')}</h3></div>
            <div class="field" style="margin-bottom:12px"><label for="bon_mensaje">${t('eMsg')}</label><input class="inp" id="bon_mensaje" value="${esc(c.bon_mensaje)}" placeholder="¡Gracias por su preferencia!"></div>
            <div class="field" style="margin-bottom:12px"><label for="bon_politica">${t('ePol')}</label><textarea class="ta" id="bon_politica" placeholder="Cambios dentro de 8 días con este bon.">${esc(c.bon_politica)}</textarea></div>
            <div class="field"><label for="recibo_idioma">${t('eLang')}</label>
              <select class="sel" id="recibo_idioma"><option value="">${t('eLangApp')}</option>${[['es', 'Español'], ['en', 'English'], ['pap', 'Papiamentu'], ['nl', 'Nederlands']].map(([v, l]) => `<option value="${v}" ${c.recibo_idioma === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          </section>
          <div class="emp-foot">
            <button class="btn btn-pri btn-lg">${t('save')}</button>
            <span class="muted small">${t('ePreview')}:</span>
            <button type="button" class="btn btn-ghost" data-prev="bon">${t('rcpBon')}</button>
            <button type="button" class="btn btn-ghost" data-prev="factura">${t('rcpInv')}</button>
          </div>
        </form>`;

      const collect = () => {
        FIELDS.forEach(([k]) => { c[k] = $('#' + k).value.trim(); });
        ['empresa_color_principal', 'empresa_color_acento', 'impuesto_nombre', 'bon_mensaje', 'bon_politica', 'recibo_idioma'].forEach(k => { c[k] = $('#' + k).value.trim(); });
        c.impuesto_activo = $('#impuesto_activo').checked;
        const pct = parseNum($('#impuesto_porcentaje').value);
        c.impuesto_porcentaje = isFinite(pct) && pct >= 0 ? pct : 0;
      };
      $('#empForm', root).onsubmit = async e => {
        e.preventDefault();
        collect();
        await App.stores.config.save();
        toast(t('eSaved'));
      };
      $('#eFile', root).onchange = async e => {
        const file = e.target.files[0]; if (!file) return;
        collect();
        toast(t('uploading'));
        try {
          const url = await uploadImage(await resizeImage(file, 480, 'image/png'));
          deleteImage(c.empresa_logo);
          c.empresa_logo = url;
          await App.stores.config.save();
          App.render();
        } catch { toast(t('imgErr'), 'err'); }
      };
      $('#eRmLogo', root)?.addEventListener('click', async () => {
        collect(); deleteImage(c.empresa_logo); c.empresa_logo = ''; await App.stores.config.save(); App.render();
      });
      root.onclick = async e => {
        const b = e.target.closest('[data-prev]'); if (!b) return;
        collect();
        await App.stores.config.save();
        await App.stores.config.flush();
        window.open(`/api/recibo/muestra?tipo=${b.dataset.prev}&dl=0&lang=${c.recibo_idioma || App.lang}`, '_blank');
      };
    },
  };
  App.register('empresa', Empresa);
})();
