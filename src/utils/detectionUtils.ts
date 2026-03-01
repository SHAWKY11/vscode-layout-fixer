/**
 * Utilities for detecting text direction and character types
 * based on the Arabic/English keyboard layout context.
 */

/** Represents the detected primary direction of a text segment. */
export type TextDirection = 'arabic' | 'english' | 'unknown';

/** Matches any character in the Arabic Unicode block (U+0600–U+06FF). */
const ARABIC_CHAR_RE = /[\u0600-\u06FF]/;

/** Matches standard Latin letters. */
const ENGLISH_LETTER_RE = /[a-zA-Z]/;

/**
 * Detects the primary direction of a text string by finding the first
 * character that is either Arabic or a Latin letter.
 *
 * O(n) — exits on first meaningful character.
 */
export function detectDirection(text: string): TextDirection {
  for (const char of text) {
    if (ARABIC_CHAR_RE.test(char)) {
      return 'arabic';
    }
    if (ENGLISH_LETTER_RE.test(char)) {
      return 'english';
    }
  }
  return 'unknown';
}

/**
 * Returns true if the character is in the Arabic Unicode block.
 */
export function isArabicChar(char: string): boolean {
  return ARABIC_CHAR_RE.test(char);
}

/**
 * Returns true if the character is a Latin letter (a–z, A–Z).
 */
export function isEnglishLetter(char: string): boolean {
  return ENGLISH_LETTER_RE.test(char);
}

/**
 * Returns true if the string contains at least one Arabic character.
 */
export function containsArabic(text: string): boolean {
  return ARABIC_CHAR_RE.test(text);
}

/**
 * Returns true if the string contains at least one Latin letter.
 */
export function containsEnglish(text: string): boolean {
  return ENGLISH_LETTER_RE.test(text);
}
