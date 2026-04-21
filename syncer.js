// src/core/syncer.js
// Handles syncing found labels into:
// 1. messages.json           → adds new key-value pairs
// 2. ApplicationMessages.js  → adds new constants to MESSAGES object

import fs from "fs-extra";
import { toScreamingSnakeCase, deduplicateKey } from "./keyGenerator.js";

/**
 * Syncs new labels into the JSON dictionary file
 * Returns: { added: [...], skipped: [...] }
 */
function syncToJson(labelsFilePath, rawLabels, dryRun = false) {
  let existing = {};
  if (fs.existsSync(labelsFilePath)) {
    existing = fs.readJsonSync(labelsFilePath);
  }

  // Build reverse map: "Building Name" => "BUILDING_NAME" (existing)
  const reverseMap = {};
  for (const [key, val] of Object.entries(existing)) {
    reverseMap[val] = key;
  }

  const existingKeys = new Set(Object.keys(existing));
  const added = [];
  const skipped = [];
  const newEntries = { ...existing };

  for (const label of rawLabels) {
    // Already exists by value — skip
    if (reverseMap[label]) {
      skipped.push({ label, existingKey: reverseMap[label] });
      continue;
    }

    let key = toScreamingSnakeCase(label);
    key = deduplicateKey(key, existingKeys);

    newEntries[key] = label;
    existingKeys.add(key);
    reverseMap[label] = key;
    added.push({ key, label });
  }

  if (!dryRun && added.length > 0) {
    fs.writeJsonSync(labelsFilePath, newEntries, { spaces: 2 });
  }

  return { added, skipped };
}

/**
 * Syncs new keys into ApplicationMessages.js constants file
 * Looks for: MESSAGES: { ... } and appends new keys inside
 */
function syncToAppMsg(appMsgFilePath, newKeys, dryRun = false) {
  if (!fs.existsSync(appMsgFilePath)) {
    console.warn(`⚠️  AppMsg file not found: ${appMsgFilePath}`);
    return [];
  }

  let content = fs.readFileSync(appMsgFilePath, "utf8");
  const added = [];

  for (const { key } of newKeys) {
    // Skip if key already exists in file
    if (content.includes(`${key}:`)) continue;

    // Find MESSAGES: { block and insert before closing }
    const messagesStart = content.indexOf("export const MESSAGES = {");
    if (messagesStart === -1) {
      console.warn(`⚠️  Could not find MESSAGES: { } block in ${appMsgFilePath}`);
      break;
    }

    // Find the closing } of the MESSAGES object
    let braceCount = 0;
    let insertAt = -1;
    for (let i = messagesStart; i < content.length; i++) {
      if (content[i] === "{") braceCount++;
      else if (content[i] === "}") {
        braceCount--;
        if (braceCount === 0) {
          insertAt = i;
          break;
        }
      }
    }

    if (insertAt === -1) {
      console.warn(`⚠️  Could not find closing brace for MESSAGES object in ${appMsgFilePath}`);
      break;
    }

    const insertion = `  ${key}: "${key}",\n`;
    content = content.slice(0, insertAt) + insertion + content.slice(insertAt);
    added.push(key);
  }

  if (!dryRun && added.length > 0) {
    fs.writeFileSync(appMsgFilePath, content, "utf8");
  }

  return added;
}

export { syncToJson, syncToAppMsg };
