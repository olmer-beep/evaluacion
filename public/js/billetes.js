'use strict';
/* ════════════════════════════════════════════════════════════
   Billetes y monedas ilustrados (SVG) — USD y florín caribeño (XCG)
   Valores en centavos. Ilustraciones propias inspiradas en los
   colores y motivos de cada billete; no son reproducciones.
   ════════════════════════════════════════════════════════════ */

const Money = {
  USD: { bills: [10000, 5000, 2000, 1000, 500, 200, 100], coins: [50, 25, 10, 5, 1] },
  XCG: { bills: [20000, 10000, 5000, 2000, 1000],        coins: [500, 100, 50, 25, 10, 5, 1] },
  all(cur) { return [...this[cur].bills, ...this[cur].coins]; },
  isCoin(cur, den) { return this[cur].coins.includes(den); },
  label(cur, den) {
    if (cur === 'USD') return this.isCoin(cur, den) ? den + '¢' : '$' + den / 100;
    if (this.isCoin(cur, den)) return den >= 100 ? den / 100 + ' Cg' : den + 'c';
    return 'Cg ' + den / 100;
  },
  /* Diámetro real de la moneda en mm (para dibujarlas a escala) */
  coinMM: {
    USD: { 50: 30.6, 25: 24.3, 10: 17.9, 5: 21.2, 1: 19 },
    XCG: { 500: 25.9, 100: 28, 50: 22.3, 25: 20, 10: 18.3, 5: 16.8, 1: 15 },
  },
  /* Desglose de un monto en la menor cantidad de piezas */
  breakdown(cents, cur) {
    const out = [];
    let rest = Math.max(0, Math.round(cents));
    for (const d of this.all(cur)) {
      const n = Math.floor(rest / d);
      if (n) { out.push([d, n]); rest -= n * d; }
    }
    return out;
  },
};

const Billetes = (() => {
  let seq = 0;
  const id = () => 'b' + (++seq);

  /* ── Dólar ─────────────────────────────────────────────── */
  const USD = {
    100: { paper: '#dfe8e6', tint: '#a9cce0', ink: '#1d3a34', accent: '#2c6fb5', name: 'FRANKLIN',   word: 'ONE HUNDRED DOLLARS' },
    50:  { paper: '#e9e2e5', tint: '#e9b0bf', ink: '#24353b', accent: '#bf3a4c', name: 'GRANT',      word: 'FIFTY DOLLARS' },
    20:  { paper: '#e4e9d9', tint: '#f1c9a1', ink: '#22392b', accent: '#3d8a50', name: 'JACKSON',    word: 'TWENTY DOLLARS' },
    10:  { paper: '#ece5d6', tint: '#f3b57c', ink: '#2c3429', accent: '#d8782a', name: 'HAMILTON',   word: 'TEN DOLLARS' },
    5:   { paper: '#e5e2e9', tint: '#bdaad8', ink: '#2a3031', accent: '#7452a8', name: 'LINCOLN',    word: 'FIVE DOLLARS' },
    2:   { paper: '#e2e7db', tint: '#c6d6b6', ink: '#20392a', accent: '#4b7a52', name: 'JEFFERSON',  word: 'TWO DOLLARS' },
    1:   { paper: '#e2e7db', tint: '#cbd7c0', ink: '#1f3a2b', accent: '#3d6b47', name: 'WASHINGTON', word: 'ONE DOLLAR' },
  };

  function star(cx, cy, r1, r2, n) {
    let p = '';
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? r2 : r1, a = Math.PI * i / n - Math.PI / 2;
      p += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1);
    }
    return p + 'Z';
  }

  function usdBill(den) {
    const s = USD[den], u = id(), v = String(den);
    let extra = '';
    if (den === 100) {
      // Cinta azul de seguridad y tintero con campana que cambia de color
      let marks = '';
      for (let y = 16; y < 124; y += 13) marks += `<text x="200.5" y="${y}" font-size="4.4" fill="#e9f3ff" text-anchor="middle" font-family="Arial" font-weight="700">100</text><path d="M197.5 ${y + 3}h6l-1 3h-4z" fill="#e9f3ff" opacity=".85"/>`;
      extra = `<rect x="195" y="9" width="11" height="114" fill="${s.accent}"/>${marks}
        <linearGradient id="cu${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c4793a"/><stop offset="1" stop-color="#5f8f4c"/></linearGradient>
        <path d="M252 76h22l-3-12h-16z" fill="url(#cu${u})" opacity=".9"/>
        <path d="M257 64c0-12 12-12 12 0z M262 50v-4" fill="url(#cu${u})" stroke="url(#cu${u})" stroke-width="1.5"/>`;
    } else if (den === 50) {
      let stripes = '';
      for (let i = 0; i < 6; i++) stripes += `<rect x="22" y="${46 + i * 8}" width="52" height="4" fill="${s.accent}" opacity=".32"/>`;
      extra = stripes + `<rect x="22" y="46" width="22" height="20" fill="#2c4f8f" opacity=".32"/>`;
    } else if (den === 10) {
      extra = `<g fill="${s.accent}" opacity=".55"><path d="M60 50c-5 6-3 11 0 13 3-2 5-7 0-13z"/><path d="M55 64h10l-2 6h-6z"/><rect x="58" y="70" width="4" height="28" rx="1"/></g>`;
    } else if (den === 5) {
      extra = `<text x="262" y="98" font-size="56" font-weight="800" fill="${s.accent}" opacity=".5" text-anchor="middle" font-family="Georgia,serif">5</text>`;
    } else if (den === 20) {
      extra = `<circle cx="266" cy="62" r="20" fill="${s.tint}" opacity=".8"/>`;
    }
    const bigFill = den >= 20 ? `url(#cu${u})` : s.ink;
    const cuDef = den >= 20 && den !== 100
      ? `<linearGradient id="cu${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9763a"/><stop offset="1" stop-color="#3f7a46"/></linearGradient>` : '';
    return `<svg viewBox="0 0 312 132" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${Money.label('USD', den * 100)}">
      <defs>
        <linearGradient id="p${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${s.paper}"/><stop offset=".55" stop-color="${s.tint}" stop-opacity=".6"/><stop offset="1" stop-color="${s.paper}"/></linearGradient>
        <pattern id="g${u}" width="14" height="10" patternUnits="userSpaceOnUse"><path d="M0 5Q3.5 0 7 5T14 5" fill="none" stroke="${s.ink}" stroke-opacity=".1" stroke-width=".8"/></pattern>
        <radialGradient id="o${u}"><stop offset="0" stop-color="${s.paper}"/><stop offset="1" stop-color="${s.tint}"/></radialGradient>
        <clipPath id="c${u}"><ellipse cx="156" cy="62" rx="34" ry="42"/></clipPath>
        ${cuDef}
      </defs>
      <rect width="312" height="132" rx="5" fill="url(#p${u})"/>
      <rect width="312" height="132" rx="5" fill="url(#g${u})"/>
      ${extra}
      <rect x="5" y="5" width="302" height="122" rx="3" fill="none" stroke="${s.ink}" stroke-width="2.2"/>
      <rect x="9" y="9" width="294" height="114" rx="2" fill="none" stroke="${s.ink}" stroke-width=".6" stroke-dasharray="2 1.5"/>
      <ellipse cx="156" cy="62" rx="36" ry="44" fill="url(#o${u})" stroke="${s.ink}" stroke-width="1.6"/>
      <g clip-path="url(#c${u})" fill="${s.ink}" opacity=".82">
        <ellipse cx="156" cy="50" rx="12.5" ry="15.5"/>
        <path d="M150 50c0-14 14-18 19-8 2 5-2 2-6 3-5 1-9 3-13 5z" opacity=".6"/>
        <path d="M124 106c2-22 15-32 32-32s30 10 32 32z"/>
      </g>
      <rect x="133" y="98" width="46" height="10" rx="2" fill="${s.paper}" stroke="${s.ink}" stroke-width=".8"/>
      <text x="156" y="105.6" text-anchor="middle" font-family="Georgia,serif" font-size="6" letter-spacing="1" fill="${s.ink}" font-weight="700">${s.name}</text>
      <text x="156" y="21" text-anchor="middle" font-family="Georgia,serif" font-size="8.6" letter-spacing="1.6" fill="${s.ink}" font-weight="700">THE UNITED STATES OF AMERICA</text>
      <text x="156" y="121" text-anchor="middle" font-family="Georgia,serif" font-size="8.6" letter-spacing="2" fill="${s.ink}" font-weight="700">${s.word}</text>
      <circle cx="82" cy="70" r="13" fill="none" stroke="${s.ink}" stroke-width="1.3"/>
      <circle cx="82" cy="70" r="9.5" fill="none" stroke="${s.ink}" stroke-width=".5" stroke-dasharray="1 1"/>
      <path d="${star(82, 70, 5, 2.2, 5)}" fill="${s.ink}"/>
      <path d="${star(232, 72, 14, 11.5, 24)}" fill="#2f6b3a" opacity=".85"/>
      <circle cx="232" cy="72" r="8" fill="none" stroke="${s.paper}" stroke-width="1.2"/>
      <text x="17" y="38" font-size="${v.length > 2 ? 24 : 28}" font-weight="800" font-family="Georgia,serif" fill="${s.ink}">${v}</text>
      <text x="295" y="31" font-size="15" font-weight="800" text-anchor="end" font-family="Georgia,serif" fill="${s.ink}">${v}</text>
      <text x="17" y="117" font-size="15" font-weight="800" font-family="Georgia,serif" fill="${s.ink}">${v}</text>
      <text x="295" y="117" font-size="${v.length > 2 ? 26 : 30}" font-weight="800" text-anchor="end" font-family="Georgia,serif" fill="${bigFill}">${v}</text>
    </svg>`;
  }

  /* ── Florín caribeño: serie "Mundo bajo el mar" ────────── */
  const XCG = {
    200: { base: '#8757be', light: '#ece2f6', ink: '#311659', animal: 'seahorse',   shell: 'tun' },
    100: { base: '#d0473a', light: '#f8e0da', ink: '#5a130f', animal: 'parrotfish', shell: 'volute' },
    50:  { base: '#38a062', light: '#dcf2e3', ink: '#0e4426', animal: 'turtle',     shell: 'tellin' },
    20:  { base: '#378bd1', light: '#dcebf9', ink: '#0b365f', animal: 'ray',        shell: 'cowry' },
    10:  { base: '#f0bd26', light: '#fcf2cc', ink: '#5a4300', animal: 'angelfish',  shell: 'conch' },
  };

  const ANIMALS = {
    angelfish: (ink, l) => `<path d="M8 50C18 30 40 22 58 30c6 3 10 8 14 14l20-14-4 20 4 20-20-14c-4 6-8 11-14 14C40 78 18 70 8 50z" fill="${ink}"/>
      <path d="M30 30C38 10 56 2 74 0 64 10 60 20 56 29z M30 70c8 20 26 28 44 30-10-10-14-20-18-29z" fill="${ink}" opacity=".85"/>
      <path d="M34 34c4 10 4 22 0 32M45 30c4 12 4 28 0 40" stroke="${l}" stroke-opacity=".5" stroke-width="2.2" fill="none"/>
      <circle cx="20" cy="46" r="3.4" fill="${l}"/>`,
    ray: (ink, l) => `<path d="M50 22c6 0 10 6 13 12 11 4 25 10 35 18-14 4-28 6-38 14-3 4-6 8-10 10-4-2-7-6-10-10C30 58 16 56 2 52c10-8 24-14 35-18 3-6 7-12 13-12z" fill="${ink}"/>
      <path d="M50 76c1 10 5 18 12 24" stroke="${ink}" stroke-width="1.8" fill="none"/>
      <g fill="${l}" opacity=".75">${[[40, 44], [60, 44], [30, 50], [70, 50], [50, 56], [44, 36], [56, 36], [20, 51], [80, 51], [50, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9"/>`).join('')}</g>`,
    turtle: (ink, l) => `<ellipse cx="50" cy="54" rx="24" ry="30" fill="${ink}"/><ellipse cx="50" cy="18" rx="8" ry="10" fill="${ink}"/>
      <path d="M30 38C14 26 4 28 0 36c10 4 20 10 28 14z M70 38c16-12 26-10 30-2-10 4-20 10-28 14z M32 74c-8 6-12 14-10 20 6-4 12-10 16-14z M68 74c8 6 12 14 10 20-6-4-12-10-16-14z" fill="${ink}"/>
      <path d="M50 30l10 12-4 16H44l-4-16z M40 42l-12 6M60 42l12 6M44 58L34 70M56 58l10 12" stroke="${l}" stroke-opacity=".55" stroke-width="1.6" fill="none"/>
      <circle cx="46" cy="14" r="1.6" fill="${l}"/><circle cx="54" cy="14" r="1.6" fill="${l}"/>`,
    parrotfish: (ink, l) => `<path d="M4 50C12 32 36 24 60 30c8 2 14 8 18 14l18-12-4 18 4 18-18-12c-4 6-10 12-18 14C36 76 12 68 4 50z" fill="${ink}"/>
      <path d="M30 30c10-8 26-10 36 0z" fill="${ink}" opacity=".85"/>
      <path d="M4 50c2-4 6-5 8-3l-2 6c-2 1-5 0-6-3z" fill="${l}" opacity=".6"/>
      <path d="M28 40q4 4 0 8M36 38q4 5 0 10M44 37q4 6 0 12M52 37q4 6 0 12M60 38q4 5 0 10M32 52q4 4 0 8M40 52q4 5 0 9M48 52q4 5 0 9M56 51q4 4 0 8" stroke="${l}" stroke-opacity=".5" stroke-width="1.4" fill="none"/>
      <circle cx="16" cy="44" r="3" fill="${l}"/>`,
    seahorse: (ink, l) => `<path d="M52 6c12-2 20 4 18 14h14v6l-14 2c-2 6-6 10-8 14 4 8 4 16 0 22-4 6-2 12 0 18 2 8-4 16-12 16s-12-6-8-12c3-4 8-2 8 2 2-4 0-8-2-12-4-8-2-16 2-22-4-6-6-12-4-18-6-4-8-12-4-20 2-6 6-9 10-10z" fill="${ink}"/>
      <path d="M62 44c10 2 14 10 8 16-4-4-6-10-8-16z" fill="${ink}" opacity=".7"/>
      <path d="M46 40h14M47 48h15M50 56h13M50 64h11M50 72h11" stroke="${l}" stroke-opacity=".45" stroke-width="1.5"/>
      <circle cx="58" cy="16" r="2.6" fill="${l}"/>`,
  };

  const SHELLS = {
    conch:  c => `<path d="M30 4l22 28c2 12-6 24-20 26-12 2-22-8-22-18 0-10 8-16 18-16 6 0 10 6 8 12-2 4-8 4-10 0" fill="#fff" fill-opacity=".85" stroke="${c}" stroke-width="2"/>`,
    cowry:  c => `<ellipse cx="30" cy="30" rx="20" ry="26" fill="#fff" fill-opacity=".85" stroke="${c}" stroke-width="2"/><path d="M30 8v44M26 16h8M25 24h10M25 32h10M26 40h8" stroke="${c}" stroke-width="1.6"/>`,
    tellin: c => `<path d="M30 54L5 22C14 6 46 6 55 22z" fill="#fff" fill-opacity=".85" stroke="${c}" stroke-width="2"/><path d="M30 54L14 14M30 54L24 10M30 54l6-44M30 54l16-40" stroke="${c}" stroke-width="1.3"/>`,
    volute: c => `<path d="M30 2c10 12 14 28 10 44L30 58 20 46c-4-16 0-32 10-44z" fill="#fff" fill-opacity=".85" stroke="${c}" stroke-width="2"/><path d="M22 20h16M20 30h20M21 40h18" stroke="${c}" stroke-width="1.5"/>`,
    tun:    c => `<circle cx="30" cy="34" r="22" fill="#fff" fill-opacity=".85" stroke="${c}" stroke-width="2"/><path d="M30 12l-4-8h8z" fill="#fff" stroke="${c}" stroke-width="1.5"/><path d="M10 26q20 8 40 0M8 36q22 8 44 0M11 46q19 7 38 0" stroke="${c}" stroke-width="1.4" fill="none"/>`,
  };

  function xcgBill(den) {
    const s = XCG[den], u = id(), v = String(den);
    const wave = y => `M0 ${y}Q37.5 ${y - 8} 75 ${y}T150 ${y}T225 ${y}T300 ${y}`;
    let bubbles = '';
    [[118, 30, 2.4], [126, 18, 1.6], [200, 112, 2], [92, 112, 1.6], [190, 26, 1.8]].forEach(([x, y, r]) => {
      bubbles += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".8"/>`;
    });
    return `<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${Money.label('XCG', den * 100)}">
      <defs>
        <linearGradient id="p${u}" x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stop-color="${s.light}"/><stop offset=".42" stop-color="${s.base}" stop-opacity=".55"/><stop offset="1" stop-color="${s.base}"/></linearGradient>
        <linearGradient id="f${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f4f4"/><stop offset=".3" stop-color="#b9e4f5"/><stop offset=".55" stop-color="#f5d3f0"/><stop offset=".8" stop-color="#d6f5c9"/><stop offset="1" stop-color="#eaeaea"/></linearGradient>
        <radialGradient id="r${u}" cx=".35" cy="0" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="300" height="150" rx="6" fill="url(#p${u})"/>
      <rect width="300" height="150" rx="6" fill="url(#r${u})"/>
      <g fill="none" stroke="#fff" stroke-opacity=".32" stroke-width="1.2"><path d="${wave(30)}"/><path d="${wave(46)}"/><path d="${wave(92)}"/></g>
      <path d="M0 120Q40 110 80 120T160 120T240 120T320 120V150H0z" fill="${s.ink}" opacity=".13"/>
      ${bubbles}
      <g transform="translate(98 22) scale(1.04)">${ANIMALS[s.animal](s.ink, s.light)}</g>
      <rect x="212" y="0" width="9" height="150" fill="url(#f${u})" opacity=".9"/>
      <g fill="${s.ink}" opacity=".35">${[16, 40, 64, 88, 112, 136].map(y => `<rect x="214.5" y="${y}" width="4" height="8" rx="1"/>`).join('')}</g>
      <g transform="translate(234 20) scale(.9)">${SHELLS[s.shell](s.ink)}</g>
      <circle cx="260" cy="104" r="15" fill="#fff" opacity=".14"/>
      <rect x="4" y="4" width="292" height="142" rx="4" fill="none" stroke="${s.ink}" stroke-opacity=".35" stroke-width="1.4"/>
      <text x="14" y="45" font-family="'Bricolage Grotesque',Arial,sans-serif" font-size="38" font-weight="800" fill="${s.ink}">${v}</text>
      <text x="${14 + v.length * 22}" y="45" font-family="'Bricolage Grotesque',Arial,sans-serif" font-size="13" font-weight="700" fill="${s.ink}">Cg</text>
      <text x="14" y="66" font-family="Arial,sans-serif" font-size="7.4" letter-spacing="1" font-weight="700" fill="${s.ink}">CARIBISCHE GULDEN</text>
      <text x="14" y="76" font-family="Arial,sans-serif" font-size="5.6" letter-spacing=".6" fill="${s.ink}" opacity=".8">CURAÇAO EN SINT MAARTEN</text>
      <text x="289" y="140" text-anchor="end" font-family="'Bricolage Grotesque',Arial,sans-serif" font-size="30" font-weight="800" fill="#fff">${v}</text>
    </svg>`;
  }

  /* ── Monedas ───────────────────────────────────────────── */
  const METAL = {
    silver: ['#fbfcfc', '#bfc7cc', '#6d787e'],
    copper: ['#f5c49c', '#c47c4a', '#7a4322'],
    bronze: ['#f3d49b', '#c49a4e', '#7a5a22'],
    brass:  ['#fbe7a2', '#d4b04f', '#8a6c18'],
  };
  function grad(u, m) {
    const [a, b, c] = METAL[m];
    return `<radialGradient id="${u}" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="${a}"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`;
  }
  /* Contorno según la forma real: redonda, 11 lados, festoneada o con muescas */
  function outline(shape, r) {
    if (shape === 'circle') return null;
    const pts = [];
    const N = shape === 'poly11' ? 11 : 140;
    for (let i = 0; i < N; i++) {
      const a = 2 * Math.PI * i / N - Math.PI / 2;
      let rr = r;
      if (shape === 'scallop') rr = r - 1.6 * Math.abs(Math.sin(a * 6));
      if (shape === 'indent7') { const k = (((a * 7 / (2 * Math.PI)) % 1) + 1) % 1; rr = Math.abs(k - .5) > .45 ? r - 3 : r; }
      pts.push((50 + rr * Math.cos(a)).toFixed(2) + ',' + (50 + rr * Math.sin(a)).toFixed(2));
    }
    return pts.join(' ');
  }
  function blossom(cx, cy, r, col) {
    let p = '';
    for (let i = 0; i < 5; i++) {
      const a = 2 * Math.PI * i / 5 - Math.PI / 2;
      p += `<ellipse cx="${(cx + r * Math.cos(a)).toFixed(1)}" cy="${(cy + r * Math.sin(a)).toFixed(1)}" rx="${r * .62}" ry="${r * .42}" transform="rotate(${i * 72} ${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)})" fill="none" stroke="${col}" stroke-width="1.1"/>`;
    }
    return p + `<circle cx="${cx}" cy="${cy}" r="${r * .35}" fill="${col}"/>`;
  }

  function coin(cur, den) {
    const u = id();
    const label = Money.label(cur, den);
    let metal = 'silver', shape = 'circle', rings = '', top = 'LIBERTY', ink = '#3f4a50';
    if (cur === 'USD') {
      if (den === 1) { metal = 'copper'; ink = '#5a2e15'; }
    } else {
      top = '';
      if (den === 5) shape = 'scallop';
      if (den === 25) shape = 'indent7';
      if (den === 50) shape = 'poly11';
    }
    const poly = outline(shape, 49);
    const body = poly
      ? `<polygon points="${poly}" fill="url(#m${u})" stroke="${METAL[metal][2]}" stroke-width="1.2"/>`
      : `<circle cx="50" cy="50" r="49" fill="url(#m${u})" stroke="${METAL[metal][2]}" stroke-width="1.2"/>`;
    let defs = grad('m' + u, metal);
    if (cur === 'XCG' && den === 100) {          // bimetálica: aro de acero, centro bronce
      defs += grad('c' + u, 'bronze');
      rings = `<circle cx="50" cy="50" r="33" fill="url(#c${u})" stroke="#7a5a22" stroke-width=".8"/>`;
      ink = '#4a3510';
    }
    if (cur === 'XCG' && den === 500) {          // trimetálica: acero, latón, acero
      defs += grad('c' + u, 'brass') + grad('d' + u, 'silver');
      rings = `<circle cx="50" cy="50" r="37" fill="url(#c${u})" stroke="#8a6c18" stroke-width=".8"/><circle cx="50" cy="50" r="25" fill="url(#d${u})" stroke="#6d787e" stroke-width=".8"/>`;
    }
    const reed = cur === 'USD' && den >= 10
      ? `<circle cx="50" cy="50" r="46.5" fill="none" stroke="${METAL[metal][2]}" stroke-opacity=".45" stroke-width="3" stroke-dasharray="1.1 1.1"/>` : '';
    const fs = label.length > 4 ? 19 : label.length > 3 ? 22 : 26;
    const emblem = cur === 'XCG' ? blossom(50, 30, 6, ink) : '';
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">
      <defs>${defs}</defs>
      ${body}${reed}${rings}
      <circle cx="50" cy="50" r="41" fill="none" stroke="${ink}" stroke-opacity=".35" stroke-width=".8"/>
      ${top ? `<text x="50" y="27" text-anchor="middle" font-family="Georgia,serif" font-size="9" letter-spacing="1" fill="${ink}" opacity=".8">${top}</text>` : emblem}
      <text x="50" y="${cur === 'XCG' ? 64 : 60}" text-anchor="middle" font-family="'Bricolage Grotesque',Arial,sans-serif" font-size="${fs}" font-weight="800" fill="${ink}">${label}</text>
      ${cur === 'USD' ? `<text x="50" y="80" text-anchor="middle" font-family="Georgia,serif" font-size="8" fill="${ink}" opacity=".7">USA</text>` : ''}
    </svg>`;
  }

  return {
    svg(cur, den) {
      if (Money.isCoin(cur, den)) return coin(cur, den);
      return cur === 'USD' ? usdBill(den / 100) : xcgBill(den / 100);
    },
    /* Tamaño en px para mostrar la pieza: billetes por ancho, monedas a escala real */
    size(cur, den, billW = 150) {
      if (Money.isCoin(cur, den)) { const d = Money.coinMM[cur][den] * (billW / 60); return { w: d, h: d }; }
      return { w: billW, h: billW / (cur === 'USD' ? 312 / 132 : 2) };
    },
  };
})();
