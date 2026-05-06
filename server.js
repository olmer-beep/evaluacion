/**
 * ============================================================
 *  GestRend — Sistema de Gestión de Rendimiento Laboral
 *  Versión 5.0 — Sincronización + Reportes completos
 * ============================================================
 */

'use strict';

const express = require('express');
const fs      = require('fs');
const path    = require('path');

const CONFIG = {
  port:     process.env.PORT    || 5000,
  host:     process.env.HOST    || 'localhost',
  appName:  'GestRend — Gestión de Rendimiento',
  dataFile: path.join(__dirname, 'data.json'),
};

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const log = {
  info:  msg => console.log(`[INFO]  ${new Date().toISOString()} » ${msg}`),
  error: msg => console.error(`[ERROR] ${new Date().toISOString()} » ${msg}`),
  start: msg => console.log(`\n  ✦ ${msg}\n`),
};

// ─── DB ─────────────────────────────────────────────────────
function readDB() {
  try { return JSON.parse(fs.readFileSync(CONFIG.dataFile, 'utf-8')); }
  catch { return {}; }
}
function writeDB(data) {
  try { fs.writeFileSync(CONFIG.dataFile, JSON.stringify(data, null, 2), 'utf-8'); return true; }
  catch (e) { log.error(e.message); return false; }
}
if (!fs.existsSync(CONFIG.dataFile)) writeDB({});

// ─── API ────────────────────────────────────────────────────
app.get('/api/data',  (_req, res) => { try { res.json(readDB()); } catch { res.status(500).json({ error: 'read error' }); } });
app.post('/api/data', (req, res)  => { writeDB(req.body) ? res.json({ ok: true }) : res.status(500).json({ error: 'write error' }); });
app.get('/api/ping',  (_req, res) => { try { res.json({ ts: fs.statSync(CONFIG.dataFile).mtimeMs }); } catch { res.json({ ts: 0 }); } });
app.get('/health',    (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.get('/', (_req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.send(renderApp()); });
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((e, _q, res, _n) => { log.error(e.message); res.status(500).json({ error: 'Server error' }); });

const server = app.listen(CONFIG.port, () => {
  log.start(CONFIG.appName);
  log.info(`http://${CONFIG.host}:${CONFIG.port}`);
});
['SIGTERM','SIGINT'].forEach(s => process.on(s, () => server.close(() => process.exit(0))));

// ═══════════════════════════════════════════════════════════
function renderApp() { return /* html */`
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GestRend</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
/* ── SCREEN VARS ─────────────────────────────────────────── */
:root {
  --bg:#0f1117; --sur:#1a1d27; --sur2:#22263a;
  --brd:rgba(255,255,255,.07);
  --pri:#6366f1; --pri-d:rgba(99,102,241,.15);
  --ok:#22d3a0; --warn:#f59e0b; --err:#f43f5e;
  --tx:#e2e8f0; --mu:#64748b;
  --mono:'JetBrains Mono',monospace;
  --sans:'Outfit',sans-serif;
  --r:12px; --rs:8px;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--sans);background:var(--bg);color:var(--tx);min-height:100vh;overflow-x:hidden}

/* ── TOPBAR ─────────────────────────────────────────────── */
.topbar{background:var(--sur);border-bottom:1px solid var(--brd);padding:0 24px;height:60px;
  display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.brand{display:flex;align-items:center;gap:9px;font-weight:700;font-size:1rem;letter-spacing:-.02em}
.brand-ico{width:28px;height:28px;background:var(--pri);border-radius:7px;display:grid;place-items:center;font-size:14px}
.brand em{color:var(--mu);font-style:normal;font-weight:300}
.tb-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap}

/* ── SYNC ───────────────────────────────────────────────── */
.sync-badge{display:flex;align-items:center;gap:5px;font-size:.7rem;font-family:var(--mono);
  color:var(--mu);padding:4px 9px;background:var(--sur2);border-radius:99px;border:1px solid var(--brd);white-space:nowrap}
.sync-dot{width:6px;height:6px;border-radius:50%;background:var(--mu);flex-shrink:0;transition:background .3s}
.sync-badge.ok .sync-dot{background:var(--ok);box-shadow:0 0 5px var(--ok)}
.sync-badge.saving .sync-dot{background:var(--warn);animation:blink .8s infinite}
.sync-badge.error  .sync-dot{background:var(--err)}
.sync-badge.loading .sync-dot{background:var(--pri);animation:blink .8s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}

/* ── PILL GROUPS ────────────────────────────────────────── */
.pill{display:flex;background:var(--sur2);padding:3px;border-radius:var(--rs);gap:2px}
.tab-btn,.lang-btn{border:none;border-radius:6px;cursor:pointer;font-family:var(--sans);font-weight:500;
  background:transparent;color:var(--mu);transition:all .2s}
.tab-btn{padding:6px 16px;font-size:.82rem;white-space:nowrap}
.lang-btn{padding:5px 8px;font-size:.73rem;font-weight:600}
.tab-btn.active,.lang-btn.active{background:var(--pri);color:#fff}
.tab-btn:not(.active):hover,.lang-btn:not(.active):hover{color:var(--tx);background:rgba(255,255,255,.05)}

/* ── MAIN ───────────────────────────────────────────────── */
.main{padding:22px 24px;max-width:1380px;margin:0 auto}
.sec{display:none;animation:fi .2s ease}.sec.active{display:block}
@keyframes fi{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}

/* ── DATE NAV ───────────────────────────────────────────── */
.date-nav{display:flex;align-items:center;justify-content:space-between;
  background:var(--sur);border:1px solid var(--brd);border-radius:var(--r);padding:13px 20px;margin-bottom:15px}
.date-ctr{display:flex;align-items:center;gap:12px}
.nav-arr{width:34px;height:34px;border:1px solid var(--brd);border-radius:var(--rs);
  background:var(--sur2);color:var(--tx);cursor:pointer;font-size:13px;display:grid;place-items:center;transition:all .2s}
.nav-arr:hover{background:var(--pri-d);border-color:var(--pri);color:var(--pri)}
#fechaActual{background:var(--sur2);border:1px solid var(--brd);border-radius:var(--rs);
  color:var(--tx);padding:6px 11px;font-family:var(--mono);font-size:.86rem;outline:none}
#fechaActual:focus{border-color:var(--pri)}
.date-tag{font-family:var(--mono);font-size:.73rem;background:var(--pri-d);color:#a5b4fc;
  padding:3px 9px;border-radius:99px;border:1px solid rgba(99,102,241,.25)}
.date-act{display:flex;gap:7px;align-items:center}

/* ── ADD BAR ────────────────────────────────────────────── */
.add-bar{display:flex;gap:9px;align-items:center;background:var(--sur);border:1px solid var(--brd);
  border-radius:var(--r);padding:13px 20px;margin-bottom:20px}
.add-lbl{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--mu);white-space:nowrap}
.txt-inp{flex:1;background:var(--sur2);border:1px solid var(--brd);border-radius:var(--rs);
  color:var(--tx);padding:8px 12px;font-family:var(--sans);font-size:.86rem;outline:none;transition:border-color .2s}
.txt-inp:focus{border-color:var(--pri)}
.txt-inp::placeholder{color:var(--mu)}

/* ── BUTTONS ────────────────────────────────────────────── */
.btn{border:none;border-radius:var(--rs);cursor:pointer;font-family:var(--sans);font-weight:600;
  font-size:.83rem;padding:8px 18px;transition:all .2s;white-space:nowrap}
.btn-pri{background:var(--pri);color:#fff}.btn-pri:hover{filter:brightness(1.12);transform:translateY(-1px)}
.btn-prt{background:rgba(99,102,241,.12);color:#a5b4fc;border:1px solid rgba(99,102,241,.25);padding:6px 12px;font-size:.76rem}
.btn-prt:hover{background:var(--pri);color:#fff;border-color:var(--pri)}
.btn-del{background:none;border:1px solid rgba(244,63,94,.3);color:var(--err);border-radius:6px;
  padding:3px 9px;font-family:var(--sans);font-size:.73rem;font-weight:500;cursor:pointer;transition:all .2s}
.btn-del:hover{background:rgba(244,63,94,.1);border-color:var(--err)}

/* ── REPORT SUB-TABS ────────────────────────────────────── */
.rep-tabs{display:flex;gap:6px;margin-bottom:18px}
.rep-tab{background:var(--sur2);border:1px solid var(--brd);border-radius:var(--rs);
  padding:7px 18px;font-size:.82rem;font-weight:600;color:var(--mu);cursor:pointer;transition:all .2s;font-family:var(--sans)}
.rep-tab.active{background:var(--pri);color:#fff;border-color:var(--pri)}
.rep-tab:not(.active):hover{color:var(--tx);border-color:rgba(99,102,241,.3)}

/* ── WORKER GRID ────────────────────────────────────────── */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(350px,1fr));gap:16px}

/* ── CARD ───────────────────────────────────────────────── */
.card{background:var(--sur);border:1px solid var(--brd);border-radius:var(--r);padding:18px;
  position:relative;transition:border-color .2s,box-shadow .2s}
.card:hover{border-color:rgba(99,102,241,.3);box-shadow:0 4px 18px rgba(0,0,0,.35)}
.card-acc{position:absolute;top:0;left:0;right:0;height:3px;border-radius:var(--r) var(--r) 0 0}
.card-hdr{display:flex;align-items:center;justify-content:space-between;margin:5px 0 11px}
.w-name{font-weight:700;font-size:.97rem}
.w-pct{font-family:var(--mono);font-size:.9rem;font-weight:500}
.ph{color:var(--ok)}.pm{color:var(--warn)}.pl{color:var(--err)}
.card-act{display:flex;gap:5px;align-items:center}
.rm-card{position:absolute;top:11px;right:11px;background:none;border:none;color:var(--mu);
  cursor:pointer;font-size:16px;padding:2px 5px;border-radius:5px;transition:all .15s}
.rm-card:hover{color:var(--err);background:rgba(244,63,94,.1)}

/* ── PROGRESS ───────────────────────────────────────────── */
.prog-t{background:rgba(255,255,255,.06);border-radius:99px;height:5px;margin-bottom:14px;overflow:hidden}
.prog-f{height:100%;border-radius:99px;transition:width .5s cubic-bezier(.4,0,.2,1)}
.fh{background:var(--ok)}.fm{background:var(--warn)}.fl{background:var(--err)}

/* ── TASK LIST ──────────────────────────────────────────── */
.task-list{display:flex;flex-direction:column;gap:2px;margin-bottom:12px}
.task-row{display:flex;align-items:center;gap:8px;padding:5px 7px;border-radius:7px;transition:background .15s}
.task-row:hover{background:var(--sur2)}
.task-chk{width:14px;height:14px;accent-color:var(--pri);cursor:pointer;flex-shrink:0}
.task-lbl{flex:1;font-size:.84rem;cursor:pointer;user-select:none}
.task-lbl.done{text-decoration:line-through;color:var(--mu)}
.btn-x{background:none;border:none;color:var(--mu);cursor:pointer;font-size:14px;padding:2px 4px;border-radius:4px;transition:all .15s}
.btn-x:hover{color:var(--err);background:rgba(244,63,94,.1)}

/* ── ADD TASK ───────────────────────────────────────────── */
.add-tw{position:relative;margin-bottom:11px}
.add-tr{display:flex;gap:6px}
.task-inp{flex:1;background:var(--sur2);border:1px solid var(--brd);border-radius:6px;
  color:var(--tx);padding:6px 9px;font-family:var(--sans);font-size:.81rem;outline:none;transition:border-color .2s}
.task-inp:focus{border-color:var(--pri)}
.task-inp::placeholder{color:var(--mu)}
.btn-plus{background:var(--pri-d);color:var(--pri);border:1px solid transparent;border-radius:6px;
  width:28px;height:28px;font-size:16px;cursor:pointer;display:grid;place-items:center;transition:all .2s;flex-shrink:0}
.btn-plus:hover{background:var(--pri);color:#fff}

/* ── SPELL HINT ─────────────────────────────────────────── */
.spell{display:none;position:absolute;top:-32px;left:0;background:var(--sur2);
  border:1px solid var(--pri);border-radius:7px;padding:4px 11px;font-size:.76rem;
  color:#a5b4fc;white-space:nowrap;z-index:20;cursor:pointer;box-shadow:0 4px 10px rgba(0,0,0,.4)}
.spell::after{content:' →';opacity:.5}
.spell:hover{background:var(--pri);color:#fff}

/* ── NOTES ──────────────────────────────────────────────── */
.notes-ta{width:100%;background:var(--sur2);border:1px solid var(--brd);border-radius:7px;
  color:var(--mu);padding:6px 10px;font-family:var(--sans);font-size:.79rem;resize:vertical;
  min-height:44px;outline:none;transition:border-color .2s,color .2s;line-height:1.5}
.notes-ta:focus{border-color:var(--pri);color:var(--tx)}
.notes-ta::placeholder{color:var(--mu);opacity:.4}

/* ── EMPTY ──────────────────────────────────────────────── */
.empty{grid-column:1/-1;text-align:center;padding:55px 20px;color:var(--mu)}
.empty-i{font-size:36px;margin-bottom:11px;opacity:.4}
.empty h3{font-size:.97rem;margin-bottom:4px;color:var(--tx)}

/* ── REPORT HEADER ──────────────────────────────────────── */
.rep-hdr{background:var(--sur);border:1px solid var(--brd);border-radius:var(--r);padding:20px 24px;margin-bottom:16px;
  display:flex;justify-content:space-between;align-items:center}
.rep-hdr-left h2{font-size:1.15rem;font-weight:700;margin-bottom:4px}
.rep-hdr-left p{color:var(--mu);font-size:.84rem}

/* ── TABLE ──────────────────────────────────────────────── */
.rep-wrap{background:var(--sur);border:1px solid var(--brd);border-radius:var(--r);overflow:hidden}
table{width:100%;border-collapse:collapse}
thead th{background:var(--sur2);padding:10px 16px;text-align:left;font-size:.7rem;font-weight:600;
  text-transform:uppercase;letter-spacing:.06em;color:var(--mu);border-bottom:1px solid var(--brd)}
tbody td{padding:11px 16px;font-size:.86rem;border-bottom:1px solid var(--brd);vertical-align:top}
tbody tr:last-child td{border-bottom:none}
tbody tr:hover{background:var(--sur2)}
.bdg{display:inline-block;padding:2px 8px;border-radius:99px;font-size:.7rem;font-weight:600;
  font-family:var(--mono);background:rgba(99,102,241,.15);color:#a5b4fc}
.sbar-w{display:flex;align-items:center;gap:8px}
.sbar{background:rgba(255,255,255,.06);border-radius:99px;height:6px;width:100px;overflow:hidden;flex-shrink:0}

/* ── COMMENT CELL ───────────────────────────────────────── */
.cmt-cell{font-size:.78rem;color:var(--mu);font-style:italic;max-width:240px;
  white-space:pre-wrap;line-height:1.4}
.cmt-cell:empty::before{content:'—';opacity:.4}

/* ── SCROLLBAR ──────────────────────────────────────────── */
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:var(--sur2);border-radius:3px}

/* ── LOADING ────────────────────────────────────────────── */
#lov{position:fixed;inset:0;background:var(--bg);display:flex;flex-direction:column;
  align-items:center;justify-content:center;z-index:999;gap:12px;transition:opacity .3s}
#lov.gone{opacity:0;pointer-events:none}
.spin{width:34px;height:34px;border:3px solid var(--brd);border-top-color:var(--pri);
  border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
#lov p{color:var(--mu);font-size:.86rem}

/* ════════════════════════════════════════════════════════
   PRINT — fondo blanco forzado, todo visible
   ════════════════════════════════════════════════════════ */
#pz{display:none}

@media print {
  /* Forzar fondo blanco en todo */
  html, body {
    background:#fff !important;
    color:#111 !important;
    -webkit-print-color-adjust:exact !important;
    print-color-adjust:exact !important;
  }
  /* Ocultar la app */
  #lov, #app { display:none !important }
  /* Mostrar zona de impresión */
  #pz {
    display:block !important;
    background:#fff !important;
    color:#111 !important;
    font-family:'Outfit','Segoe UI',sans-serif;
    padding:8mm 10mm;
  }
  /* Reset de variables para que no hereden el tema oscuro */
  #pz * {
    background:transparent !important;
    color:#111 !important;
    border-color:#dde !important;
    box-shadow:none !important;
  }

  /* ── Header ── */
  .pz-hdr{display:flex;justify-content:space-between;align-items:flex-end;
    border-bottom:2.5px solid #6366f1 !important;padding-bottom:9px;margin-bottom:16px}
  .pz-brand{font-size:14px;font-weight:700;color:#6366f1 !important}
  .pz-sub{font-size:10.5px;color:#555 !important;margin-top:2px}
  .pz-meta{font-size:9.5px;color:#888 !important;text-align:right}

  /* ── Grid ── */
  .pz-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:13px}
  .pz-single{grid-template-columns:1fr;max-width:380px;margin:0 auto}

  /* ── Card ── */
  .pz-card{border:1px solid #d4d4e8 !important;border-radius:8px;padding:12px;
    page-break-inside:avoid;break-inside:avoid;background:#fff !important}
  .pz-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
  .pz-name{font-size:12px;font-weight:700;color:#1e1e2e !important}
  .pz-pct{font-size:10.5px;font-weight:700;font-family:monospace}
  .pz-ph{color:#0e9f72 !important}.pz-pm{color:#d97706 !important}.pz-pl{color:#dc2626 !important}

  /* ── Progress ── */
  .pz-prog-t{background:#e8e8f0 !important;border-radius:99px;height:5px;overflow:hidden;margin-bottom:9px}
  .pz-prog-f{height:100%;border-radius:99px}
  .pz-fh{background:#0e9f72 !important}.pz-fm{background:#d97706 !important}.pz-fl{background:#dc2626 !important}

  /* ── Tasks ── */
  .pz-tasks{list-style:none;margin:0 0 7px;padding:0}
  .pz-tasks li{display:flex;align-items:flex-start;gap:6px;padding:3px 0;
    border-bottom:1px solid #ebebf4 !important;font-size:10.5px}
  .pz-tasks li:last-child{border-bottom:none !important}
  .pz-chk{width:10px;height:10px;border:1.5px solid #6366f1 !important;border-radius:3px;
    flex-shrink:0;display:grid;place-items:center;margin-top:1px;background:#fff !important}
  .pz-chk.done{background:#6366f1 !important}
  .pz-chk.done::after{content:'✓';color:#fff !important;font-size:7px;font-weight:700}
  .pz-txt.done{text-decoration:line-through;color:#999 !important}

  /* ── Notes / Comments ── */
  .pz-notes-lbl{font-size:8.5px;font-weight:700;color:#6366f1 !important;
    text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px;margin-top:7px}
  .pz-notes{background:#f5f5fc !important;border-radius:5px;padding:5px 7px;
    font-size:10px;color:#444 !important;min-height:22px;white-space:pre-wrap;
    border:1px solid #e0e0f0 !important;line-height:1.45}
  .pz-notes-empty{color:#bbb !important;font-style:italic}

  /* ── Signature ── */
  .pz-sig{border-top:1px dashed #ccc !important;padding-top:5px;margin-top:7px;
    font-size:9px;color:#999 !important}
  .pz-sig-line{display:inline-block;width:100px;border-bottom:1px solid #aaa !important;
    margin-left:4px;vertical-align:middle}

  /* ── Report print (weekly/monthly) ── */
  .pzr-section{margin-bottom:18px;page-break-inside:avoid}
  .pzr-period{font-size:11.5px;font-weight:700;color:#6366f1 !important;
    border-bottom:1px solid #e0e0f0 !important;padding-bottom:4px;margin-bottom:8px}
  .pzr-table{width:100%;border-collapse:collapse;font-size:10px}
  .pzr-table th{background:#f0f0fa !important;color:#555 !important;padding:5px 8px;
    text-align:left;font-weight:600;text-transform:uppercase;font-size:8.5px;
    letter-spacing:.04em;border-bottom:1px solid #dde !important}
  .pzr-table td{padding:5px 8px;border-bottom:1px solid #f0f0f6 !important;
    color:#222 !important;vertical-align:top}
  .pzr-table tr:last-child td{border-bottom:none !important}
  .pzr-cmt{font-size:9px;color:#555 !important;font-style:italic;white-space:pre-wrap;line-height:1.35}
  .pzr-ph{color:#0e9f72 !important}.pzr-pm{color:#d97706 !important}.pzr-pl{color:#dc2626 !important}
}
</style>
</head>
<body>

<div id="lov"><div class="spin"></div><p id="ltxt">Conectando…</p></div>

<div id="app">
<header class="topbar">
  <div class="brand"><div class="brand-ico">⚡</div>GestRend <em>/ Rendimiento</em></div>
  <div class="tb-right">
    <div class="sync-badge loading" id="sbadge"><div class="sync-dot"></div><span id="stxt">—</span></div>
    <nav class="pill">
      <button class="tab-btn active" id="btn-d" onclick="showTab('diario')"></button>
      <button class="tab-btn"        id="btn-r" onclick="showTab('reportes')"></button>
    </nav>
    <div class="pill">
      <button class="lang-btn" id="l-es"  onclick="setLang('es')">🇪🇸 ES</button>
      <button class="lang-btn" id="l-en"  onclick="setLang('en')">🇺🇸 EN</button>
      <button class="lang-btn" id="l-pap" onclick="setLang('pap')">🇨🇼 PAP</button>
      <button class="lang-btn" id="l-nl"  onclick="setLang('nl')">🇳🇱 NL</button>
    </div>
  </div>
</header>

<main class="main">
  <!-- Registro Diario -->
  <div id="diario" class="sec active">
    <div class="date-nav">
      <div class="date-ctr">
        <button class="nav-arr" id="btn-prev" onclick="cambiarDia(-1)">◀</button>
        <input type="date" id="fechaActual" onchange="cargarDatos()">
        <button class="nav-arr" id="btn-next" onclick="cambiarDia(1)">▶</button>
      </div>
      <div class="date-act">
        <button class="btn btn-prt" id="btn-pa" onclick="imprimirTodo()">🖨</button>
        <span class="date-tag" id="date-lbl"></span>
      </div>
    </div>
    <div class="add-bar">
      <span class="add-lbl" id="ui-wlbl"></span>
      <input class="txt-inp" type="text" id="nomTrab" onkeydown="if(event.key==='Enter')crearTrabajador()">
      <button class="btn btn-pri" id="ui-add" onclick="crearTrabajador()"></button>
    </div>
    <div id="grd" class="grid"></div>
  </div>

  <!-- Reportes -->
  <div id="reportes" class="sec">
    <div class="rep-hdr">
      <div class="rep-hdr-left"><h2 id="ui-rt"></h2><p id="ui-rd"></p></div>
      <button class="btn btn-prt" id="btn-rp" onclick="imprimirReporte()">🖨</button>
    </div>
    <div class="rep-tabs">
      <button class="rep-tab active" id="rtab-hist"  onclick="setRepTab('hist')"></button>
      <button class="rep-tab"        id="rtab-week"  onclick="setRepTab('week')"></button>
      <button class="rep-tab"        id="rtab-month" onclick="setRepTab('month')"></button>
    </div>
    <div class="rep-wrap"><div id="tRep"></div></div>
  </div>
</main>
</div>

<div id="pz"></div>

<script>
'use strict';

/* ── CONSTANTS ──────────────────────────────────────────── */
const SLANG = 'gestRend_lang_v5';
const POLL  = 4000;
const DEF_TASKS = ['Inventario','Precios','Cliente','Email','Llenar','Pedir','Limpiar'];

const DICT = {
  inv:    {es:'Inventario',        en:'Inventory',        pap:'Inventario',        nl:'Inventaris',
           match:['inventario','inventareo','inbentario','inv','inventory','inventaris','inventaro','imventario']},
  price:  {es:'Control de Precios',en:'Price Control',    pap:'Control di Prijs',  nl:'Prijscontrole',
           match:['precio','precios','presio','presios','price','prijs','control de precio','preico']},
  svc:    {es:'Atención al Cliente',en:'Customer Service',pap:'Atencion pa Cliente',nl:'Klantenservice',
           match:['cliente','clientes','servicio','service','customer','klanten','atencion','servisio','atención']},
  email:  {es:'Contestar Email',   en:'Reply Email',      pap:'Contesta Email',    nl:'Email Beantwoorden',
           match:['email','correo','mail','emeil','beantwoorden','contestar email','e-mail']},
  stock:  {es:'Llenar Mercancía',  en:'Restock',          pap:'Yena Mercancia',    nl:'Voorraad Bijvullen',
           match:['llenar','yena','llenr','restock','voorraad','mercancia','mercancía','surtir','abastecer','stock']},
  order:  {es:'Pedir Mercancía',   en:'Order Goods',      pap:'Bestel Mercancia',  nl:'Goederen Bestellen',
           match:['pedir','pedido','bestel','order','goederen','bestellen','ordenes','ordenar','pedr']},
  clean:  {es:'Limpiar Productos', en:'Clean Products',   pap:'Limpia Productonan',nl:'Producten Schoonmaken',
           match:['limpiar','limpear','limpar','liempar','clean','schoonmaken','limpia','limpieza']},
};

const L = {
  es:{
    tabD:'Registro Diario', tabR:'Análisis Histórico',
    add:'+ Agregar', wlbl:'Trabajador', wph:'Nombre del trabajador…',
    tph:'Nueva tarea…', nph:'Comentarios del día…',
    tod:'Hoy', yes:'Ayer',
    repT:'Análisis de Rendimiento', repD:'Resumen de todos los días registrados.',
    rtHist:'Historial General', rtWeek:'Esta Semana', rtMonth:'Este Mes',
    thW:'Trabajador', thD:'Días', thT:'Tareas Prom.', thS:'Rendimiento',
    thCmt:'Comentarios', thDate:'Fecha', thAct:'Acción',
    du:'días', del:'Eliminar',
    emp:'Sin trabajadores', empD:'Agrega un trabajador para comenzar.',
    empR:'Sin datos', empRD:'Registra trabajadores para ver el análisis.',
    noCmt:'Sin comentarios',
    cdel:'¿Eliminar este trabajador del día?',
    cdAll:'¿Borrar TODO el historial de ', cdAll2:'? Esta acción no se puede deshacer.',
    pa:'🖨 Imprimir Todo', po:'🖨 Imprimir', pr:'🖨 Imprimir Reporte',
    ptitle:'Reporte Diario de Tareas', pnotes:'Notas / Comentarios', pfirma:'Firma',
    spell:'¿Quisiste decir: ',
    prev:'Día anterior', next:'Día siguiente',
    sok:'Sincronizado', ssav:'Guardando…', serr:'Sin conexión', sload:'Cargando…',
    load:'Conectando al servidor…',
    week:'Semana', month:'Mes',
  },
  en:{
    tabD:'Daily Log', tabR:'Historical Analysis',
    add:'+ Add', wlbl:'Worker', wph:'Worker name…',
    tph:'New task…', nph:'Day comments…',
    tod:'Today', yes:'Yesterday',
    repT:'Performance Analysis', repD:'Summary of all recorded days.',
    rtHist:'Full History', rtWeek:'This Week', rtMonth:'This Month',
    thW:'Worker', thD:'Days', thT:'Task Avg', thS:'Performance',
    thCmt:'Comments', thDate:'Date', thAct:'Action',
    du:'days', del:'Delete',
    emp:'No workers', empD:'Add a worker to start logging.',
    empR:'No data', empRD:'Register workers to see analysis.',
    noCmt:'No comments',
    cdel:'Remove this worker from today?',
    cdAll:'Delete ALL history for ', cdAll2:'? This cannot be undone.',
    pa:'🖨 Print All', po:'🖨 Print', pr:'🖨 Print Report',
    ptitle:'Daily Task Report', pnotes:'Notes / Comments', pfirma:'Signature',
    spell:'Did you mean: ',
    prev:'Previous day', next:'Next day',
    sok:'Synced', ssav:'Saving…', serr:'Offline', sload:'Loading…',
    load:'Connecting to server…',
    week:'Week', month:'Month',
  },
  pap:{
    tabD:'Registro Diario', tabR:'Analisis Histórico',
    add:'+ Añadi', wlbl:'Trahado', wph:'Nòmber di trahado…',
    tph:'Tarea nobo…', nph:'Komentario di e dia…',
    tod:'Awe', yes:'Ayera',
    repT:'Analisis di Rendimentu', repD:'Resumen di tur dianan registrá.',
    rtHist:'Historial Jeneral', rtWeek:'E Siman Aki', rtMonth:'E Luna Aki',
    thW:'Trahado', thD:'Dianan', thT:'Prom. Tarea', thS:'Rendimentu',
    thCmt:'Komentario', thDate:'Fecha', thAct:'Aksjon',
    du:'dia', del:'Kita',
    emp:'Ningun trahado', empD:'Añadi un trahado pa kuminsá.',
    empR:'Ningun dato', empRD:'Registrá trahadornan pa mira analisis.',
    noCmt:'Sin komentario',
    cdel:'Kita e trahado aki di e dia?',
    cdAll:'Bòra TUR historial di ', cdAll2:'? E aksjon aki no por ser deshecho.',
    pa:'🖨 Imprimi Tur', po:'🖨 Imprimi', pr:'🖨 Imprimi Rapport',
    ptitle:'Rapport Diario di Tarea', pnotes:'Nota / Komentario', pfirma:'Firma',
    spell:'Bo ke bisá: ',
    prev:'Dia anterior', next:'Dia siguiente',
    sok:'Sinkronisá', ssav:'Guardando…', serr:'Sin koneksjon', sload:'Kargando…',
    load:'Konektando na server…',
    week:'Siman', month:'Luna',
  },
  nl:{
    tabD:'Dagelijks Logboek', tabR:'Historische Analyse',
    add:'+ Toevoegen', wlbl:'Medewerker', wph:'Naam van medewerker…',
    tph:'Nieuwe taak…', nph:'Opmerkingen van de dag…',
    tod:'Vandaag', yes:'Gisteren',
    repT:'Prestatieanalyse', repD:'Cumulatief overzicht van alle geregistreerde dagen.',
    rtHist:'Volledige Historie', rtWeek:'Deze Week', rtMonth:'Deze Maand',
    thW:'Medewerker', thD:'Dagen', thT:'Taak Gem.', thS:'Prestatie',
    thCmt:'Opmerkingen', thDate:'Datum', thAct:'Actie',
    du:'dagen', del:'Wissen',
    emp:'Geen medewerkers', empD:'Voeg een medewerker toe om te beginnen.',
    empR:'Geen gegevens', empRD:'Registreer medewerkers voor de analyse.',
    noCmt:'Geen opmerkingen',
    cdel:'Deze medewerker verwijderen uit de dag?',
    cdAll:'Alle geschiedenis verwijderen voor ', cdAll2:'? Dit kan niet ongedaan worden gemaakt.',
    pa:'🖨 Alles Afdrukken', po:'🖨 Afdrukken', pr:'🖨 Rapport Afdrukken',
    ptitle:'Dagelijks Takenrapport', pnotes:'Notities / Opmerkingen', pfirma:'Handtekening',
    spell:'Bedoelde u: ',
    prev:'Vorige dag', next:'Volgende dag',
    sok:'Gesynchroniseerd', ssav:'Opslaan…', serr:'Offline', sload:'Laden…',
    load:'Verbinding maken…',
    week:'Week', month:'Maand',
  },
};

/* ── STATE ──────────────────────────────────────────────── */
let lang    = localStorage.getItem(SLANG) || 'es';
let DB      = {};
let lastTs  = 0;
let saving  = false;
let repTab  = 'hist';
let pollTmr = null;

/* ── HELPERS ────────────────────────────────────────────── */
const pc   = p => p>=90?'ph':p>=50?'pm':'pl';
const fc   = p => p>=90?'fh':p>=50?'fm':'fl';
const pzp  = p => p>=90?'pz-ph':p>=50?'pz-pm':'pz-pl';
const pzf  = p => p>=90?'pz-fh':p>=50?'pz-fm':'pz-fl';
const pct  = ts => ts.length ? Math.round(ts.filter(t=>t.hecho).length/ts.length*100) : 0;
const tod  = () => new Date().toLocaleDateString('en-CA');

function tr(text) {
  const lo = text.toLowerCase().trim();
  for (const k of Object.keys(DICT))
    if (DICT[k].match.some(m => lo.includes(m))) return DICT[k][lang];
  return text;
}
function spell(text) {
  const lo = text.toLowerCase().trim();
  if (lo.length < 3) return null;
  for (const k of Object.keys(DICT))
    if (DICT[k].match.some(m => lo.includes(m))) {
      const s = DICT[k][lang];
      return s.toLowerCase()!==lo ? s : null;
    }
  return null;
}

/* ── DATE UTILS ─────────────────────────────────────────── */
function isoToDate(s)   { return new Date(s + 'T12:00:00'); }
function weekOf(s)      { const d=isoToDate(s); d.setDate(d.getDate()-d.getDay()); return d.toLocaleDateString('en-CA'); }
function monthOf(s)     { return s.substring(0,7); }
function todayWeek()    { return weekOf(tod()); }
function todayMonth()   { return monthOf(tod()); }
function fmtDate(s)     {
  const loc={es:'es-ES',en:'en-US',pap:'es-ES',nl:'nl-NL'};
  return isoToDate(s).toLocaleDateString(loc[lang],{weekday:'short',day:'numeric',month:'short'});
}
function fmtDateLong(s) {
  const loc={es:'es-ES',en:'en-US',pap:'es-ES',nl:'nl-NL'};
  return isoToDate(s).toLocaleDateString(loc[lang],{weekday:'long',year:'numeric',month:'long',day:'numeric'});
}

/* ── SYNC STATUS ────────────────────────────────────────── */
function setSS(st) {
  const b=document.getElementById('sbadge'), t=document.getElementById('stxt'), l=L[lang];
  b.className='sync-badge '+st;
  t.textContent={ok:l.sok,saving:l.ssav,error:l.serr,loading:l.sload}[st]||st;
}

/* ── API ────────────────────────────────────────────────── */
async function fetchDB(silent=false) {
  if(!silent) setSS('loading');
  try { DB=await (await fetch('/api/data')).json(); setSS('ok'); return true; }
  catch { setSS('error'); return false; }
}
async function pushDB() {
  if(saving) return; saving=true; setSS('saving');
  try {
    const r=await fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(DB)});
    if(r.ok){ lastTs=Date.now(); setSS('ok'); } else setSS('error');
  } catch { setSS('error'); } finally { saving=false; }
}
async function saveDB(refresh=true) { if(refresh) cargarDatos(); await pushDB(); }

async function poll() {
  if(saving) return;
  try {
    const j=await (await fetch('/api/ping')).json();
    if(j.ts>lastTs){ lastTs=j.ts; await fetchDB(true); cargarDatos();
      if(document.getElementById('reportes').classList.contains('active')) generarReporte(); }
  } catch{}
}

/* ── LANG ───────────────────────────────────────────────── */
function setLang(l) {
  lang=l; localStorage.setItem(SLANG,l);
  document.querySelectorAll('.lang-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('l-'+l).classList.add('active');
  const v=L[l];
  document.getElementById('btn-d').textContent       = v.tabD;
  document.getElementById('btn-r').textContent       = v.tabR;
  document.getElementById('ui-add').textContent      = v.add;
  document.getElementById('ui-wlbl').textContent     = v.wlbl;
  document.getElementById('nomTrab').placeholder     = v.wph;
  document.getElementById('btn-pa').textContent      = v.pa;
  document.getElementById('btn-rp').textContent      = v.pr;
  document.getElementById('btn-prev').title          = v.prev;
  document.getElementById('btn-next').title          = v.next;
  document.getElementById('ui-rt').textContent       = v.repT;
  document.getElementById('ui-rd').textContent       = v.repD;
  document.getElementById('rtab-hist').textContent   = v.rtHist;
  document.getElementById('rtab-week').textContent   = v.rtWeek;
  document.getElementById('rtab-month').textContent  = v.rtMonth;
  document.getElementById('ltxt').textContent        = v.load;
  cargarDatos();
  if(document.getElementById('reportes').classList.contains('active')) generarReporte();
}

/* ── NAV ────────────────────────────────────────────────── */
function showTab(id) {
  document.querySelectorAll('.sec').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.getElementById('btn-'+id.charAt(0)).classList.add('active');
  if(id==='reportes') generarReporte();
}
function setRepTab(t) {
  repTab=t;
  document.querySelectorAll('.rep-tab').forEach(b=>b.classList.remove('active'));
  document.getElementById('rtab-'+t).classList.add('active');
  generarReporte();
}
function cambiarDia(d) {
  const inp=document.getElementById('fechaActual');
  const dt=new Date(inp.value+'T12:00:00'); dt.setDate(dt.getDate()+d);
  inp.value=dt.toLocaleDateString('en-CA'); cargarDatos();
}
function updDateLbl() {
  const v=document.getElementById('fechaActual').value; if(!v) return;
  const l=L[lang], tag=document.getElementById('date-lbl'), t=tod();
  const y=new Date(t+'T12:00:00'); y.setDate(y.getDate()-1);
  if(v===t){tag.textContent=l.tod;return}
  if(v===y.toLocaleDateString('en-CA')){tag.textContent=l.yes;return}
  tag.textContent=fmtDate(v);
}

/* ── CRUD ───────────────────────────────────────────────── */
function crearTrabajador() {
  const f=document.getElementById('fechaActual').value;
  const n=document.getElementById('nomTrab').value.trim();
  if(!n||!f) return;
  if(!DB[f]) DB[f]=[];
  DB[f].push({nombre:n, tareas:DEF_TASKS.map(t=>({texto:t,hecho:false})), comentarios:''});
  document.getElementById('nomTrab').value='';
  saveDB();
}
function elimDelDia(f,i) {
  if(!confirm(L[lang].cdel)) return;
  DB[f].splice(i,1); saveDB();
}
function elimPerm(nombre) {
  const l=L[lang];
  if(!confirm(l.cdAll+nombre+l.cdAll2)) return;
  Object.keys(DB).forEach(f=>{DB[f]=DB[f].filter(x=>x.nombre!==nombre)});
  saveDB(false); generarReporte();
}
function toggleT(f,w,t) { DB[f][w].tareas[t].hecho=!DB[f][w].tareas[t].hecho; saveDB(); }
function borrarT(f,w,t) { DB[f][w].tareas.splice(t,1); saveDB(); }
function addTarea(f,w) {
  const inp=document.getElementById('ni-'+w), v=inp.value.trim(); if(!v) return;
  DB[f][w].tareas.push({texto:v,hecho:false}); inp.value=''; hideH(w); saveDB();
}
function editTask(f,w,t,el) {
  const inp=document.createElement('input');
  Object.assign(inp.style,{background:'transparent',border:'none',borderBottom:'1px solid var(--pri)',
    color:'var(--tx)',fontFamily:'var(--sans)',fontSize:'.84rem',width:'100%',outline:'none'});
  inp.value=DB[f][w].tareas[t].texto;
  inp.onblur=()=>{DB[f][w].tareas[t].texto=inp.value.trim()||DB[f][w].tareas[t].texto;saveDB()};
  inp.onkeydown=e=>{if(e.key==='Enter')inp.blur()};
  el.textContent=''; el.appendChild(inp); inp.focus();
}
function saveNote(f,w,v) { DB[f][w].comentarios=v; saveDB(false); }

/* ── SPELL HINT ─────────────────────────────────────────── */
function onTI(w) {
  const inp=document.getElementById('ni-'+w), h=document.getElementById('sh-'+w); if(!h) return;
  const s=spell(inp.value);
  if(s){ h.textContent=L[lang].spell+s; h.style.display='block'; h.onclick=()=>{inp.value=s;hideH(w);inp.focus()}; }
  else hideH(w);
}
function hideH(w) { const h=document.getElementById('sh-'+w); if(h) h.style.display='none'; }

/* ── RENDER DAILY ───────────────────────────────────────── */
function cargarDatos() {
  updDateLbl();
  const f=document.getElementById('fechaActual').value;
  const g=document.getElementById('grd');
  const l=L[lang], datos=DB[f]||[];
  g.innerHTML='';
  if(!datos.length){
    g.innerHTML=\`<div class="empty"><div class="empty-i">👤</div><h3>\${l.emp}</h3><p>\${l.empD}</p></div>\`;
    return;
  }
  datos.forEach((w,wi)=>{
    const p=pct(w.tareas), done=w.tareas.filter(t=>t.hecho).length, tot=w.tareas.length;
    const ac=p>=90?'var(--ok)':p>=50?'var(--warn)':'var(--err)';
    const tH=w.tareas.map((t,ti)=>\`
      <div class="task-row">
        <input class="task-chk" type="checkbox" \${t.hecho?'checked':''} onchange="toggleT('\${f}',\${wi},\${ti})">
        <span class="task-lbl \${t.hecho?'done':''}" onclick="editTask('\${f}',\${wi},\${ti},this)">\${tr(t.texto)}</span>
        <button class="btn-x" onclick="borrarT('\${f}',\${wi},\${ti})">×</button>
      </div>\`).join('');
    g.innerHTML+=\`
      <div class="card">
        <div class="card-acc" style="background:\${ac};opacity:\${Math.max(.25,p/100)}"></div>
        <button class="rm-card" onclick="elimDelDia('\${f}',\${wi})">×</button>
        <div class="card-hdr">
          <span class="w-name">\${w.nombre}</span>
          <div class="card-act">
            <button class="btn btn-prt" onclick="imprimirUno('\${f}',\${wi})">\${l.po}</button>
            <span class="w-pct \${pc(p)}">\${done}/\${tot} · \${p}%</span>
          </div>
        </div>
        <div class="prog-t"><div class="prog-f \${fc(p)}" style="width:\${p}%"></div></div>
        <div class="task-list">\${tH}</div>
        <div class="add-tw">
          <span class="spell" id="sh-\${wi}"></span>
          <div class="add-tr">
            <input class="task-inp" type="text" id="ni-\${wi}" placeholder="\${l.tph}"
                   oninput="onTI(\${wi})" onkeydown="if(event.key==='Enter')addTarea('\${f}',\${wi})">
            <button class="btn-plus" onclick="addTarea('\${f}',\${wi})">+</button>
          </div>
        </div>
        <textarea class="notes-ta" placeholder="\${l.nph}"
                  onchange="saveNote('\${f}',\${wi},this.value)">\${w.comentarios||''}</textarea>
      </div>\`;
  });
}

/* ── RENDER REPORTS ─────────────────────────────────────── */
function generarReporte() {
  if      (repTab==='hist')  renderHist();
  else if (repTab==='week')  renderPeriod('week');
  else if (repTab==='month') renderPeriod('month');
}

/* General history table */
function renderHist() {
  const l=L[lang], stats={};
  Object.values(DB).forEach(dia=>dia.forEach(w=>{
    if(!stats[w.nombre]) stats[w.nombre]={total:0,done:0,days:0,cmts:[]};
    stats[w.nombre].total+=w.tareas.length;
    stats[w.nombre].done +=w.tareas.filter(t=>t.hecho).length;
    stats[w.nombre].days +=1;
    if(w.comentarios&&w.comentarios.trim()) stats[w.nombre].cmts.push(w.comentarios.trim());
  }));
  const names=Object.keys(stats).sort();
  if(!names.length){
    document.getElementById('tRep').innerHTML=\`<div class="empty" style="padding:55px 20px"><div class="empty-i">📊</div><h3>\${l.empR}</h3><p>\${l.empRD}</p></div>\`;
    return;
  }
  const rows=names.map(n=>{
    const s=stats[n], p=s.total?Math.round(s.done/s.total*100):0;
    const lastCmt=s.cmts.length?s.cmts[s.cmts.length-1]:'';
    return \`<tr>
      <td><strong>\${n}</strong></td>
      <td><span class="bdg">\${s.days} \${l.du}</span></td>
      <td style="font-family:var(--mono);font-size:.8rem">\${Math.round(s.done/s.days)}/\${Math.round(s.total/s.days)}</td>
      <td><div class="sbar-w">
        <div class="sbar"><div class="prog-f \${fc(p)}" style="width:\${p}%"></div></div>
        <span class="\${pc(p)}" style="font-family:var(--mono);font-size:.83rem;font-weight:600">\${p}%</span>
      </div></td>
      <td class="cmt-cell">\${lastCmt||('<span style="opacity:.35">'+l.noCmt+'</span>')}</td>
      <td><button class="btn-del" onclick="elimPerm('\${n}')">\${l.del}</button></td>
    </tr>\`;
  }).join('');
  document.getElementById('tRep').innerHTML=\`<table>
    <thead><tr>
      <th>\${l.thW}</th><th>\${l.thD}</th><th>\${l.thT}</th>
      <th>\${l.thS}</th><th>\${l.thCmt}</th><th>\${l.thAct}</th>
    </tr></thead><tbody>\${rows}</tbody></table>\`;
}

/* Weekly / Monthly detail with all comments */
function renderPeriod(mode) {
  const l=L[lang];
  const keyOf=d=>mode==='week'?weekOf(d):monthOf(d);
  const curKey=mode==='week'?todayWeek():todayMonth();

  // Group dates by period
  const periods={};
  Object.keys(DB).sort().forEach(fecha=>{
    const k=keyOf(fecha);
    if(!periods[k]) periods[k]=[];
    periods[k].push(fecha);
  });

  if(!Object.keys(periods).length){
    document.getElementById('tRep').innerHTML=\`<div class="empty" style="padding:55px 20px"><div class="empty-i">📊</div><h3>\${l.empR}</h3><p>\${l.empRD}</p></div>\`;
    return;
  }

  // Build per-period table — most recent first
  let html='';
  Object.keys(periods).sort().reverse().forEach(pkey=>{
    const dates=periods[pkey].sort().reverse();
    const isCur=pkey===curKey;

    // aggregate workers for this period
    const wstats={};
    const dayComments=[]; // [{fecha, nombre, cmt}]
    dates.forEach(fecha=>{
      (DB[fecha]||[]).forEach(w=>{
        if(!wstats[w.nombre]) wstats[w.nombre]={total:0,done:0,days:0};
        wstats[w.nombre].total+=w.tareas.length;
        wstats[w.nombre].done +=w.tareas.filter(t=>t.hecho).length;
        wstats[w.nombre].days +=1;
        if(w.comentarios&&w.comentarios.trim())
          dayComments.push({fecha, nombre:w.nombre, cmt:w.comentarios.trim()});
      });
    });

    // Period label
    let periodLabel;
    if(mode==='week'){
      const start=isoToDate(pkey);
      const end=new Date(start); end.setDate(end.getDate()+6);
      const loc={es:'es-ES',en:'en-US',pap:'es-ES',nl:'nl-NL'}[lang];
      periodLabel=start.toLocaleDateString(loc,{day:'numeric',month:'short'})+
        ' – '+end.toLocaleDateString(loc,{day:'numeric',month:'short',year:'numeric'});
    } else {
      const loc={es:'es-ES',en:'en-US',pap:'es-ES',nl:'nl-NL'}[lang];
      periodLabel=isoToDate(pkey+'-01').toLocaleDateString(loc,{month:'long',year:'numeric'});
    }
    if(isCur) periodLabel='★ '+periodLabel;

    // Worker rows
    const wrows=Object.keys(wstats).sort().map(n=>{
      const s=wstats[n], p=s.total?Math.round(s.done/s.total*100):0;
      // find comments for this worker in this period
      const wcmts=dayComments.filter(c=>c.nombre===n);
      const cmtHtml=wcmts.length
        ? wcmts.map(c=>\`<div style="margin-bottom:2px"><span style="opacity:.5;font-size:.7rem">\${fmtDate(c.fecha)} ·</span> \${c.cmt}</div>\`).join('')
        : \`<span style="opacity:.3">\${l.noCmt}</span>\`;
      return \`<tr>
        <td><strong>\${n}</strong><br><span style="font-size:.72rem;color:var(--mu)">\${s.days} \${l.du}</span></td>
        <td><div class="sbar-w">
          <div class="sbar"><div class="prog-f \${fc(p)}" style="width:\${p}%"></div></div>
          <span class="\${pc(p)}" style="font-family:var(--mono);font-size:.8rem;font-weight:600">\${p}%</span>
        </div></td>
        <td style="font-family:var(--mono);font-size:.78rem">\${Math.round(s.done/s.days)}/\${Math.round(s.total/s.days)}</td>
        <td class="cmt-cell" style="max-width:none">\${cmtHtml}</td>
      </tr>\`;
    }).join('');

    html+=\`<div style="margin-bottom:22px">
      <div style="font-size:.85rem;font-weight:700;color:#a5b4fc;margin-bottom:8px;
        padding:6px 12px;background:var(--sur2);border-radius:var(--rs);display:inline-block">\${periodLabel}</div>
      <div class="rep-wrap" style="margin-bottom:0">
        <table>
          <thead><tr>
            <th>\${l.thW}</th><th>\${l.thS}</th><th>\${l.thT}</th><th>\${l.thCmt}</th>
          </tr></thead>
          <tbody>\${wrows}</tbody>
        </table>
      </div>
    </div>\`;
  });

  document.getElementById('tRep').innerHTML=html;
}

/* ── PRINT HELPERS ──────────────────────────────────────── */
function pzHeader(fecha, sub) {
  const l=L[lang];
  return \`<div class="pz-hdr">
    <div><div class="pz-brand">⚡ GestRend — \${l.ptitle}</div>
    <div class="pz-sub">\${fmtDateLong(fecha)}\${sub?' · '+sub:''}</div></div>
    <div class="pz-meta">gestRend v5</div></div>\`;
}

function buildCard(w) {
  const l=L[lang], p=pct(w.tareas), done=w.tareas.filter(t=>t.hecho).length;
  const tasks=w.tareas.map(t=>\`<li>
    <div class="pz-chk \${t.hecho?'done':''}"></div>
    <span class="pz-txt \${t.hecho?'done':''}">\${tr(t.texto)}</span>
  </li>\`).join('');
  const cmt=w.comentarios&&w.comentarios.trim()
    ? w.comentarios.trim()
    : \`<span class="pz-notes-empty">\${l.noCmt}</span>\`;
  return \`<div class="pz-card">
    <div class="pz-card-top">
      <div class="pz-name">\${w.nombre}</div>
      <span class="pz-pct \${pzp(p)}">\${done}/\${w.tareas.length} · \${p}%</span>
    </div>
    <div class="pz-prog-t"><div class="pz-prog-f \${pzf(p)}" style="width:\${p}%"></div></div>
    <ul class="pz-tasks">\${tasks}</ul>
    <div class="pz-notes-lbl">\${l.pnotes}</div>
    <div class="pz-notes">\${cmt}</div>
    <div class="pz-sig">\${l.pfirma}:<span class="pz-sig-line"></span></div>
  </div>\`;
}

function imprimirTodo() {
  const f=document.getElementById('fechaActual').value, datos=DB[f]||[];
  if(!datos.length) return;
  const l=L[lang];
  document.getElementById('pz').innerHTML=
    pzHeader(f, datos.length+' '+l.thW.toLowerCase()+'s')+
    \`<div class="pz-grid">\${datos.map(w=>buildCard(w)).join('')}</div>\`;
  window.print();
}

function imprimirUno(f,wi) {
  const w=DB[f]?.[wi]; if(!w) return;
  document.getElementById('pz').innerHTML=
    pzHeader(f, w.nombre)+
    \`<div class="pz-grid pz-single">\${buildCard(w)}</div>\`;
  window.print();
}

/* Print report (weekly or monthly) */
function imprimirReporte() {
  const l=L[lang];
  const keyOf = d => repTab==='month' ? monthOf(d) : repTab==='week' ? weekOf(d) : d;
  const curKey = repTab==='month'?todayMonth():repTab==='week'?todayWeek():null;

  const periods={};
  Object.keys(DB).sort().forEach(fecha=>{
    const k=keyOf(fecha);
    if(!periods[k]) periods[k]=[];
    periods[k].push(fecha);
  });

  if(!Object.keys(periods).length) return;

  let sections='';
  Object.keys(periods).sort().reverse().forEach(pkey=>{
    const dates=periods[pkey].sort().reverse();
    const wstats={}, cmts=[];
    dates.forEach(fecha=>{
      (DB[fecha]||[]).forEach(w=>{
        if(!wstats[w.nombre]) wstats[w.nombre]={total:0,done:0,days:0};
        wstats[w.nombre].total+=w.tareas.length;
        wstats[w.nombre].done +=w.tareas.filter(t=>t.hecho).length;
        wstats[w.nombre].days +=1;
        if(w.comentarios&&w.comentarios.trim())
          cmts.push({fecha,nombre:w.nombre,cmt:w.comentarios.trim()});
      });
    });

    let label;
    if(repTab==='hist') label=fmtDate(pkey);
    else if(repTab==='week'){
      const s=isoToDate(pkey), e=new Date(s); e.setDate(e.getDate()+6);
      const loc={es:'es-ES',en:'en-US',pap:'es-ES',nl:'nl-NL'}[lang];
      label=s.toLocaleDateString(loc,{day:'numeric',month:'short'})+' – '+e.toLocaleDateString(loc,{day:'numeric',month:'short',year:'numeric'});
    } else {
      const loc={es:'es-ES',en:'en-US',pap:'es-ES',nl:'nl-NL'}[lang];
      label=isoToDate(pkey+'-01').toLocaleDateString(loc,{month:'long',year:'numeric'});
    }

    const rows=Object.keys(wstats).sort().map(n=>{
      const s=wstats[n], p=s.total?Math.round(s.done/s.total*100):0;
      const wcmts=cmts.filter(c=>c.nombre===n);
      const cmtTxt=wcmts.map(c=>fmtDate(c.fecha)+': '+c.cmt).join(' | ')||l.noCmt;
      const cls=p>=90?'pzr-ph':p>=50?'pzr-pm':'pzr-pl';
      return \`<tr>
        <td>\${n}<br><span style="font-size:8.5px;opacity:.6">\${s.days} \${l.du}</span></td>
        <td class="\${cls}" style="font-weight:700;font-family:monospace">\${p}%</td>
        <td style="font-family:monospace">\${Math.round(s.done/s.days)}/\${Math.round(s.total/s.days)}</td>
        <td class="pzr-cmt">\${cmtTxt}</td>
      </tr>\`;
    }).join('');

    sections+=\`<div class="pzr-section">
      <div class="pzr-period">\${label}</div>
      <table class="pzr-table">
        <thead><tr><th>\${l.thW}</th><th>\${l.thS}</th><th>\${l.thT}</th><th>\${l.thCmt}</th></tr></thead>
        <tbody>\${rows}</tbody>
      </table>
    </div>\`;
  });

  const modeLabel=repTab==='hist'?l.rtHist:repTab==='week'?l.rtWeek:l.rtMonth;
  document.getElementById('pz').innerHTML=\`
    <div class="pz-hdr">
      <div><div class="pz-brand">⚡ GestRend — \${l.repT}</div>
      <div class="pz-sub">\${modeLabel}</div></div>
    </div>
    \${sections}\`;
  window.print();
}

/* ── BOOT ───────────────────────────────────────────────── */
async function init() {
  document.getElementById('fechaActual').value=tod();
  setLang(lang);
  await fetchDB(false);
  lastTs=Date.now();
  const ov=document.getElementById('lov');
  ov.classList.add('gone');
  setTimeout(()=>ov.style.display='none',300);
  cargarDatos();
  pollTmr=setInterval(poll,POLL);
}
init();
</script>
</body>
</html>
`;}