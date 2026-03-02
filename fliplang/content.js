(function () {
  if (window.__flipLangLoaded) return;
  window.__flipLangLoaded = true;

  // ─── Keyboard Mappings ───────────────────────────────────────────────────

  const EN_TO_AR = {
    q: 'ض', w: 'ص', e: 'ث', r: 'ق', t: 'ف', y: 'غ', u: 'ع',
    i: 'ه', o: 'خ', p: 'ح', '[': 'ج', ']': 'د', '\\': 'ذ',
    a: 'ش', s: 'س', d: 'ي', f: 'ب', g: 'ل', h: 'ا', j: 'ت',
    k: 'ن', l: 'م', ';': 'ك', "'": 'ط',
    z: 'ئ', x: 'ء', c: 'ؤ', v: 'ر', b: 'لا', n: 'ى', m: 'ة',
    Q: 'ض', W: 'ص', E: 'ث', R: 'ق', T: 'ف', Y: 'غ', U: 'ع',
    I: 'ه', O: 'خ', P: 'ح',
    A: 'ش', S: 'س', D: 'ي', F: 'ب', G: 'ل', H: 'ا', J: 'ت',
    K: 'ن', L: 'م',
    Z: 'ئ', X: 'ء', C: 'ؤ', V: 'ر', B: 'لا', N: 'ى', M: 'ة',
  };

  const AR_DOUBLE_TO_EN = { 'لا': 'b' };

  const AR_TO_EN = {
    'ض': 'q', 'ص': 'w', 'ث': 'e', 'ق': 'r', 'ف': 't', 'غ': 'y', 'ع': 'u',
    'ه': 'i', 'خ': 'o', 'ح': 'p', 'ج': '[', 'د': ']', 'ذ': '\\',
    'ش': 'a', 'س': 's', 'ي': 'd', 'ب': 'f', 'ل': 'g', 'ا': 'h', 'ت': 'j',
    'ن': 'k', 'م': 'l', 'ك': ';', 'ط': "'",
    'ئ': 'z', 'ء': 'x', 'ؤ': 'c', 'ر': 'v', 'ى': 'n', 'ة': 'm',
  };

  // ─── Conversion ──────────────────────────────────────────────────────────

  function detectDirection(text) {
    let ar = 0, en = 0;
    for (const ch of text) {
      if (/[a-zA-Z]/.test(ch)) en++;
      else if (/[\u0600-\u06FF]/.test(ch)) ar++;
    }
    return ar > en ? 'ar' : 'en';
  }

  function toArabic(text) {
    return [...text].map(ch => EN_TO_AR[ch] ?? ch).join('');
  }

  function toEnglish(text) {
    let result = '', i = 0;
    while (i < text.length) {
      const two = text[i] + (text[i + 1] ?? '');
      if (AR_DOUBLE_TO_EN[two] !== undefined) {
        result += AR_DOUBLE_TO_EN[two];
        i += 2;
      } else {
        result += AR_TO_EN[text[i]] ?? text[i];
        i++;
      }
    }
    return result;
  }

  function convert(text) {
    if (!text) return text;
    return detectDirection(text) === 'ar' ? toEnglish(text) : toArabic(text);
  }

  // ─── Selection Tracking ──────────────────────────────────────────────────
  // Modifier keys (Ctrl, Alt) can sometimes collapse the selection before
  // our keydown handler reads it. We snapshot it continuously so we always
  // have the last known non-collapsed selection to fall back to.

  let savedEl = null, savedStart = -1, savedEnd = -1;

  function snapshotSelection() {
    const el = document.activeElement;
    if (!el) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      try {
        const s = el.selectionStart, e = el.selectionEnd;
        if (s !== null && s !== e) { savedEl = el; savedStart = s; savedEnd = e; }
      } catch (_) {}
    } else {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) { savedEl = null; } // contenteditable handled live
    }
  }

  document.addEventListener('selectionchange', snapshotSelection, true);
  document.addEventListener('mouseup',         snapshotSelection, true);
  document.addEventListener('keyup',           snapshotSelection, true);

  // ─── Replacement: input / textarea ───────────────────────────────────────

  function replaceInInput(el, start, end) {
    const selected = el.value.slice(start, end);
    if (!selected) return;
    const converted = convert(selected);

    el.focus();
    el.setSelectionRange(start, end);

    // execCommand gives best undo-stack & framework (React/Vue) compatibility
    if (document.execCommand('insertText', false, converted)) return;

    // Fallback: native prototype setter so React's synthetic events still fire
    const proto  = el.tagName === 'TEXTAREA'
      ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set
      .call(el, el.value.slice(0, start) + converted + el.value.slice(end));
    el.setSelectionRange(start, start + converted.length);
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ─── Replacement: contenteditable ────────────────────────────────────────

  function replaceInContentEditable() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;

    const text = sel.toString();
    if (!text) return;

    const converted = convert(text);
    const range = sel.getRangeAt(0);

    // Capture host before DOM mutation
    let host = range.commonAncestorContainer;
    while (host && (host.nodeType !== 1 || !host.isContentEditable)) {
      host = host.parentNode;
    }

    if (document.execCommand('insertText', false, converted)) return;

    // DOM fallback
    range.deleteContents();
    const node = document.createTextNode(converted);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    host?.dispatchEvent(new InputEvent('input', {
      bubbles: true, inputType: 'insertText', data: converted,
    }));
  }

  // ─── Main Handler ────────────────────────────────────────────────────────

  let lastRun = 0;

  function handleFlip() {
    const now = Date.now();
    if (now - lastRun < 200) return;
    lastRun = now;

    const el = document.activeElement;

    // ── Case 1: focused input / textarea ──
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      let start, end;
      try { start = el.selectionStart; end = el.selectionEnd; } catch (_) {}

      // Live selection available
      if (start !== null && start !== end) {
        return replaceInInput(el, start, end);
      }
      // Fall back to snapshot (modifier keys may have collapsed the live selection)
      if (savedEl === el && savedStart !== savedEnd) {
        return replaceInInput(el, savedStart, savedEnd);
      }
      return; // nothing selected
    }

    // ── Case 2: focus moved away but snapshot from an input exists ──
    if (savedEl && (savedEl.tagName === 'INPUT' || savedEl.tagName === 'TEXTAREA')
        && savedStart !== savedEnd) {
      return replaceInInput(savedEl, savedStart, savedEnd);
    }

    // ── Case 3: contenteditable (ChatGPT, Gemini, Claude, etc.) ──
    replaceInContentEditable();
  }

  // ─── Event Listeners ─────────────────────────────────────────────────────

  // Primary: keydown capture — fires before the page sees the keystroke.
  // Using e.code so it's layout-independent (works on Arabic/EN keyboards).
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && e.code === 'KeyL') {
      e.preventDefault();
      e.stopPropagation();
      handleFlip();
    }
  }, true);

  // Secondary: message from background (chrome.commands shortcut path)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.action === 'flipLayout') handleFlip();
  });
})();
