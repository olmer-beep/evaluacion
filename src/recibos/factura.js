// ============================================================
//  INVOICE / FACTURA A4 — mismo diseño que sistema-facturacion
// ============================================================
const { lum, fechaAMPM, rutaImagen, txt } = require('./comun');

function generarFactura(doc, d, config, t) {
  const PRIMARY = /^#[0-9a-f]{6}$/i.test(config.empresa_color_principal || '') ? config.empresa_color_principal : '#1e293b';
  const ACCENT  = /^#[0-9a-f]{6}$/i.test(config.empresa_color_acento || '') ? config.empresa_color_acento : '#0ea5e9';
  const DARK = '#0f172a', MUTED = '#64748b', LIGHT = '#f1f5f9', BORDER = '#e2e8f0';
  const HEADER_TEXT = lum(PRIMARY) > 145 ? '#0f172a' : '#ffffff';
  const HEADER_SUB  = lum(PRIMARY) > 145 ? '#334155' : '#cbd5e1';
  const mP = d.moneda === 'USD' ? '$ ' : 'XCG ', mR = d.moneda === 'USD' ? 'XCG ' : '$ ';

  // ---------- Encabezado ----------
  doc.rect(0, 0, doc.page.width, 130).fill(PRIMARY);
  doc.rect(0, 130, doc.page.width, 6).fill(ACCENT);

  let textoX = 50;
  const logo = rutaImagen(config.empresa_logo);
  let logoColocado = false;
  if (logo) {
    try { doc.image(logo, 50, 33, { fit: [95, 64], align: 'left', valign: 'center' }); textoX = 160; logoColocado = true; }
    catch (e) { /* logo ilegible: se usan las iniciales */ }
  }
  if (!logoColocado) {
    const iniciales = (config.empresa_nombre || 'ME').split(/\s+/).map(w => w[0]).filter(Boolean).join('').substring(0, 3).toUpperCase();
    doc.roundedRect(50, 33, 64, 64, 12).fill(ACCENT);
    doc.fillColor(lum(ACCENT) > 145 ? '#0f172a' : '#ffffff').fontSize(26).font('Helvetica-Bold')
       .text(txt(iniciales), 50, 54, { width: 64, align: 'center' });
    textoX = 130;
  }

  const nombreEmpresa = txt(config.empresa_nombre || 'Mi Empresa');
  const anchoNombre = 385 - textoX;
  const fsNombre = nombreEmpresa.length > 24 ? 15 : nombreEmpresa.length > 18 ? 18 : 22;
  const yNombre = fsNombre >= 22 ? 40 : (fsNombre >= 18 ? 44 : 48);
  doc.fillColor(HEADER_TEXT).fontSize(fsNombre).font('Helvetica-Bold')
     .text(nombreEmpresa, textoX, yNombre, { width: anchoNombre, lineBreak: false, ellipsis: true });
  doc.fontSize(10).font('Helvetica').fillColor(HEADER_SUB).text(txt(config.empresa_subtitulo), textoX, 68, { width: anchoNombre });
  doc.fontSize(9).text(txt(config.empresa_contacto), textoX, 85, { width: anchoNombre, lineBreak: false, ellipsis: true });
  if (config.empresa_direccion) doc.text(txt(config.empresa_direccion), textoX, 98, { width: anchoNombre, lineBreak: false, ellipsis: true });
  const lineaFiscal = [config.empresa_crib ? `${t.crib}: ${config.empresa_crib}` : '', config.empresa_ob_nr ? `${t.obNr} ${config.empresa_ob_nr}` : '']
    .filter(Boolean).join('    ·    ');
  if (lineaFiscal) doc.fontSize(7.5).fillColor(HEADER_SUB).text(txt(lineaFiscal), textoX, 112, { width: anchoNombre, lineBreak: false, ellipsis: true });

  doc.fillColor(HEADER_TEXT).fontSize(30).font('Helvetica-Bold').text(t.factura, 400, 36, { width: 150, align: 'right' });
  doc.fontSize(11).font('Helvetica').text(`${t.numero} ${d.numero}`, 400, 72, { width: 150, align: 'right' });
  doc.fontSize(9).fillColor(HEADER_SUB).text(d.fecha, 400, 88, { width: 150, align: 'right' });

  // Sello: las ventas de la caja se registran ya cobradas
  doc.font('Helvetica-Bold').fontSize(8.5);
  const anchoSello = Math.max(72, doc.widthOfString(t.estadoPagada) + 22);
  doc.roundedRect(550 - anchoSello, 104, anchoSello, 18, 9).fill('#16a34a');
  doc.fillColor('#ffffff').text(t.estadoPagada, 550 - anchoSello, 110, { width: anchoSello, align: 'center' });

  // ---------- Cliente + moneda ----------
  let y = 165;
  doc.roundedRect(50, y, 290, 95, 6).fillAndStroke(LIGHT, BORDER);
  doc.fillColor(MUTED).fontSize(8).font('Helvetica-Bold').text(t.facturarA, 62, y + 12);
  doc.fillColor(DARK).fontSize(14).font('Helvetica-Bold').text(txt(d.clienteNombre || t.clienteMostrador), 62, y + 26, { width: 270 });
  if (d.cajero) doc.fontSize(9).font('Helvetica').fillColor(MUTED).text(txt(`${t.atendidoPor}: ${d.cajero}`), 62, y + 50, { width: 270 });

  doc.roundedRect(355, y, 195, 95, 6).fillAndStroke(LIGHT, BORDER);
  doc.fillColor(MUTED).fontSize(8).font('Helvetica-Bold').text(t.fecha, 367, y + 14);
  doc.fillColor(DARK).fontSize(10).font('Helvetica').text(d.fecha, 367, y + 28, { width: 175 });
  doc.fillColor(MUTED).fontSize(8).font('Helvetica-Bold').text(t.moneda, 367, y + 56);
  doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold').text(d.moneda === 'USD' ? t.monedaUSD : t.monedaXG, 367, y + 70);

  // ---------- Tabla de ítems ----------
  y = 290;
  const tableW = 500, tableX = 50;
  const COL = { desc: 60, cant: 320, precio: 375, sub: 460 };
  const W_CANT = 45, W_PRECIO = 80, W_SUB = 85;
  const drawTableHeader = () => {
    doc.rect(tableX, y, tableW, 24).fill(PRIMARY);
    doc.fillColor(lum(PRIMARY) > 145 ? '#0f172a' : '#ffffff').fontSize(8.5).font('Helvetica-Bold');
    doc.text(t.descripcion.toUpperCase(), COL.desc, y + 8, { width: 240 });
    doc.text(t.cantidad.toUpperCase(), COL.cant, y + 8, { width: W_CANT, align: 'center' });
    doc.text(t.precio.toUpperCase(), COL.precio, y + 8, { width: W_PRECIO, align: 'right' });
    doc.text(t.subtotal.toUpperCase(), COL.sub, y + 8, { width: W_SUB, align: 'right' });
    y += 24;
  };
  drawTableHeader();

  const IMG_W = 26;
  d.items.forEach((item, idx) => {
    const descripcion = txt(item.descripcion || t.sinDescripcion);
    const hasCode = !!item.codigo, hasImage = !!item.imagen;
    const txtX = hasImage ? COL.desc + IMG_W + 8 : COL.desc;
    const txtW = hasImage ? 250 - IMG_W - 8 : 250;
    doc.font('Helvetica').fontSize(9.5);
    const descHeight = doc.heightOfString(descripcion, { width: txtW });
    const rowH = Math.max(hasImage ? IMG_W + 8 : 30, descHeight + (hasCode ? 12 : 0) + 12);
    if (y + rowH > doc.page.height - 60) { doc.addPage(); y = 50; drawTableHeader(); }
    if (idx % 2 === 1) doc.rect(tableX, y, tableW, rowH).fill('#f8fafc');
    if (hasImage) {
      try { doc.image(item.imagen, COL.desc, y + Math.floor((rowH - IMG_W) / 2), { fit: [IMG_W, IMG_W], align: 'center', valign: 'center' }); } catch (e) { /* omitir */ }
    }
    const textoY = descHeight < 14 && !hasCode ? y + (rowH - 11) / 2 : y + 7;
    doc.fillColor(DARK).font('Helvetica').fontSize(9.5).text(descripcion, txtX, textoY, { width: txtW });
    if (hasCode) doc.fillColor(MUTED).fontSize(7.5).text(txt(`${t.codigo}: ${item.codigo}`), txtX, y + 7 + descHeight + 1, { width: txtW });
    const numY = y + (rowH - 10) / 2;
    doc.fillColor(DARK).fontSize(9.5).font('Helvetica');
    doc.text(String(item.cantidad), COL.cant, numY, { width: W_CANT, align: 'center' });
    doc.text(`${mP}${item.precio.toFixed(2)}`, COL.precio, numY, { width: W_PRECIO, align: 'right' });
    doc.font('Helvetica-Bold').text(`${mP}${(item.precio * item.cantidad).toFixed(2)}`, COL.sub, numY, { width: W_SUB, align: 'right' });
    doc.moveTo(tableX, y + rowH).lineTo(tableX + tableW, y + rowH).strokeColor(BORDER).lineWidth(0.5).stroke();
    y += rowH;
  });
  doc.moveTo(tableX, y).lineTo(tableX + tableW, y).strokeColor(PRIMARY).lineWidth(1.5).stroke();

  // ---------- Totales ----------
  y += 20;
  const TXTBOX = lum(PRIMARY) > 145 ? '#0f172a' : '#ffffff';
  const TXTBOXSUB = lum(PRIMARY) > 145 ? '#475569' : '#cbd5e1';
  const hayImpuesto = d.impuesto > 0;
  const cajaAlto = hayImpuesto ? 116 : 86;
  if (y + cajaAlto + 30 > doc.page.height - 80) { doc.addPage(); y = 50; }
  doc.fillColor(MUTED).fontSize(9).font('Helvetica');
  doc.text(`${t.totalItems}: ${d.items.length}`, 50, y + 12);
  doc.text(`${t.cantidadTotal}: ${d.items.reduce((a, b) => a + (+b.cantidad || 0), 0)}`, 50, y + 28);
  doc.text(`${t.tasaUsada}: 1 USD = ${(+d.tasa).toFixed(2)} XCG`, 50, y + 44);

  doc.roundedRect(330, y, 220, cajaAlto, 6).fill(PRIMARY);
  if (hayImpuesto) {
    doc.fillColor(TXTBOXSUB).fontSize(9).font('Helvetica').text(`${t.subtotal}:`, 345, y + 10);
    doc.text(`${mP}${d.subtotal.toFixed(2)}`, 345, y + 10, { width: 190, align: 'right' });
    doc.text(txt(`${config.impuesto_nombre || 'OB'} (${d.impuestoPct}%):`), 345, y + 26);
    doc.text(`${mP}${d.impuesto.toFixed(2)}`, 345, y + 26, { width: 190, align: 'right' });
    doc.moveTo(345, y + 44).lineTo(535, y + 44).strokeColor(TXTBOXSUB).lineWidth(0.5).stroke();
    doc.fillColor(TXTBOXSUB).fontSize(10).text(t.totalPagar, 345, y + 52);
    doc.fillColor(TXTBOX).fontSize(20).font('Helvetica-Bold').text(`${mP}${d.total.toFixed(2)}`, 345, y + 66, { width: 190, align: 'right' });
    doc.fillColor(TXTBOXSUB).fontSize(8).font('Helvetica').text(`${t.equivalente}: ${mR}${d.totalOtro.toFixed(2)}`, 345, y + 90, { width: 190, align: 'right' });
  } else {
    doc.fillColor(TXTBOXSUB).fontSize(10).font('Helvetica').text(t.totalPagar, 345, y + 12);
    doc.fillColor(TXTBOX).fontSize(22).font('Helvetica-Bold').text(`${mP}${d.total.toFixed(2)}`, 345, y + 28, { width: 190, align: 'right' });
    doc.fillColor(TXTBOXSUB).fontSize(8).font('Helvetica').text(`${t.equivalente}: ${mR}${d.totalOtro.toFixed(2)}`, 345, y + 56, { width: 190, align: 'right' });
  }
  y += cajaAlto + 20;

  // ---------- Pagado ----------
  const lineaAlto = 14;
  const cajaPagoAlto = 54 + d.pagos.length * lineaAlto + (d.cambio ? lineaAlto : 0) + 8;
  if (y + cajaPagoAlto > doc.page.height - 110) { doc.addPage(); y = 50; }
  doc.roundedRect(50, y, 500, cajaPagoAlto, 6).fillAndStroke('#d1fae5', '#fbbf24');
  doc.fillColor('#065f46').fontSize(9).font('Helvetica-Bold').text(t.pagado, 60, y + 10);
  doc.font('Helvetica').fontSize(14).text(`${mP}${d.total.toFixed(2)}`, 60, y + 22);
  doc.fontSize(9).font('Helvetica-Bold').text(t.sinSaldo, 300, y + 10);
  doc.fontSize(14).text(`${mP}0.00`, 300, y + 22);
  let yp = y + 48;
  doc.moveTo(60, yp).lineTo(540, yp).strokeColor('#fbbf24').lineWidth(0.5).stroke();
  yp += 5;
  doc.fillColor('#065f46').fontSize(7.5).font('Helvetica-Bold').text(t.historialPagos, 60, yp);
  yp += lineaAlto - 2;
  d.pagos.forEach((p, i) => {
    const extra = p.moneda && p.moneda !== d.moneda ? `   (${t.recibido}: ${p.moneda === 'USD' ? '$' : 'XCG'} ${p.entregado.toFixed(2)})` : '';
    doc.fillColor('#78350f').fontSize(8).font('Helvetica').text(txt(`${i + 1}.  ${d.fecha}   ·   ${p.etiqueta}${extra}`), 62, yp, { width: 340, lineBreak: false, ellipsis: true });
    doc.font('Helvetica-Bold').text(`${mP}${p.monto.toFixed(2)}`, 400, yp, { width: 138, align: 'right' });
    yp += lineaAlto;
  });
  if (d.cambio) {
    doc.fillColor('#78350f').fontSize(8).font('Helvetica').text(t.vuelto, 62, yp, { width: 340 });
    doc.font('Helvetica-Bold').text(`${d.cambio.moneda === 'USD' ? '$ ' : 'XCG '}${d.cambio.monto.toFixed(2)}`, 400, yp, { width: 138, align: 'right' });
  }
  y += cajaPagoAlto + 10;

  // ---------- Notas ----------
  if (d.concepto) {
    if (y + 60 > doc.page.height - 100) { doc.addPage(); y = 50; }
    doc.roundedRect(50, y, 500, 50, 6).fillAndStroke('#fef9c3', '#fde68a');
    doc.fillColor('#854d0e').fontSize(8).font('Helvetica-Bold').text(t.notas, 60, y + 8);
    doc.fillColor(DARK).fontSize(9).font('Helvetica').text(txt(d.concepto), 60, y + 20, { width: 480 });
  }

  // ---------- Pie en todas las páginas ----------
  const rango = doc.bufferedPageRange();
  for (let i = 0; i < rango.count; i++) {
    doc.switchToPage(rango.start + i);
    const yPie = doc.page.height - 90;
    doc.moveTo(50, yPie).lineTo(550, yPie).strokeColor(BORDER).lineWidth(1).stroke();
    if (i === rango.count - 1)
      doc.fillColor(MUTED).fontSize(9).font('Helvetica-Oblique').text(txt(config.bon_mensaje || t.gracias), 50, yPie + 8, { align: 'center', width: 500, lineBreak: false });
    doc.fillColor(MUTED).fontSize(7).font('Helvetica')
       .text(txt(`${config.empresa_nombre || ''} — ${t.generado} ${fechaAMPM()}`), 50, yPie + 24, { align: 'center', width: 500, lineBreak: false });
    if (rango.count > 1)
      doc.font('Helvetica-Bold').text(`${t.pagina} ${i + 1} ${t.dePag} ${rango.count}`, 50, yPie + 36, { align: 'center', width: 500, lineBreak: false });
  }
}

module.exports = { generarFactura };
