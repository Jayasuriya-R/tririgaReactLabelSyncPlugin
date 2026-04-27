# TririgaReactLabelSyncPlugin — DictionaryProvider Integration

## 🎯 What's New

When users run `tririgaReactLabelSyncPlugin` in their project, the plugin now **automatically**:

1. ✅ Adds `getAppMessages()` function to `ApplicationMessages.js`
2. ✅ Creates `src/utils/providers/DictionaryProvider.js` 
3. ✅ Updates `src/main.jsx` to wrap app with DictionaryProvider
4. ✅ Wraps route components with `withDictionary` HOC
5. ✅ Replaces hardcoded strings with `appMessages[AppMsg.MESSAGES.KEY]`

---

## 📋 Changes Made to Plugin Files

### 1. **syncer.js** — Added `ensureGetAppMessagesFunction()`
- New export function that adds `export function getAppMessages() { return appMessages; }` to ApplicationMessages.js
- Only adds if function doesn't already exist
- Called in orchestrator after syncing keys to AppMsg file

### 2. **dictionarySetup.js** (NEW FILE)
Contains 3 key functions:

#### a) `createDictionaryProvider(dryRun)`
- Creates `src/utils/providers/DictionaryProvider.js` if it doesn't exist
- Includes context provider, hook (`useDictionary`), and HOC (`withDictionary`)
- Exports all three for use in components

#### b) `updateMainJsx(dryRun)`
- Imports DictionaryProvider in `src/main.jsx`
- Wraps `<TririgaUXWebApp />` with `<DictionaryProvider appMessages={AppMsg.getAppMessages()}>`
- Only updates if not already configured

#### c) `wrapComponentWithDictionary(filePath, dryRun)`
- Uses Babel AST to wrap components with `withDictionary()` HOC
- Adds import: `import { withDictionary } from "../../utils/providers/DictionaryProvider"`
- Changes: `export default HomePage` → `export default withDictionary(HomePage)`
- Detects and wraps all route components

### 3. **orchestrator.js** — Enhanced Pipeline
Updated the main run() function with new steps:

#### Step 4.5: Add getAppMessages() function
```javascript
const hasGetAppMessages = ensureGetAppMessagesFunction(appMsgFile, dryRun);
if (hasGetAppMessages) {
  console.log(`✅  Added getAppMessages() function to ApplicationMessages.js`);
}
```

#### Step 8: DictionaryProvider Infrastructure
```javascript
// Create provider file
const providerCreated = createDictionaryProvider(dryRun);

// Update main.jsx
const mainUpdated = updateMainJsx(dryRun);

// Wrap route components
for each route component:
  wrapComponentWithDictionary(filePath, dryRun)
```

---

## 🔄 Execution Flow When Running `tririgaReactLabelSyncPlugin`

```
┌─────────────────────────────────────────────────────────┐
│ User runs: npx tririgaReactLabelSyncPlugin              │
└─────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│ 1. SCAN JSX files for hardcoded strings                 │
└─────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│ 2. SYNC strings → messages.json + ApplicationMessages   │
└─────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│ 3. ADD getAppMessages() function [NEW]                  │
└─────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│ 4. REPLACE strings with appMessages[AppMsg.KEY] calls   │
└─────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│ 5. CREATE DictionaryProvider.js [NEW]                   │
│    - DictionaryProvider component                       │
│    - useDictionary hook                                 │
│    - withDictionary HOC                                 │
└─────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│ 6. UPDATE main.jsx to wrap app [NEW]                    │
│    - Import DictionaryProvider                          │
│    - Wrap <TririgaUXWebApp /> with provider             │
│    - Pass appMessages={AppMsg.getAppMessages()}         │
└─────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│ 7. WRAP route components with withDictionary [NEW]      │
│    - HomePage                                           │
│    - CurrentUserPage                                    │
│    - Any other route components                         │
└─────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│ ✅ Done! All changes complete                            │
│    Components ready to use appMessages                  │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Example Output

When user runs the command in their project:

```
🔍  tririga-label-sync starting...

📂  Found 4 JSX files to scan

🏷️   Found 12 unique labels across 2 files

📝  JSON sync: 5 added, 7 already existed
     + HOME_HEADER: "Home"
     + USER_DETAILS: "User Details"
     ...

⚙️   AppMsg sync: 5 keys added
     + HOME_HEADER
     + USER_DETAILS
     ...

✅  Added getAppMessages() function to ApplicationMessages.js

✏️   Transforming files...
   src/pages/HomePage/HomePage.jsx — 3 replacement(s)
   src/pages/CurrentUserPage/CurrentUserPage.jsx — 4 replacement(s)

📦  Setting up DictionaryProvider infrastructure...

   ✓ Created src/utils/providers/DictionaryProvider.js
   ✓ Updated src/main.jsx to use DictionaryProvider

   Wrapping route components with withDictionary:

   ✓ Wrapped HomePage with withDictionary
   ✓ Wrapped CurrentUserPage with withDictionary

✅  Done! 7 replacements made

💡  To undo all changes, run: npx tririgaReactLabelSyncPlugin --undo
```

---

## 🔄 Undo Support

Users can undo ALL changes (including DictionaryProvider setup) by running:

```bash
npx tririgaReactLabelSyncPlugin --undo
```

This restores:
- Original JSX files (without appMessages references)
- Original main.jsx (without DictionaryProvider wrapper)
- Original component files (without withDictionary wrapper)

**Note**: It does NOT delete the DictionaryProvider.js file created (it's a utility that can be reused).

---

## 🚀 Command Options

```bash
# Full sync with all setup
npx tririgaReactLabelSyncPlugin

# Preview changes without modifying files
npx tririgaReactLabelSyncPlugin --dry-run

# Undo all previous changes
npx tririgaReactLabelSyncPlugin --undo

# Use custom config file
npx tririgaReactLabelSyncPlugin --config custom-config.js
```

---

## 📦 Files Modified/Created by Plugin

After running the command, the user's project will have:

```
src/
├── main.jsx                           (✏️ UPDATED)
├── app/
│   └── TririgaUXWebApp.jsx           (unchanged)
├── pages/
│   ├── HomePage/
│   │   └── HomePage.jsx              (✏️ UPDATED)
│   ├── CurrentUserPage/
│   │   └── CurrentUserPage.jsx       (✏️ UPDATED)
│   └── index.js                      (unchanged)
└── utils/
    ├── messages/
    │   ├── ApplicationMessages.js    (✏️ UPDATED - getAppMessages added)
    │   ├── messages.json             (✏️ UPDATED - new keys added)
    │   └── ...
    └── providers/
        └── DictionaryProvider.js     (✨ CREATED NEW)
```

---

## ✨ Key Features

✅ **Automatic** — No manual setup required  
✅ **Smart** — Only creates/updates if needed  
✅ **Reversible** — Full undo support  
✅ **Dry-run** — Preview changes before applying  
✅ **Comprehensive** — Handles components, context, HOC wrapping  
✅ **Production-ready** — Handles edge cases and errors gracefully  

---

## 🎯 Result

Users can now:

1. **Define messages centrally** in `messages.json`
2. **Access via context** in any component using the HOC
3. **Use in components** like: `<div>{appMessages[AppMsg.MESSAGES.WELCOME_HOME]}</div>`
4. **Scale easily** for internationalization (i18n)

All with a single command: `npx tririgaReactLabelSyncPlugin`
