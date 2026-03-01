# KeyFlip

> Instantly flip text between Arabic and English keyboard layouts — no translation, just key remapping.

---

## The Problem

You are typing in your editor, fully focused, only to look up and realize your keyboard layout was set to Arabic the whole time. What you thought was `test` is now `فثسف`. Or vice versa.

KeyFlip fixes that in one keystroke.

---

## Demo

| You typed (wrong layout) | After KeyFlip (`Ctrl+Alt+L`) |
|--------------------------|------------------------------|
| `فثسف`                   | `test`                       |
| `مثف`                    | `let`                        |
| `test`                   | `فثسف`                       |
| `hello`                  | `اثممخ`                      |

> **KeyFlip does NOT translate.** It only remaps characters based on their physical keyboard position.

---

## Features

| Feature | Description |
|---------|-------------|
| **Smart Auto-Detect** | First letter determines direction: Arabic → English or English → Arabic |
| **Selection Convert** | Select any text, press `Ctrl+Alt+L` |
| **Cursor Convert** | No selection? Converts the word under the cursor |
| **Line Fallback** | No word either? Converts the entire line |
| **Full Mapping** | Letters, symbols, diacritics, Arabic-Indic numerals |
| **لا Ligature** | Correctly handles the lam-alef two-character sequence |
| **Status Bar Toggle** | `KeyFlip: ON / OFF` in the status bar |
| **Auto-Fix on Save** | Optional: converts stray Arabic in code files on save |
| **Smart Safety** | Auto-fix skips strings, comments, and Blade directives |
| **Multi-Cursor** | Works across all active cursors simultaneously |

---

## Installation

### From the Marketplace

1. Open VS Code
2. Press `Ctrl+P` and type:
   ```
   ext install your-publisher-id.keyflip
   ```
3. Press Enter

### From a `.vsix` file

```bash
code --install-extension keyflip-1.0.0.vsix
```

---

## Usage

### Convert selected text

1. Select the text you want to convert
2. Press `Ctrl+Alt+L` (macOS: `Cmd+Alt+L`)

### Convert word at cursor

1. Place the cursor inside the word
2. Press `Ctrl+Alt+L` — KeyFlip converts the token under the cursor

### Convert entire line

1. Place the cursor anywhere on the line (no selection)
2. Press `Ctrl+Alt+L` — falls back to the full line if no token is found

### Toggle on/off

- Click the **`KeyFlip: ON`** item in the status bar
- Or run the command **KeyFlip: Toggle On/Off** from the Command Palette (`Ctrl+Shift+P`)

---

## Keyboard Mapping Reference

Based on the **standard Windows Arabic (101)** layout.

### Lowercase

| English | Arabic | English | Arabic | English | Arabic |
|---------|--------|---------|--------|---------|--------|
| `q` | ض | `w` | ص | `e` | ث |
| `r` | ق | `t` | ف | `y` | غ |
| `u` | ع | `i` | ه | `o` | خ |
| `p` | ح | `[` | ج | `]` | د |
| `a` | ش | `s` | س | `d` | ي |
| `f` | ب | `g` | ل | `h` | ا |
| `j` | ت | `k` | ن | `l` | م |
| `;` | ك | `'` | ط | `z` | ئ |
| `x` | ء | `c` | ؤ | `v` | ر |
| `b` | لا | `n` | ى | `m` | ة |
| `,` | و | `.` | ز | `/` | ظ |
| `` ` `` | ذ | | | | |

### Shifted

| English | Arabic | English | Arabic |
|---------|--------|---------|--------|
| `Q` | ً (tanwin fath) | `W` | ٌ (tanwin damm) |
| `E` | ٍ (tanwin kasr) | `R` | َ (fatha) |
| `T` | ُ (damma) | `Y` | ِ (kasra) |
| `U` | ّ (shadda) | `H` | أ |
| `N` | آ | `J` | ـ (tatweel) |
| `K` | ، | `P` | ؛ |
| `?` | ؟ | `%` | ٪ |

---

## Settings

Open **Settings** (`Ctrl+,`) and search for **KeyFlip**.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `keyflip.autoFixOnSave` | boolean | `false` | Auto-convert wrong-layout Arabic text on save |
| `keyflip.enableStatusBar` | boolean | `true` | Show the KeyFlip status bar item |

### `settings.json` example

```json
{
  "keyflip.autoFixOnSave": false,
  "keyflip.enableStatusBar": true
}
```

---

## Auto-Fix on Save

When `keyflip.autoFixOnSave` is `true`, KeyFlip scans each file before saving.

### What it touches

- Plain Arabic text found in unprotected regions

### What it **never** touches

- String literals (`'…'`, `"…"`, `` `…` ``)
- Line comments (`// …`)
- Block comments (`/* … */`)
- Hash comments (`# …` — Python, Ruby, YAML, Shell)
- HTML/XML comments (`<!-- … -->`)
- Blade directives (`@section`, `@foreach`, …)

> **Tip:** Keep `autoFixOnSave: false` (the default) if you store Arabic user-facing content in your source files.

---

## Custom Keybinding

Change the default `Ctrl+Alt+L` via the Keybindings editor:

1. Press `Ctrl+K` `Ctrl+S`
2. Search for `keyflip.convert`
3. Click the pencil icon and enter your preferred shortcut

Or add this to `keybindings.json`:

```json
{
  "key": "ctrl+shift+k",
  "command": "keyflip.convert",
  "when": "editorTextFocus"
}
```

---

## Building & Packaging

### Prerequisites

```bash
npm install -g @vscode/vsce
```

### Compile

```bash
npm run compile
```

### Run in development

Press `F5` in VS Code with this project open — a new Extension Development Host window will launch.

### Package as `.vsix`

```bash
npm run package
# or:
vsce package
```

This produces `keyflip-1.0.0.vsix` in the project root.

### Install locally

```bash
code --install-extension keyflip-1.0.0.vsix
```

---

## Publishing to the Marketplace

1. Create a publisher account at [marketplace.visualstudio.com](https://marketplace.visualstudio.com/manage)

2. Generate a Personal Access Token (PAT) with **Marketplace → Manage** scope

3. Login:
   ```bash
   vsce login your-publisher-id
   ```

4. Update `package.json`:
   ```json
   {
     "publisher": "your-publisher-id"
   }
   ```

5. Publish:
   ```bash
   vsce publish
   ```

   Or publish a specific version bump:
   ```bash
   vsce publish patch   # 1.0.0 → 1.0.1
   vsce publish minor   # 1.0.0 → 1.1.0
   vsce publish major   # 1.0.0 → 2.0.0
   ```

---

## Project Structure

```
keyflip/
├── src/
│   ├── commands/
│   │   └── convertLayoutCommand.ts   # keyflip.convert & keyflip.toggle
│   ├── services/
│   │   ├── layoutConverter.ts        # Core O(n) conversion logic
│   │   ├── documentProtector.ts      # Safe-region detection
│   │   ├── statusBarService.ts       # Status bar item lifecycle
│   │   └── autoFixService.ts         # onWillSave handler
│   ├── utils/
│   │   ├── arabicEnglishMap.ts       # Keyboard mapping data
│   │   └── detectionUtils.ts         # Direction & character helpers
│   ├── test/
│   │   ├── suite/
│   │   │   ├── index.ts              # Mocha test runner entry
│   │   │   └── layoutConverter.test.ts
│   │   └── runTest.ts                # @vscode/test-electron bootstrap
│   └── extension.ts                  # activate() / deactivate()
├── .eslintrc.json
├── .vscodeignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes and add tests
4. Run linting: `npm run lint`
5. Compile: `npm run compile`
6. Submit a pull request

### Adding keyboard layouts

All mapping data lives in [src/utils/arabicEnglishMap.ts](src/utils/arabicEnglishMap.ts).
Multi-character sequences (like `لا`) go in `ARABIC_MULTICHAR_TO_ENGLISH`.

---

## License

MIT — see LICENSE for details.
