/**
 * ============================================================
 *  GestRend — Sistema de gestión para el comercio
 *  Versión 6.0 — Tareas · Caja USD/XCG · Calculadora · PDF/Excel
 * ============================================================
 */

'use strict';

const express     = require('express');
const fs          = require('fs');
const path        = require('path');
const crypto      = require('crypto');
const PDFDocument = require('pdfkit');
const { TR }             = require('./src/recibos/textos');
const { datosVenta, IMG_DIR } = require('./src/recibos/comun');
const { generarBon }     = require('./src/recibos/bon');
const { generarFactura } = require('./src/recibos/factura');

const CONFIG = {
  port:     process.env.PORT || 5000,
  host:     process.env.HOST || 'localhost',
  appName:  'GestRend — Gestión del comercio',
  public:   path.join(__dirname, 'public'),
  stores: {
    data: path.join(__dirname, 'data.json'),   // registro diario de tareas
    caja: path.join(__dirname, 'caja.json'),   // caja registradora
    productos: path.join(__dirname, 'productos.json'),
    config: path.join(__dirname, 'config.json'),  // datos de la empresa para los recibos
  },
};

// Librerías del navegador servidas desde node_modules (funciona sin internet)
const VENDOR = {
  'jspdf.js':     'jspdf/dist/jspdf.umd.min.js',
  'autotable.js': 'jspdf-autotable/dist/jspdf.plugin.autotable.min.js',
  'exceljs.js':   'exceljs/dist/exceljs.min.js',
};

const app = express();
app.use(express.json({ limit: '5mb' }));

const log = {
  info:  msg => console.log(`[INFO]  ${new Date().toISOString()} » ${msg}`),
  error: msg => console.error(`[ERROR] ${new Date().toISOString()} » ${msg}`),
  start: msg => console.log(`\n  ✦ ${msg}\n`),
};

// ─── STORES (archivos JSON) ─────────────────────────────────
function readStore(name) {
  try { return JSON.parse(fs.readFileSync(CONFIG.stores[name], 'utf-8')); }
  catch { return {}; }
}
function writeStore(name, data) {
  try { fs.writeFileSync(CONFIG.stores[name], JSON.stringify(data, null, 2), 'utf-8'); return true; }
  catch (e) { log.error(e.message); return false; }
}
function mtime(name) {
  try { return fs.statSync(CONFIG.stores[name]).mtimeMs; } catch { return 0; }
}
for (const name of Object.keys(CONFIG.stores))
  if (!fs.existsSync(CONFIG.stores[name])) writeStore(name, {});

// ─── API ────────────────────────────────────────────────────
app.get('/api/store/:name', (req, res) => {
  const { name } = req.params;
  if (!CONFIG.stores[name]) return res.status(404).json({ error: 'unknown store' });
  res.json({ ts: mtime(name), data: readStore(name) });
});
app.post('/api/store/:name', (req, res) => {
  const { name } = req.params;
  if (!CONFIG.stores[name]) return res.status(404).json({ error: 'unknown store' });
  if (typeof req.body !== 'object' || req.body === null) return res.status(400).json({ error: 'invalid body' });
  writeStore(name, req.body) ? res.json({ ok: true, ts: mtime(name) }) : res.status(500).json({ error: 'write error' });
});
app.get('/api/ping', (_req, res) => {
  const ts = {};
  for (const name of Object.keys(CONFIG.stores)) ts[name] = mtime(name);
  res.json(ts);
});

// Compatibilidad con la versión anterior
app.get('/api/data',  (_req, res) => res.json(readStore('data')));
app.post('/api/data', (req, res)  => { writeStore('data', req.body) ? res.json({ ok: true }) : res.status(500).json({ error: 'write error' }); });

// ─── Fotos de productos y logo ──────────────────────────────
if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });
app.post('/api/imagen', (req, res) => {
  const m = String(req.body?.data || '').match(/^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return res.status(400).json({ error: 'formato no válido (solo JPG o PNG)' });
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 3 * 1024 * 1024) return res.status(413).json({ error: 'imagen demasiado grande' });
  const name = crypto.randomBytes(8).toString('hex') + (m[1] === 'png' ? '.png' : '.jpg');
  fs.writeFile(path.join(IMG_DIR, name), buf, e => e ? res.status(500).json({ error: 'write error' }) : res.json({ url: '/img/' + name }));
});
app.delete('/api/imagen/:name', (req, res) => {
  if (!/^[a-f0-9]{16}\.(jpg|png)$/.test(req.params.name)) return res.status(400).end();
  fs.unlink(path.join(IMG_DIR, req.params.name), () => res.json({ ok: true }));
});
app.use('/img', express.static(IMG_DIR, { maxAge: '30d', immutable: true }));

// ─── Recibos: bon de caja 80 mm e invoice A4 ────────────────
// Venta de ejemplo para probar el formato desde la pantalla Empresa
function ventaMuestra(caja) {
  const config = readStore('config');
  const prods = (readStore('productos').lista || []).slice(0, 3);
  const items = prods.length
    ? prods.map((p, i) => ({ codigo: p.codigo, nombre: p.nombre, cantidad: i + 1, precio: p.moneda === 'USD' ? Math.round(p.precio * (caja.tasa || 1.79)) : p.precio, imagen: p.imagen }))
    : [{ codigo: 'A-100', nombre: 'Producto de ejemplo', cantidad: 2, precio: 1250 }, { codigo: 'B-200', nombre: 'Otro producto', cantidad: 1, precio: 3500 }];
  const subtotal = items.reduce((a, i) => a + i.precio * i.cantidad, 0);
  const pct = config.impuesto_activo ? (+config.impuesto_porcentaje || 0) : 0;
  const impuesto = Math.round(subtotal * pct / 100);
  const total = subtotal + impuesto;
  const pagoUSD = Math.ceil(total / (caja.tasa || 1.79) / 1000) * 1000;   // billetes de $10
  return {
    id: 'muestra', ts: Date.now(), tipo: 'venta', numero: 'B-000000', metodo: 'cash', moneda: 'XCG', tasa: caja.tasa || 1.79,
    items, subtotal, impuesto, impuestoPct: pct, total, cajero: 'Ana', cliente: '',
    recibido: { USD: { 1000: pagoUSD / 1000 }, XCG: {} },
    cambio: Math.round(pagoUSD * (caja.tasa || 1.79)) - total, cambioMoneda: 'XCG',
  };
}
app.get('/api/recibo/:id', (req, res) => {
  const caja = readStore('caja');
  const mov = req.params.id === 'muestra' ? ventaMuestra(caja)
    : (caja.movs || []).find(m => m.id === req.params.id && m.tipo === 'venta');
  if (!mov) return res.status(404).send('Venta no encontrada');
  const config = readStore('config');
  const idioma = TR[req.query.lang] ? req.query.lang : (TR[config.recibo_idioma] ? config.recibo_idioma : 'es');
  const t = TR[idioma];
  const tipo = req.query.tipo === 'factura' ? 'factura' : 'bon';
  const d = datosVenta(mov, caja, t);

  const doc = tipo === 'bon'
    ? new PDFDocument({ autoFirstPage: false })
    : new PDFDocument({ size: 'A4', margins: { top: 50, left: 50, right: 50, bottom: 20 }, bufferPages: true });
  const nombre = `${tipo === 'bon' ? 'Bon' : 'Invoice'}_${d.numero}.pdf`.replace(/[^\w.-]/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${req.query.dl === '0' ? 'inline' : 'attachment'}; filename=${nombre}`);
  doc.pipe(res);
  try {
    if (tipo === 'bon') generarBon(doc, d, config, t);
    else generarFactura(doc, d, config, t);
  } catch (e) {
    log.error('recibo: ' + e.message);
  }
  doc.end();
});

app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.get('/vendor/:file', (req, res) => {
  const rel = VENDOR[req.params.file];
  if (!rel) return res.status(404).end();
  res.sendFile(path.join(__dirname, 'node_modules', rel));
});
app.use(express.static(CONFIG.public));

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((e, _q, res, _n) => { log.error(e.message); res.status(500).json({ error: 'Server error' }); });

const server = app.listen(CONFIG.port, () => {
  log.start(CONFIG.appName);
  log.info(`http://${CONFIG.host}:${CONFIG.port}`);
});
['SIGTERM', 'SIGINT'].forEach(s => process.on(s, () => server.close(() => process.exit(0))));
