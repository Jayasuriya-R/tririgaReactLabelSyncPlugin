# 🔄 Tririga React Label Sync Plugin

> **Automate i18n for TRIRIGA React apps** — scan, sync, and replace hardcoded strings in one command.

![npm](https://img.shields.io/badge/npm-tririgaReactLabelSyncPlugin-red?style=flat-square&logo=npm)
![license](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![vite](https://img.shields.io/badge/Vite-compatible-646CFF?style=flat-square&logo=vite)
![i18n](https://img.shields.io/badge/i18n-automated-blue?style=flat-square)

---

⚠️ Disclaimer: This is an independent, community-built tool and is not affiliated with, endorsed by, or officially supported by IBM or IBM TRIRIGA. Always run --dry-run before applying changes to your codebase.

## 📌 What It Does

Writing hardcoded strings during development is fast — but cleaning them up for internationalization is painful. This plugin automates the entire process.

```
Before                                    After
──────────────────────────────────────    ──────────────────────────────────────
<h1>Welcome Home</h1>          ──►        <h1>{appMessages[AppMsg.MESSAGES.WELCOME_HOME]}</h1>
<button>Login</button>         ──►        <button>{appMessages[AppMsg.MESSAGES.LOGIN]}</button>
<p>User Details</p>            ──►        <p>{appMessages[AppMsg.MESSAGES.USER_DETAILS]}</p>
```

It also updates your message files automatically:

| File | What changes |
|---|---|
| `messages.json` | New key-value pairs added |
| `ApplicationMessages.js` | New constants added to `MESSAGES` object |
| `*.jsx / *.tsx` | Hardcoded strings replaced with `appMessages` calls |

---

## 📦 Installation

```bash
npm install --save-dev tririgaReactLabelSyncPlugin
```

---

## 🚀 Usage

```bash
# Run the full sync
npx tririgaReactLabelSyncPlugin

# Preview changes without modifying any files
npx tririgaReactLabelSyncPlugin --dry-run

# Undo — restore all JSX files to their original state
npx tririgaReactLabelSyncPlugin --undo
```

---

## ⚙️ How It Works

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  1. SCAN       Finds all .jsx / .tsx in src/            │
│       │                                                 │
│       ▼                                                 │
│  2. FILTER     Keeps purely alphabetic strings only     │
│       │        (skips numbers, symbols, colons, etc.)   │
│       ▼                                                 │
│  3. SYNC       Adds entries to messages.json            │
│       │        Creates constants in ApplicationMessages │
│       ▼                                                 │
│  4. REPLACE    Swaps strings → appMessages[AppMsg.KEY]  │
│       │                                                 │
│       ▼                                                 │
│  5. BACKUP     Saves originals for --undo               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🧩 Accessing `appMessages` in Components

Three ways to use `appMessages` — pick what fits your component:

### Option 1 — Hook *(recommended)*
```jsx
import { useDictionary } from '../../providers/DictionaryProvider';

const MyComponent = () => {
  const appMessages = useDictionary();
  return <h1>{appMessages[AppMsg.MESSAGES.WELCOME_HOME]}</h1>;
};
```

### Option 2 — HOC
```jsx
import { withDictionary } from '../../providers/DictionaryProvider';

const MyComponent = ({ appMessages }) => (
  <h1>{appMessages[AppMsg.MESSAGES.WELCOME_HOME]}</h1>
);

export default withDictionary(MyComponent);
```

### Option 3 — Prop
```jsx
const MyComponent = ({ appMessages }) => (
  <h1>{appMessages[AppMsg.MESSAGES.WELCOME_HOME]}</h1>
);
```

> 💡 Wrap your app root with `<DictionaryProvider>` to make `appMessages` available throughout.

---

## ✨ Features at a Glance

| Feature | Details |
|---|---|
| 🔍 Smart scanning | Scans all `.jsx` / `.tsx` in `src/pages` and `src/components` |
| 🔑 Auto key generation | Converts text to `SCREAMING_SNAKE_CASE` keys |
| 🚫 Intelligent filtering | Skips strings with numbers, symbols, or special characters |
| 🔄 Dual sync | Updates both `messages.json` and `ApplicationMessages.js` |
| ♻️ Duplicate prevention | Deduplicates keys automatically |
| 👁️ Dry-run mode | Preview all changes before applying |
| ↩️ Full undo | Restore original JSX files with one command |
| ⚡ Vite compatible | Works with Vite-based TRIRIGA React templates |

---

## ↩️ Undoing Changes

```bash
npx tririgaReactLabelSyncPlugin --undo
```

- Restores all `.jsx` / `.tsx` files to their original state
- `messages.json` and `ApplicationMessages.js` are **not** reverted
- Deletes the `.tririga-sync-changes` backup directory
- Lets you re-run the tool after fixing any issues

---

## ⚠️ Notes

- Only purely alphabetic strings are captured — strings with `:`, numbers, or symbols are ignored
- Backups are stored in `.tririga-sync-changes/` — do not delete this manually if you need undo
- Designed specifically for Vite-based **TRIRIGA React** applications

---

## 📄 License

MIT
