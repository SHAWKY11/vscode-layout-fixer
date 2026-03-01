/**
 * Standard Windows Arabic (101) keyboard layout mappings.
 *
 * These maps encode the physical key relationship between the Arabic and English layouts.
 * They do NOT translate — they map based on key position.
 *
 * Reference: Windows Arabic 101 keyboard layout
 */

/**
 * Maps English keyboard characters to their Arabic equivalents.
 * Represents: "user pressed this key while Arabic layout was active".
 */
export const ENGLISH_TO_ARABIC: Readonly<Record<string, string>> = {
  // ── Top row (backtick) ──────────────────────────────────────────────────
  '`': 'ذ',

  // ── Q row — lowercase ───────────────────────────────────────────────────
  q: 'ض',
  w: 'ص',
  e: 'ث',
  r: 'ق',
  t: 'ف',
  y: 'غ',
  u: 'ع',
  i: 'ه',
  o: 'خ',
  p: 'ح',
  '[': 'ج',
  ']': 'د',
  '\\': '\\',

  // ── A row — lowercase ───────────────────────────────────────────────────
  a: 'ش',
  s: 'س',
  d: 'ي',
  f: 'ب',
  g: 'ل',
  h: 'ا',
  j: 'ت',
  k: 'ن',
  l: 'م',
  ';': 'ك',
  "'": 'ط',

  // ── Z row — lowercase ───────────────────────────────────────────────────
  z: 'ئ',
  x: 'ء',
  c: 'ؤ',
  v: 'ر',
  b: 'لا',   // lam-alef ligature (two Unicode chars → one key)
  n: 'ى',
  m: 'ة',
  ',': 'و',
  '.': 'ز',
  '/': 'ظ',

  // ── Q row — shifted ─────────────────────────────────────────────────────
  Q: 'ً',   // tanwin fath
  W: 'ٌ',   // tanwin damm
  E: 'ٍ',   // tanwin kasr
  R: 'َ',   // fatha
  T: 'ُ',   // damma
  Y: 'ِ',   // kasra
  U: 'ّ',   // shadda
  I: '÷',
  O: '×',
  P: '؛',   // Arabic semicolon
  '{': '<',
  '}': '>',
  '|': '|',

  // ── A row — shifted ─────────────────────────────────────────────────────
  A: 'ِ',   // kasra (duplicate key on physical board)
  S: 'ٍ',   // tanwin kasr (duplicate key on physical board)
  D: '[',
  F: ']',
  G: 'لأ',  // lam + alef with hamza above
  H: 'أ',   // alef with hamza above
  J: 'ـ',   // tatweel (kashida)
  K: '،',   // Arabic comma
  L: '/',
  ':': '؛', // Arabic semicolon
  '"': 'ÿ',

  // ── Z row — shifted ─────────────────────────────────────────────────────
  Z: '~',
  X: 'ْ',   // sukun
  C: '}',
  V: '{',
  B: 'لأ',  // lam + alef with hamza above (duplicate)
  N: 'آ',   // alef with madda
  M: "'",
  '<': ',',
  '>': '.',
  '?': '؟', // Arabic question mark

  // ── Symbols that produce Arabic-specific variants ───────────────────────
  '%': '٪',  // Arabic percent sign
  '_': 'ـ', // tatweel
};

/**
 * Special multi-character Arabic sequences that map to a single English key.
 * Must be checked BEFORE single-character lookups in ARABIC_TO_ENGLISH.
 * Sorted by length (longest first) to ensure correct greedy matching.
 */
export const ARABIC_MULTICHAR_TO_ENGLISH: ReadonlyArray<
  readonly [string, string]
> = [
  ['لأ', 'G'], // lam + alef with hamza above (Shift+G / Shift+B)
  ['لآ', 'b'], // lam + alef with madda (some layouts)
  ['لإ', 'b'], // lam + alef with hamza below (some layouts)
  ['لا', 'b'], // lam + alef (standard b key)
];

/**
 * Maps Arabic characters to their English keyboard equivalents.
 * Inverse of ENGLISH_TO_ARABIC (with conflict resolution for duplicates).
 */
export const ARABIC_TO_ENGLISH: Readonly<Record<string, string>> = {
  // ── Top row ─────────────────────────────────────────────────────────────
  ذ: '`',

  // ── Q row ───────────────────────────────────────────────────────────────
  ض: 'q',
  ص: 'w',
  ث: 'e',
  ق: 'r',
  ف: 't',
  غ: 'y',
  ع: 'u',
  ه: 'i',
  خ: 'o',
  ح: 'p',
  ج: '[',
  د: ']',

  // ── A row ───────────────────────────────────────────────────────────────
  ش: 'a',
  س: 's',
  ي: 'd',
  ب: 'f',
  ل: 'g',
  ا: 'h',
  ت: 'j',
  ن: 'k',
  م: 'l',
  ك: ';',
  ط: "'",

  // ── Z row ───────────────────────────────────────────────────────────────
  ئ: 'z',
  ء: 'x',
  ؤ: 'c',
  ر: 'v',
  // 'لا' → 'b' is handled via ARABIC_MULTICHAR_TO_ENGLISH
  ى: 'n',
  ة: 'm',
  و: ',',
  ز: '.',
  ظ: '/',

  // ── Diacritics / shifted ────────────────────────────────────────────────
  // Combining diacritics must be quoted — they are zero-width and cannot
  // be used as bare TypeScript identifier keys.
  '\u064B': 'Q', // ً tanwin fath
  '\u064C': 'W', // ٌ tanwin damm
  '\u064D': 'E', // ٍ tanwin kasr (canonical: E over S)
  '\u064E': 'R', // َ fatha
  '\u064F': 'T', // ُ damma
  '\u0650': 'Y', // ِ kasra (canonical: Y over A)
  '\u0651': 'U', // ّ shadda
  '÷': 'I',
  '×': 'O',
  '؛': 'P', // Arabic semicolon (canonical: P over :)
  'أ': 'H', // alef with hamza above
  'ـ': 'J', // tatweel
  '،': 'K', // Arabic comma
  '\u0652': 'X', // ْ sukun
  'آ': 'N', // alef with madda
  '؟': '?', // Arabic question mark

  // ── Arabic-Indic numerals ────────────────────────────────────────────────
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',

  // ── Arabic percent ───────────────────────────────────────────────────────
  '٪': '%',
};
