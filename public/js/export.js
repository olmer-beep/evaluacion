'use strict';
/* ════════════════════════════════════════════════════════════
   Exportación a PDF, Excel e impresión del módulo activo.
   Cada módulo devuelve con exportData():
   { title, subtitle, filename, landscape?, summary:[[k,v]],
     sections:[{ title, head:[], body:[[]], foot?:[], types?:['text'|'money'|'int'|'pct'|'num'] }],
     signatures?:[nombres] }
   Las celdas 'money' llevan { v: centavos, cur } o número en unidades.
   ════════════════════════════════════════════════════════════ */

const Exporter = (() => {
  const BRAND = [14, 42, 51], ACC = [27, 127, 140], SUN = [242, 183, 5];

  /* Helvetica de jsPDF solo trae WinAnsi: sustituimos símbolos fuera de ese juego */
  const WIN = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
  const MAP = { 'π': 'pi', '√': 'sqrt', '∛': 'cbrt', '−': '-', '≈': '~', '★': '*', '≠': '!=', '≤': '<=', '≥': '>=', '∞': 'inf', 'ⁿ': '^n', '₂': '2', 'ˣ': '^x', 'ʸ': '^y', '✓': 'OK', '⌫': '', '₁': '1', '₃': '3', 'σ': 's', '⁻': '-', '¹': '1' };
  const pdfSafe = s => String(s ?? '').replace(/[^\x00-\xff]/g, c => MAP[c] ?? (WIN.includes(c) ? c : '?'));

  function cellText(v, type) {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'object' && v.f !== undefined) v = v.v;      // celda con fórmula: en PDF va el valor
    if (type === 'money') return typeof v === 'object' ? money(v.v, v.cur) : fmtNum(v);
    if (type === 'pct') return fmtNum(v, 0) + '%';
    if (type === 'int') return fmtNum(v, 0);
    if (type === 'num') return typeof v === 'number' ? String(+v.toPrecision(12)) : String(v);
    return String(v);
  }

  function stamp() { return new Date().toLocaleString(loc(), { dateStyle: 'medium', timeStyle: 'short' }); }

  /* ── PDF ───────────────────────────────────────────────── */
  function buildPdf(d) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: d.landscape ? 'landscape' : 'portrait' });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 40;

    const header = () => {
      doc.setFillColor(...BRAND); doc.rect(0, 0, W, 58, 'F');
      doc.setFillColor(...SUN); doc.rect(0, 58, W, 3, 'F');
      doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
      doc.text('GestRend', M, 36);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(169, 198, 201);
      doc.text(pdfSafe(t('generated') + ': ' + stamp()), W - M, 36, { align: 'right' });
    };
    header();
    doc.setTextColor(16, 38, 45); doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
    doc.text(pdfSafe(d.title), M, 92);
    let y = 92;
    if (d.subtitle) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(91, 113, 119);
      doc.text(pdfSafe(d.subtitle), M, 110); y = 110;
    }
    y += 16;

    if (d.summary && d.summary.length) {
      doc.autoTable({
        startY: y, margin: { left: M, right: M, top: 76 }, theme: 'plain',
        body: d.summary.map(([k, v]) => [pdfSafe(k), pdfSafe(v)]),
        styles: { fontSize: 10, cellPadding: { top: 4, bottom: 4, left: 8, right: 8 }, textColor: [16, 38, 45] },
        columnStyles: { 0: { textColor: [91, 113, 119], cellWidth: 190 }, 1: { fontStyle: 'bold' } },
        alternateRowStyles: { fillColor: [243, 247, 246] },
        willDrawPage: header,
      });
      y = doc.lastAutoTable.finalY + 20;
    }

    for (const s of d.sections) {
      if (y > H - 110) { doc.addPage(); header(); y = 86; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...ACC);
      doc.text(pdfSafe(s.title), M, y); y += 8;
      const types = s.types || [];
      const colStyles = {};
      types.forEach((ty, i) => { if (ty !== 'text') colStyles[i] = { halign: 'right' }; });
      doc.autoTable({
        startY: y, margin: { left: M, right: M, top: 76 },
        head: [s.head.map(pdfSafe)],
        body: s.body.map(r => r.map((c, i) => pdfSafe(cellText(c, types[i])))),
        foot: s.foot ? [s.foot.map((c, i) => pdfSafe(cellText(c, types[i])))] : undefined,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 5, lineColor: [214, 225, 223], lineWidth: .5, textColor: [16, 38, 45], overflow: 'linebreak' },
        headStyles: { fillColor: ACC, textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [227, 236, 234], textColor: [16, 38, 45], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247, 250, 249] },
        columnStyles: colStyles,
        showFoot: 'lastPage',
        willDrawPage: header,
        didParseCell: h => { if (h.section !== 'body' && types[h.column.index] && types[h.column.index] !== 'text') h.cell.styles.halign = 'right'; },
      });
      y = doc.lastAutoTable.finalY + 24;
    }

    if (d.signatures && d.signatures.length) {
      const colW = (W - M * 2 - 30) / 2;
      d.signatures.forEach((name, i) => {
        const col = i % 2;
        if (col === 0 && y > H - 90) { doc.addPage(); header(); y = 100; }
        if (col === 0) y += 34;
        const x = M + col * (colW + 30);
        doc.setDrawColor(150); doc.setLineWidth(.6); doc.line(x, y, x + colW, y);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(91, 113, 119);
        doc.text(pdfSafe(t('pfirma') + ': ' + name), x, y + 13);
        if (col === 1) y += 14;
      });
    }

    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(140);
      doc.text(pdfSafe(t('page') + ' ' + i + ' / ' + n), W - M, H - 20, { align: 'right' });
      doc.text('GestRend', M, H - 20);
    }
    return doc;
  }

  /* ── Excel ─────────────────────────────────────────────── */
  const FMT = { money: '#,##0.00', int: '#,##0', pct: '0"%"', num: 'General' };
  function sheetName(s, used) {
    let n = String(s).replace(/[\[\]:*?/\\]/g, ' ').slice(0, 28).trim() || 'Hoja';
    let k = n, i = 2;
    while (used.has(k.toLowerCase())) k = n.slice(0, 26) + ' ' + i++;
    used.add(k.toLowerCase());
    return k;
  }
  /* {v, f:'C{r}*D{r}'} → fórmula de Excel; {r} es la fila actual y {r0}/{r1} el rango del cuerpo */
  function cellValue(v, type, rows) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object' && v.f !== undefined)
      return { formula: v.f.replace(/\{r\}/g, rows.r).replace(/\{r0\}/g, rows.r0).replace(/\{r1\}/g, rows.r1), result: v.v };
    if (type === 'money') return typeof v === 'object' ? v.v / 100 : v;
    return v;
  }

  async function buildXlsx(d) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'GestRend'; wb.created = new Date();
    const used = new Set();
    const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B7F8C' } };
    const footFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3ECEA' } };
    const border = { bottom: { style: 'thin', color: { argb: 'FFD6E1DF' } } };

    const titleRows = ws => {
      ws.addRow([d.title]).font = { bold: true, size: 15, color: { argb: 'FF0E2A33' } };
      if (d.subtitle) ws.addRow([d.subtitle]).font = { color: { argb: 'FF5B7177' } };
      ws.addRow([t('generated') + ': ' + stamp()]).font = { size: 9, color: { argb: 'FF89A2A6' } };
      ws.addRow([]);
    };

    if (d.summary && d.summary.length) {
      const ws = wb.addWorksheet(sheetName(t('summary'), used));
      titleRows(ws);
      d.summary.forEach(([k, v]) => {
        const r = ws.addRow([k, v]);
        r.getCell(1).font = { color: { argb: 'FF5B7177' } };
        r.getCell(2).font = { bold: true };
      });
      ws.getColumn(1).width = 34; ws.getColumn(2).width = 30;
    }

    for (const s of d.sections) {
      const ws = wb.addWorksheet(sheetName(s.title, used));
      titleRows(ws);
      ws.addRow([s.title]).font = { bold: true, size: 12, color: { argb: 'FF1B7F8C' } };
      const types = s.types || [];
      const hr = ws.addRow(s.head);
      hr.eachCell(c => { c.fill = headFill; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.alignment = { vertical: 'middle' }; });
      hr.height = 20;
      const rows = { r0: hr.number + 1, r1: hr.number + s.body.length };
      const isNum = c => typeof c.value === 'number' || (c.value && c.value.formula);
      s.body.forEach((row, k) => {
        const r = ws.addRow(row.map((c, i) => cellValue(c, types[i], { ...rows, r: rows.r0 + k })));
        r.eachCell((c, i) => {
          c.border = border;
          c.alignment = { vertical: 'top', wrapText: true };
          const ty = types[i - 1];
          if (ty && FMT[ty] && isNum(c)) c.numFmt = FMT[ty];
        });
      });
      if (s.foot) {
        const r = ws.addRow(s.foot.map((c, i) => cellValue(c, types[i], { ...rows, r: rows.r1 + 1 })));
        r.eachCell((c, i) => {
          c.fill = footFill; c.font = { bold: true };
          const ty = types[i - 1];
          if (ty && FMT[ty] && isNum(c)) c.numFmt = FMT[ty];
        });
      }
      s.head.forEach((h, i) => {
        let w = String(h).length;
        s.body.forEach(r => { w = Math.max(w, Math.min(60, String(cellText(r[i], types[i])).length)); });
        ws.getColumn(i + 1).width = Math.max(10, w + 3);
      });
    }

    if (d.signatures && d.signatures.length) {
      const ws = wb.worksheets[0];
      ws.addRow([]);
      d.signatures.forEach(n => { ws.addRow([]); ws.addRow([t('pfirma') + ': ' + n, '______________________']); });
    }
    return wb.xlsx.writeBuffer();
  }

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const safeName = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').toLowerCase();

  async function runWith(d, kind) {
    if (!d || !d.sections || !d.sections.some(s => s.body.length)) { toast(t('expNone'), 'err'); return; }
    try {
      const name = safeName(d.filename || d.title);
      if (kind === 'pdf') { buildPdf(d).save(name + '.pdf'); toast(t('exported')); }
      else if (kind === 'print') {
        const doc = buildPdf(d);
        doc.autoPrint();
        const w = window.open(doc.output('bloburl'), '_blank');
        if (!w) doc.save(name + '.pdf');
      } else {
        const buf = await buildXlsx(d);
        download(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name + '.xlsx');
        toast(t('exported'));
      }
    } catch (e) {
      console.error(e);
      toast(t('expFail'), 'err');
    }
  }

  return {
    run(kind) {
      const m = App.modules[App.mod];
      runWith(m.exportData ? m.exportData() : null, kind);
    },
    runWith,
  };
})();
