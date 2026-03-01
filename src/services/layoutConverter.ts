import {
  ARABIC_MULTICHAR_TO_ENGLISH,
  ARABIC_TO_ENGLISH,
  ENGLISH_TO_ARABIC,
} from '../utils/arabicEnglishMap';
import { detectDirection, type TextDirection } from '../utils/detectionUtils';

/**
 * Core conversion service.
 *
 * Responsibilities:
 *  - Auto-detect whether input is Arabic or English
 *  - Convert in O(n) time with no external dependencies
 *  - Handle multi-character Arabic ligatures (e.g. لا → b)
 *  - Preserve characters that have no mapping
 */
export class LayoutConverter {
  /**
   * Converts text based on auto-detected direction.
   *
   * Arabic input  → English output
   * English input → Arabic output
   * Unknown input → attempts Arabic→English (most common accident)
   */
  public convert(text: string): string {
    const direction = detectDirection(text);

    switch (direction) {
      case 'arabic':
        return this.arabicToEnglish(text);
      case 'english':
        return this.englishToArabic(text);
      default:
        return this.arabicToEnglish(text);
    }
  }

  /**
   * Converts Arabic characters to English keyboard equivalents.
   *
   * Multi-character sequences (e.g. لا → b) are matched greedily before
   * single-character lookups, preserving O(n) overall complexity.
   */
  public arabicToEnglish(text: string): string {
    let result = '';
    let i = 0;

    while (i < text.length) {
      // --- greedy multi-char match ---
      let consumed = false;

      for (const [arabicSeq, englishKey] of ARABIC_MULTICHAR_TO_ENGLISH) {
        if (text.startsWith(arabicSeq, i)) {
          result += englishKey;
          i += arabicSeq.length;
          consumed = true;
          break;
        }
      }

      if (!consumed) {
        const char = text[i];
        result += ARABIC_TO_ENGLISH[char] ?? char;
        i++;
      }
    }

    return result;
  }

  /**
   * Converts English keyboard characters to Arabic equivalents.
   *
   * Single-pass, O(n).
   */
  public englishToArabic(text: string): string {
    let result = '';

    for (const char of text) {
      result += ENGLISH_TO_ARABIC[char] ?? char;
    }

    return result;
  }

  /**
   * Returns the detected direction without converting.
   * Exposed for callers that need direction metadata.
   */
  public detectDirection(text: string): TextDirection {
    return detectDirection(text);
  }
}
