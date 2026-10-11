'use strict';
/* Arranque */
(async function boot() {
  const theme = LS.get('gestRend_theme', null);
  if (theme) document.documentElement.dataset.theme = theme;
  $('#nav').onclick = e => { const b = e.target.closest('[data-mod]'); if (b) App.show(b.dataset.mod); };

  setSync('loading');
  try {
    await Promise.all(Object.values(App.stores).map(s => s.load()));
    setSync('ok');
  } catch {
    setSync('error');
    toast(t('saveErr'), 'err');
  }
  App.show(App.mod);
  App.setLang(App.lang);

  const ov = $('#lov');
  ov.classList.add('gone');
  setTimeout(() => { ov.style.display = 'none'; }, 300);
  setInterval(() => App.poll(), 4000);
})();
