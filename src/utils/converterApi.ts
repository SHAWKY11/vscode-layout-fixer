import { LayoutConverter } from '../services/layoutConverter';

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  EXTENSION POINT — replace this function body to change what happens    │
 * │  when the user triggers the convert shortcut.                           │
 * │                                                                         │
 * │  Examples:                                                              │
 * │                                                                         │
 * │  Real-time translation (e.g. Google Translate, DeepL):                  │
 * │    const res = await fetch('https://translation.googleapis.com/...', {  │
 * │      method: 'POST',                                                    │
 * │      body: JSON.stringify({ q: text, target: 'en', source: 'ar' }),     │
 * │    });                                                                   │
 * │    return (await res.json()).data.translations[0].translatedText;       │
 * │                                                                         │
 * │  Spell / grammar correction:                                            │
 * │    return mySpellChecker.fix(text);                                     │
 * │                                                                         │
 * │  Contract:                                                              │
 * │    • Always return Promise<string> — even for sync operations.          │
 * │    • Return the original text unchanged if no conversion is possible.   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Default implementation: Arabic ↔ English keyboard-layout flip (no network).
 */
export async function convertLanguage(text: string): Promise<string> {
  const converter = new LayoutConverter();

  // Auto-detects direction: Arabic input → English output, English → Arabic.
  return converter.convert(text);
}
