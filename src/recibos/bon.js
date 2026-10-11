// ============================================================
//  BON DE CAJA (ticket de tienda, rollo de 80 mm)
// ============================================================
//  Mismo formato que el bon de sistema-facturacion: tira estrecha,
//  todo centrado, importes a la derecha, desglose de OB, forma de
//  pago, vuelto y el número del bon en código de barras.
//  El alto del papel se calcula sumando los bloques antes de crear
//  la página.
// ------------------------------------------------------------
const { code39 } = require('./codigo39');
const { rutaImagen, txt } = require('./comun');

const ANCHO  = 226.77;   // 80 mm
const MARGEN = 12;
const CW     = ANCHO - MARGEN * 2;
const NEGRO = '#000000';
const GRIS  = '#555555';

function nuevoTicket(doc) {
  const bloques = [];
  const api = {};
  const altoDe = (s, opt) => doc.heightOfString(s || '', Object.assign({ width: CW }, opt));

  api.linea = (s, o = {}) => {
    if (s === '' || s === null || s === undefined) return api;
    s = txt(s);
    const tam = o.tam || 8, fuente = o.fuente || 'Helvetica', align = o.align || 'center';
    const color = o.color || NEGRO, gap = o.gap === undefined ? 1.5 : o.gap;
    const ancho = o.ancho || CW, x = o.x === undefined ? MARGEN : o.x;
    doc.font(fuente).fontSize(tam);
    const alto = altoDe(s, { width: ancho, align });
    bloques.push({ alto: alto + gap, dibujar: y => doc.font(fuente).fontSize(tam).fillColor(color).text(s, x, y, { width: ancho, align }) });
    return api;
  };

  api.par = (izq, der, o = {}) => {
    izq = txt(izq); der = txt(der);
    const tam = o.tam || 8, fuente = o.fuente || 'Helvetica', fuenteD = o.fuenteDer || fuente;
    const color = o.color || NEGRO, gap = o.gap === undefined ? 1.5 : o.gap;
    const wDer = o.wDer || 70, wIzq = CW - wDer - 4;
    doc.font(fuente).fontSize(tam);
    const alto = Math.max(altoDe(izq, { width: wIzq }), tam + 1);
    bloques.push({ alto: alto + gap, dibujar: y => {
      doc.font(fuente).fontSize(tam).fillColor(color).text(izq, MARGEN, y, { width: wIzq });
      doc.font(fuenteD).fontSize(tam).fillColor(color).text(der, MARGEN + wIzq + 4, y, { width: wDer, align: 'right' });
    }});
    return api;
  };

  api.separador = (estilo = 'fino') => {
    bloques.push({ alto: estilo === 'doble' ? 7 : 6, dibujar: y => {
      doc.lineWidth(estilo === 'fino' ? 0.5 : 1).strokeColor(estilo === 'fino' ? GRIS : NEGRO);
      if (estilo === 'fino') doc.dash(1.6, { space: 1.6 });
      doc.moveTo(MARGEN, y + 2).lineTo(MARGEN + CW, y + 2).stroke();
      doc.undash();
      if (estilo === 'doble') doc.moveTo(MARGEN, y + 4.5).lineTo(MARGEN + CW, y + 4.5).stroke();
    }});
    return api;
  };

  api.espacio = h => { bloques.push({ alto: h, dibujar: () => {} }); return api; };

  api.imagen = (src, w, h) => {
    bloques.push({ alto: h + 4, dibujar: y => {
      try { doc.image(src, MARGEN + (CW - w) / 2, y, { fit: [w, h], align: 'center' }); } catch (e) { /* logo roto: se omite */ }
    }});
    return api;
  };

  api.codigoBarras = (s, alto = 30) => {
    const barras = code39(s);
    if (!barras.length) return api;
    const escala = CW / barras.reduce((a, b) => a + b.ancho, 0);
    bloques.push({ alto: alto + 3, dibujar: y => {
      let x = MARGEN;
      barras.forEach(b => { const w = b.ancho * escala; if (b.negro) doc.rect(x, y, w, alto).fill(NEGRO); x += w; });
    }});
    return api;
  };

  api.alto = () => bloques.reduce((s, b) => s + b.alto, 0);
  api.pintar = y0 => { let y = y0; bloques.forEach(b => { b.dibujar(y); y += b.alto; }); };
  return api;
}

function generarBon(doc, d, config, t) {
  const sim = d.moneda === 'USD' ? '$' : 'XCG', simO = d.moneda === 'USD' ? 'XCG' : '$';
  const imp = (v, s = sim) => s + ' ' + (v || 0).toFixed(2);
  const ticket = nuevoTicket(doc);

  // ---------- Cabecera: logo y datos de la tienda ----------
  const logo = rutaImagen(config.empresa_logo);
  if (logo) ticket.imagen(logo, 110, 46);
  ticket.linea(config.empresa_nombre || 'Mi Empresa', { tam: 12, fuente: 'Helvetica-Bold', gap: 2 });
  ticket.linea(config.empresa_subtitulo, { tam: 7, color: GRIS });
  ticket.linea(config.empresa_direccion, { tam: 7.5 });
  ticket.linea(config.empresa_contacto, { tam: 7.5 });
  const fiscal = [config.empresa_crib ? `${t.crib}: ${config.empresa_crib}` : '', config.empresa_ob_nr ? `${t.obNr} ${config.empresa_ob_nr}` : '']
    .filter(Boolean).join('   ·   ');
  ticket.linea(fiscal, { tam: 7, color: GRIS });

  // ---------- Título y número ----------
  ticket.separador('grueso');
  ticket.linea(t.bon, { tam: 10.5, fuente: 'Helvetica-Bold', gap: 2 });
  ticket.linea(`${t.numero} ${d.numero}`, { tam: 9, fuente: 'Helvetica-Bold' });
  ticket.separador('fino');

  ticket.par(t.fecha.replace(/:$/, ''), d.fecha, { tam: 7.5, wDer: 110 });
  if (d.cajero) ticket.par(t.cajero, d.cajero, { tam: 7.5, wDer: 110 });
  if (d.clienteNombre) ticket.par(t.cliente, d.clienteNombre, { tam: 7.5, wDer: 110 });

  // ---------- Ítems ----------
  ticket.separador('fino');
  ticket.par(`${t.cantidad}  ${t.descripcion}`, t.subtotal, { tam: 6.5, fuente: 'Helvetica-Bold', color: GRIS, wDer: 60, gap: 3 });
  ticket.separador('fino');
  let piezas = 0;
  d.items.forEach(item => {
    const cant = +item.cantidad || 0;
    piezas += cant;
    ticket.linea(`${cant} x  ${item.descripcion || t.sinDescripcion}`, { tam: 8, align: 'left', gap: 0.5 });
    if (item.codigo) ticket.linea(`${t.codigo} ${item.codigo}`, { tam: 6.5, align: 'left', color: GRIS, gap: 0.5, x: MARGEN + 8 });
    ticket.par(`      ${cant} x ${item.precio.toFixed(2)}`, imp(item.precio * cant), { tam: 8, fuenteDer: 'Helvetica-Bold', wDer: 68, gap: 3 });
  });

  // ---------- Totales ----------
  ticket.separador('grueso');
  if (d.impuesto > 0) {
    ticket.par(t.subtotal, imp(d.subtotal), { tam: 8, wDer: 72 });
    ticket.par(`${config.impuesto_nombre || 'OB'} ${d.impuestoPct}%`, imp(d.impuesto), { tam: 8, wDer: 72 });
    ticket.separador('fino');
  }
  ticket.par(`${t.totalPagar} ${d.moneda}`, imp(d.total), { tam: 11, fuente: 'Helvetica-Bold', wDer: 82, gap: 2 });
  ticket.linea(`(${simO} ${d.totalOtro.toFixed(2)})`, { tam: 7.5, color: GRIS, align: 'right' });
  ticket.separador('doble');

  // ---------- Forma de pago ----------
  ticket.linea(t.formaPago, { tam: 7.5, fuente: 'Helvetica-Bold', align: 'left', gap: 3 });
  d.pagos.forEach(p => {
    let etiqueta = p.etiqueta;
    if (p.moneda && p.moneda !== d.moneda) etiqueta += `   ${p.moneda === 'USD' ? '$' : 'XCG'} ${p.entregado.toFixed(2)}`;
    ticket.par(etiqueta, imp(p.monto), { tam: 8, wDer: 72, gap: 1 });
  });
  ticket.separador('fino');
  ticket.par(t.recibido, imp(d.recibido), { tam: 8.5, fuente: 'Helvetica-Bold', wDer: 72 });
  if (d.cambio && d.cambio.monto > 0.005)
    ticket.par(t.vuelto, imp(d.cambio.monto, d.cambio.moneda === 'USD' ? '$' : 'XCG'), { tam: 10, fuente: 'Helvetica-Bold', wDer: 82, gap: 2 });
  ticket.separador('doble');

  // ---------- Pie ----------
  ticket.linea(`${t.articulos}: ${d.items.length}    ${t.piezas}: ${piezas}`, { tam: 7, color: GRIS });
  ticket.linea(`${t.tasaUsada}: 1 USD = ${(+d.tasa).toFixed(2)} XCG`, { tam: 7, color: GRIS });
  if (d.concepto) { ticket.separador('fino'); ticket.linea(d.concepto, { tam: 7, align: 'left' }); }
  ticket.separador('fino');
  ticket.linea(config.bon_mensaje || t.gracias, { tam: 9, fuente: 'Helvetica-Bold', gap: 3 });
  ticket.linea(config.bon_politica, { tam: 6.5, color: GRIS });
  if (d.numero) {
    ticket.espacio(5);
    ticket.codigoBarras(d.numero, 28);
    ticket.linea(d.numero, { tam: 7.5, fuente: 'Helvetica-Bold', gap: 0 });
  }
  ticket.espacio(14);

  doc.addPage({ size: [ANCHO, Math.ceil(ticket.alto() + MARGEN * 2)], margin: MARGEN });
  ticket.pintar(MARGEN);
}

module.exports = { generarBon };
