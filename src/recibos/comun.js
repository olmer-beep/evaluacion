// ============================================================
//  Utilidades compartidas por el invoice y el bon de caja
// ============================================================
const fs = require('fs');
const path = require('path');

const IMG_DIR = path.join(__dirname, '..', '..', 'imagenes');

// Luminancia de un color hex (para decidir texto claro u oscuro encima)
function lum(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return 255;
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// DD/MM/YYYY h:mm AM/PM
function fechaAMPM(d) {
  d = d || new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${dd}/${mm}/${d.getFullYear()} ${h}:${m} ${ampm}`;
}

// "/img/abc.jpg" → ruta en disco, solo si existe y es una imagen nuestra
function rutaImagen(url) {
  const m = String(url || '').match(/^\/img\/([a-z0-9]+\.(?:jpg|png))$/);
  if (!m) return null;
  const p = path.join(IMG_DIR, m[1]);
  return fs.existsSync(p) ? p : null;
}

// Helvetica de PDFKit solo cubre WinAnsi: sustituimos lo que no imprime
const WIN = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
const txt = s => String(s ?? '').replace(/[−]/g, '-').replace(/[^\x00-\xff]/g, c => (WIN.includes(c) ? c : '?'));

/* Convierte un movimiento de venta guardado en caja.json a los datos
   que usan los dos formatos de recibo. Importes en unidades (no centavos)
   y en la moneda de la venta. */
function datosVenta(mov, caja, t) {
  const moneda = mov.moneda === 'USD' ? 'USD' : 'XCG';
  const tasa = mov.tasa || caja.tasa || 1.79;
  const items = (mov.items && mov.items.length)
    ? mov.items.map(i => ({ codigo: i.codigo || '', descripcion: i.nombre, cantidad: i.cantidad, precio: i.precio / 100, imagen: rutaImagen(i.imagen) }))
    : [{ codigo: '', descripcion: mov.concepto || t.venta, cantidad: 1, precio: mov.total / 100, imagen: null }];
  const total = mov.total / 100;
  const subtotal = (mov.subtotal ?? mov.total) / 100;
  const impuesto = (mov.impuesto || 0) / 100;
  const aDoc = (v, cur) => cur === moneda ? v : (cur === 'USD' ? v * tasa : v / tasa);

  const pagos = [];
  if (mov.metodo === 'card') {
    pagos.push({ etiqueta: `${t.tarjeta} ${moneda}`, monto: total, efectivo: false });
  } else {
    for (const cur of ['XCG', 'USD']) {
      const cents = Object.entries(mov.recibido?.[cur] || {}).reduce((a, [d, n]) => a + (+d) * n, 0) + (mov.recibidoMonto?.[cur] || 0);
      if (!cents) continue;
      const entregado = cents / 100;
      pagos.push({ etiqueta: `${t.efectivo} ${cur}`, moneda: cur, entregado, monto: aDoc(entregado, cur), efectivo: true });
    }
    if (!pagos.length) pagos.push({ etiqueta: `${t.efectivo} ${moneda}`, moneda, entregado: total, monto: total, efectivo: true });
  }
  const recibido = pagos.reduce((a, p) => a + p.monto, 0);

  return {
    numero: mov.numero || ('B-' + String(mov.id).slice(-6).toUpperCase()),
    fecha: fechaAMPM(new Date(mov.ts)),
    cajero: mov.cajero || '',
    clienteNombre: mov.cliente || '',
    concepto: mov.items && mov.items.length ? (mov.concepto || '') : '',
    items, moneda, tasa, subtotal, impuesto, impuestoPct: mov.impuestoPct || 0, total,
    totalOtro: moneda === 'USD' ? total * tasa : total / tasa,
    pagos, recibido,
    cambio: mov.cambio ? { monto: mov.cambio / 100, moneda: mov.cambioMoneda } : null,
  };
}

module.exports = { lum, fechaAMPM, rutaImagen, datosVenta, txt, IMG_DIR };
