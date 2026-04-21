// src/core/orchestrator.js
// Main runner — ties scanner, syncer, and transformer together
// Also handles change tracking for undo functionality

import { glob } from "glob";
import path from "path";
import fs from "fs-extra";
import { scanFile } from "./scanner.js";
import { syncToJson, syncToAppMsg } from "./syncer.js";
import { transformFile } from "./transformer.js";
import crypto from "crypto";

const DEFAULT_CONFIG = {
  labelsFile: "./src/utils/messages/messages.json",
  appMsgFile: "./src/utils/messages/ApplicationMessages.js",
  scanDir: "./src",
  keyFormat: "SCREAMING_SNAKE_CASE",
  extensions: ["jsx", "tsx", "js", "ts"],
  dryRun: false,
  changeTrackingDir: "./.tririga-sync-changes",
};

/**
 * Create a backup of changes for undo functionality
 */
function trackChanges(filePath, originalContent, changeTrackingDir) {
  const changesDir = path.resolve(process.cwd(), changeTrackingDir);
  fs.ensureDirSync(changesDir);

  const fileHash = crypto
    .createHash("md5")
    .update(filePath)
    .digest("hex");
  const backupFile = path.join(changesDir, `${fileHash}.json`);

  const backup = {
    filePath,
    originalContent,
    timestamp: new Date().toISOString(),
    hash: fileHash,
  };

  fs.writeJsonSync(backupFile, backup);
  return fileHash;
}

/**
 * Restore files from backup (undo)
 */
function restoreFromBackup(changeTrackingDir) {
  const changesDir = path.resolve(process.cwd(), changeTrackingDir);

  if (!fs.existsSync(changesDir)) {
    console.log("❌  No previous changes found to undo");
    return false;
  }

  const backupFiles = fs.readdirSync(changesDir).filter((f) =>
    f.endsWith(".json")
  );

  if (backupFiles.length === 0) {
    console.log("❌  No previous changes found to undo");
    return false;
  }

  let restored = 0;
  for (const backupFile of backupFiles) {
    const backup = fs.readJsonSync(path.join(changesDir, backupFile));
    fs.writeFileSync(backup.filePath, backup.originalContent, "utf8");
    console.log(`   ✓ Restored: ${backup.filePath}`);
    restored++;
  }

  // Clean up backup directory
  fs.removeSync(changesDir);

  console.log(`\n✅  Successfully restored ${restored} file(s)\n`);
  return true;
}

async function run(userConfig = {}) {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const {
    labelsFile,
    appMsgFile,
    scanDir,
    extensions,
    dryRun,
    changeTrackingDir,
  } = config;

  // Check for undo flag
  if (userConfig.undo) {
    console.log("\n🔄  tririga-label-sync UNDO mode...\n");
    restoreFromBackup(changeTrackingDir);
    return;
  }

  console.log("\n🔍  tririga-label-sync starting...\n");
  if (dryRun) console.log("📋  DRY RUN — no files will be modified\n");

  // Step 1: Find all component files
  const pattern = `${scanDir}/**/*.{${extensions.join(",")}}`;
  const files = await glob(pattern, { absolute: true });

  // Filter out node_modules and only get JSX files from pages/components
  const jsxFiles = files.filter((f) => {
    const relativePath = path.relative(process.cwd(), f).replace(/\\/g, "/");
    return (
      !relativePath.includes("node_modules") &&
      (relativePath.includes("/pages/") || relativePath.includes("/components/")) &&
      (f.endsWith(".jsx") || f.endsWith(".tsx"))
    );
  });

  console.log(`📂  Found ${jsxFiles.length} JSX files to scan\n`);

  // Step 2: Scan all files for raw label strings
  const allLabels = new Set();
  const fileResults = {};

  for (const file of jsxFiles) {
    const found = scanFile(file);
    if (found.length > 0) {
      fileResults[file] = found;
      found.forEach((f) => allLabels.add(f.label));
    }
  }

  console.log(
    `🏷️   Found ${allLabels.size} unique labels across ${Object.keys(fileResults).length} files\n`
  );

  if (allLabels.size === 0) {
    console.log("✅  Nothing to sync. All labels already use appMessages format.");
    return;
  }

  // Step 3: Sync to JSON file
  const { added, skipped } = syncToJson(labelsFile, [...allLabels], dryRun);
  console.log(`📝  JSON sync: ${added.length} added, ${skipped.length} already existed`);
  if (added.length > 0) {
    added.forEach(({ key, label }) =>
      console.log(`     + ${key}: "${label}"`)
    );
  }

  // Step 4: Sync new keys to ApplicationMessages.js
  const appMsgAdded = syncToAppMsg(appMsgFile, added, dryRun);
  console.log(`\n⚙️   AppMsg sync: ${appMsgAdded.length} keys added`);
  if (appMsgAdded.length > 0) {
    appMsgAdded.forEach((key) => console.log(`     + ${key}`));
  }

  // Step 5: Build reverse map for transformer
  const existingJson = fs.readJsonSync(labelsFile);
  const labelMap = {};
  for (const [key, val] of Object.entries(existingJson)) {
    labelMap[val] = key;
  }

  // Step 6: Transform files
  console.log("\n✏️   Transforming files...\n");
  let totalReplacements = 0;
  const componentsNeedingProps = [];

  for (const [file, found] of Object.entries(fileResults)) {
    // Read original content for backup
    const originalContent = fs.readFileSync(file, "utf8");

    const { replacements, needsAppMessagesProp, componentName } = transformFile(
      file,
      labelMap,
      dryRun
    );

    if (replacements.length > 0) {
      const relPath = path.relative(process.cwd(), file);
      console.log(`   ${relPath} — ${replacements.length} replacement(s)`);
      totalReplacements += replacements.length;

      // Track changes for undo
      if (!dryRun) {
        trackChanges(file, originalContent, changeTrackingDir);
      }

      // Track components needing props
      if (needsAppMessagesProp && componentName) {
        componentsNeedingProps.push({
          file: relPath,
          component: componentName,
        });
      }
    }
  }

  // Show components that need appMessages prop
  if (componentsNeedingProps.length > 0) {
    console.log("\n⚠️   Components needing appMessages prop:\n");
    componentsNeedingProps.forEach(({ file, component }) => {
      console.log(`   ${file}`);
      console.log(
        `      • Update: ({ appMessages, ...props }) => { ... }`
      );
    });
    console.log("\n   Pass appMessages from parent component:");
    console.log("      • <ComponentName appMessages={appMessages} />\n");
  }

  console.log(
    `\n✅  Done! ${totalReplacements} replacements made${dryRun ? " (dry run)" : ""}\n`
  );

  // Show undo command
  if (totalReplacements > 0 && !dryRun) {
    console.log(
      '💡  To undo all changes, run: npx tririga-react-label-sync-plugin --undo\n'
    );
  }
}

export { run };
