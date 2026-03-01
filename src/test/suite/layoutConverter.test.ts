import * as assert from 'assert';
import { LayoutConverter } from '../../services/layoutConverter';

/**
 * Unit tests for LayoutConverter.
 *
 * Run with:  npm test
 *
 * Key→Arabic mappings verified against the standard Windows Arabic (101) layout:
 *   q→ض  w→ص  e→ث  r→ق  t→ف  y→غ  u→ع  i→ه  o→خ  p→ح
 *   a→ش  s→س  d→ي  f→ب  g→ل  h→ا  j→ت  k→ن  l→م  ;→ك  '→ط
 *   z→ئ  x→ء  c→ؤ  v→ر  b→لا  n→ى  m→ة  ,→و  .→ز  /→ظ
 */
suite('LayoutConverter', () => {
  let converter: LayoutConverter;

  setup(() => {
    converter = new LayoutConverter();
  });

  // ── arabicToEnglish ──────────────────────────────────────────────────────

  suite('arabicToEnglish()', () => {
    test('converts single Arabic letter to English key', () => {
      assert.strictEqual(converter.arabicToEnglish('ف'), 't');
      assert.strictEqual(converter.arabicToEnglish('ا'), 'h');
      assert.strictEqual(converter.arabicToEnglish('ش'), 'a');
    });

    test('converts a word — "مثف" (l,e,t → "let")', () => {
      // l→م  e→ث  t→ف
      assert.strictEqual(converter.arabicToEnglish('مثف'), 'let');
    });

    test('converts "اثمم" (h,e,l,l in Arabic layout) to "hell"', () => {
      // h→ا  e→ث  l→م  l→م
      assert.strictEqual(converter.arabicToEnglish('اثمم'), 'hell');
    });

    test('converts "فثسف" (t,e,s,t → "test")', () => {
      assert.strictEqual(converter.arabicToEnglish('فثسف'), 'test');
    });

    test('handles لا (lam-alef) ligature → "b"', () => {
      assert.strictEqual(converter.arabicToEnglish('لا'), 'b');
    });

    test('handles لا inside a longer word', () => {
      // لا=b  ي=d (d→ي)   يلا... hmm  let us do: لاي = 'bd'
      assert.strictEqual(converter.arabicToEnglish('لاي'), 'bd');
    });

    test('preserves characters with no mapping (digits, spaces)', () => {
      assert.strictEqual(converter.arabicToEnglish('123'), '123');
      assert.strictEqual(converter.arabicToEnglish(' '), ' ');
    });

    test('handles empty string', () => {
      assert.strictEqual(converter.arabicToEnglish(''), '');
    });

    test('preserves whitespace between words', () => {
      // ف=t  ث=e  (space)  م=l
      assert.strictEqual(converter.arabicToEnglish('فث م'), 'te l');
    });

    test('converts Arabic-Indic numerals to Western digits', () => {
      assert.strictEqual(converter.arabicToEnglish('١٢٣'), '123');
    });
  });

  // ── englishToArabic ──────────────────────────────────────────────────────

  suite('englishToArabic()', () => {
    test('converts single English key to Arabic', () => {
      assert.strictEqual(converter.englishToArabic('t'), 'ف');
      assert.strictEqual(converter.englishToArabic('h'), 'ا');
    });

    test('converts "let" → "مثف"', () => {
      assert.strictEqual(converter.englishToArabic('let'), 'مثف');
    });

    test('converts "test" → "فثسف"', () => {
      assert.strictEqual(converter.englishToArabic('test'), 'فثسف');
    });

    test('converts "b" → "لا" (lam-alef ligature)', () => {
      assert.strictEqual(converter.englishToArabic('b'), 'لا');
    });

    test('preserves characters with no mapping (digits, spaces)', () => {
      assert.strictEqual(converter.englishToArabic('123'), '123');
      assert.strictEqual(converter.englishToArabic(' '), ' ');
    });

    test('handles empty string', () => {
      assert.strictEqual(converter.englishToArabic(''), '');
    });

    test('round-trips correctly: English → Arabic → English', () => {
      const original = 'hello';
      const arabic = converter.englishToArabic(original);
      const back = converter.arabicToEnglish(arabic);
      assert.strictEqual(back, original);
    });
  });

  // ── convert() auto-detect ─────────────────────────────────────────────────

  suite('convert() — auto-detect', () => {
    test('detects Arabic first char and converts to English', () => {
      assert.strictEqual(converter.convert('فثسف'), 'test');
    });

    test('detects English first char and converts to Arabic', () => {
      assert.strictEqual(converter.convert('test'), 'فثسف');
    });

    test('mixed: Arabic word with trailing digits — converts Arabic part', () => {
      // Direction detected from first char: Arabic
      assert.strictEqual(converter.convert('فثسف123'), 'test123');
    });

    test('empty string returns empty string', () => {
      assert.strictEqual(converter.convert(''), '');
    });

    test('only digits (unknown direction) → passes through unchanged', () => {
      // Unknown direction falls back to arabicToEnglish; digits have no mapping
      assert.strictEqual(converter.convert('42'), '42');
    });
  });

  // ── detectDirection() ─────────────────────────────────────────────────────

  suite('detectDirection()', () => {
    test('returns "arabic" for Arabic text', () => {
      assert.strictEqual(converter.detectDirection('فثسف'), 'arabic');
    });

    test('returns "english" for English text', () => {
      assert.strictEqual(converter.detectDirection('test'), 'english');
    });

    test('returns "unknown" for digit-only text', () => {
      assert.strictEqual(converter.detectDirection('123'), 'unknown');
    });

    test('detects by first meaningful character', () => {
      assert.strictEqual(converter.detectDirection('  ف hello'), 'arabic');
      assert.strictEqual(converter.detectDirection('  h مرحبا'), 'english');
    });
  });
});
