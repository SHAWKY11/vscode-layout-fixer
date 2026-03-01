import type * as vscode from 'vscode';

/** Byte-offset range within a flat string. */
export interface ProtectedRange {
  readonly start: number;
  readonly end: number;
}

/** A text segment with its protection status. */
export interface TextSegment {
  readonly text: string;
  /** Character offset within the parent string where this segment starts. */
  readonly offset: number;
  readonly isProtected: boolean;
}

/**
 * Identifies regions in source code that must not be auto-converted:
 *  - String literals  (single / double / template quotes)
 *  - Line comments    (// …)
 *  - Block comments   (/* … *\/)
 *  - Hash comments    (# …  — Python, Ruby, YAML, Shell)
 *  - HTML/XML comments (<!-- … -->)
 *  - Blade directives  (@directive, @section … @endsection)
 *
 * All parsing is regex-based and intentionally conservative: when in doubt
 * a region is marked as protected.
 */
export class DocumentProtector {
  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Returns true if the VS Code Range falls entirely inside a protected region.
   */
  public isRangeProtected(
    document: vscode.TextDocument,
    range: vscode.Range,
  ): boolean {
    const text = document.getText();
    const startOffset = document.offsetAt(range.start);
    const endOffset = document.offsetAt(range.end);
    const protected_ = this.getProtectedRanges(text, document.languageId);

    return protected_.some(
      (pr) => startOffset >= pr.start && endOffset <= pr.end,
    );
  }

  /**
   * Splits text into protected and unprotected segments.
   * Protected segments should be left as-is by any converter.
   */
  public getSegments(text: string, languageId: string): TextSegment[] {
    const protectedRanges = this.getProtectedRanges(text, languageId);
    return this.buildSegments(text, protectedRanges);
  }

  /**
   * Collects all protected byte-offset ranges for the given source text.
   */
  public getProtectedRanges(
    text: string,
    languageId: string,
  ): ProtectedRange[] {
    const ranges: ProtectedRange[] = [];

    this.collectStringRanges(text, ranges);
    this.collectLineCommentRanges(text, ranges);
    this.collectBlockCommentRanges(text, ranges);

    if (this.usesHashComments(languageId)) {
      this.collectHashCommentRanges(text, ranges);
    }

    if (this.usesHtmlComments(languageId)) {
      this.collectHtmlCommentRanges(text, ranges);
    }

    if (this.usesBlade(languageId)) {
      this.collectBladeDirectiveRanges(text, ranges);
    }

    return this.mergeRanges(ranges);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private collectStringRanges(text: string, out: ProtectedRange[]): void {
    // Matches '', "", `` with escape sequences and no unescaped newlines for '' and "".
    const re = /(['"`])(?:\\[\s\S]|(?!\1)[^\\])*\1/g;
    this.pushMatches(re, text, out);
  }

  private collectLineCommentRanges(text: string, out: ProtectedRange[]): void {
    const re = /\/\/.*/g;
    this.pushMatches(re, text, out);
  }

  private collectBlockCommentRanges(
    text: string,
    out: ProtectedRange[],
  ): void {
    const re = /\/\*[\s\S]*?\*\//g;
    this.pushMatches(re, text, out);
  }

  private collectHashCommentRanges(text: string, out: ProtectedRange[]): void {
    // Exclude # inside strings by only matching at the start of a "word" position.
    // Conservative: match any # to end-of-line.
    const re = /#.*/g;
    this.pushMatches(re, text, out);
  }

  private collectHtmlCommentRanges(text: string, out: ProtectedRange[]): void {
    const re = /<!--[\s\S]*?-->/g;
    this.pushMatches(re, text, out);
  }

  private collectBladeDirectiveRanges(
    text: string,
    out: ProtectedRange[],
  ): void {
    // @directive or @directive(...) — protect keyword + argument list
    const re = /@[a-zA-Z]+(?:\([^)]*\))?/g;
    this.pushMatches(re, text, out);
  }

  private pushMatches(
    re: RegExp,
    text: string,
    out: ProtectedRange[],
  ): void {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      out.push({ start: m.index, end: m.index + m[0].length });
    }
  }

  /**
   * Merges overlapping / adjacent ranges and sorts them by start offset.
   * This makes segment building O(n log n) rather than O(n²).
   */
  private mergeRanges(ranges: ProtectedRange[]): ProtectedRange[] {
    if (ranges.length === 0) {
      return [];
    }

    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const merged: ProtectedRange[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1];
      const current = sorted[i];

      if (current.start <= last.end) {
        // Overlapping or adjacent — extend the last range
        merged[merged.length - 1] = {
          start: last.start,
          end: Math.max(last.end, current.end),
        };
      } else {
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Builds a list of TextSegment objects from merged protected ranges.
   * Guarantees every character in `text` appears in exactly one segment.
   */
  private buildSegments(
    text: string,
    protectedRanges: ProtectedRange[],
  ): TextSegment[] {
    const segments: TextSegment[] = [];
    let cursor = 0;

    for (const range of protectedRanges) {
      if (range.start > cursor) {
        segments.push({
          text: text.slice(cursor, range.start),
          offset: cursor,
          isProtected: false,
        });
      }

      segments.push({
        text: text.slice(range.start, range.end),
        offset: range.start,
        isProtected: true,
      });

      cursor = range.end;
    }

    if (cursor < text.length) {
      segments.push({
        text: text.slice(cursor),
        offset: cursor,
        isProtected: false,
      });
    }

    return segments;
  }

  // ── Language feature detection ────────────────────────────────────────────

  private usesHashComments(languageId: string): boolean {
    return ['python', 'ruby', 'shellscript', 'yaml', 'perl', 'r'].includes(
      languageId,
    );
  }

  private usesHtmlComments(languageId: string): boolean {
    return ['html', 'xml', 'blade', 'vue', 'svelte'].includes(languageId);
  }

  private usesBlade(languageId: string): boolean {
    return ['blade', 'php'].includes(languageId);
  }
}
