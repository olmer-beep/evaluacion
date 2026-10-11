// ============================================================
//  Código de barras Code 39 ("3 de 9")
// ============================================================
//  Se usa para imprimir el número del bon de caja de forma escaneable.
//  Code 39 no necesita dígito de control y codifica letras y guiones,
//  así que sirve tal cual para números tipo "B-000012".
//
//  Cada carácter son 9 elementos alternando barra/espacio, empezando
//  por barra, y exactamente 3 de los 9 son anchos (de ahí el nombre).
//  Entre caracteres va un espacio estrecho de separación.
// ------------------------------------------------------------

const PATRONES = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw', '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  'A': 'wnnnnwnnw', 'B': 'nnwnnwnnw', 'C': 'wnwnnwnnn', 'D': 'nnnnwwnnw',
  'E': 'wnnnwwnnn', 'F': 'nnwnwwnnn', 'G': 'nnnnnwwnw', 'H': 'wnnnnwwnn',
  'I': 'nnwnnwwnn', 'J': 'nnnnwwwnn', 'K': 'wnnnnnnww', 'L': 'nnwnnnnww',
  'M': 'wnwnnnnwn', 'N': 'nnnnwnnww', 'O': 'wnnnwnnwn', 'P': 'nnwnwnnwn',
  'Q': 'nnnnnnwww', 'R': 'wnnnnnwwn', 'S': 'nnwnnnwwn', 'T': 'nnnnwnwwn',
  'U': 'wwnnnnnnw', 'V': 'nwwnnnnnw', 'W': 'wwwnnnnnn', 'X': 'nwnnwnnnw',
  'Y': 'wwnnwnnnn', 'Z': 'nwwnwnnnn',
  '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn',
  '$': 'nwnwnwnnn', '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn',
  '*': 'nwnnwnwnn'   // carácter de inicio y fin, no se imprime como dato
};

const ANCHO_ESTRECHO = 1;
const ANCHO_ANCHO    = 2.6;   // relación habitual para lectores de tienda

// ---------------------------------------------------------
//  Devuelve la lista de franjas: [{ negro, ancho }, ...]
//  Si algún carácter no es codificable, devuelve [] (no se dibuja nada,
//  mejor eso que un código de barras que el escáner lea mal).
// ---------------------------------------------------------
function code39(texto) {
  const limpio = String(texto || '').toUpperCase().trim();
  if (!limpio) return [];
  const chars = ('*' + limpio + '*').split('');
  if (chars.some(c => !PATRONES[c])) return [];

  const franjas = [];
  chars.forEach((c, idx) => {
    PATRONES[c].split('').forEach((e, i) => {
      franjas.push({
        negro: i % 2 === 0,                                    // par = barra, impar = espacio
        ancho: e === 'w' ? ANCHO_ANCHO : ANCHO_ESTRECHO
      });
    });
    // Separación entre caracteres (espacio estrecho), menos tras el último
    if (idx < chars.length - 1) franjas.push({ negro: false, ancho: ANCHO_ESTRECHO });
  });
  return franjas;
}

module.exports = { code39, PATRONES };
