#!/usr/bin/env node
// src/cli/index.js
// CLI for tririgaReactLabelSyncPlugin
// Scans JSX files in a Tririga React app and auto-syncs hardcoded strings to messages.json & ApplicationMessages.js
// Also provides undo capability to revert all changes

import path from "path";
import fs from "fs-extra";
import { run } from "./orchestrator.js";

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const undo = args.includes("--undo");
const configFlag = args.indexOf("--config");
const configPath =
  configFlag !== -1 ? args[configFlag + 1] : "tririga-label.config.js";

async function main() {
  // Load user config if exists
  let userConfig = {};
  const resolvedConfig = path.resolve(process.cwd(), configPath);

  if (fs.existsSync(resolvedConfig)) {
    const configModule = await import(resolvedConfig);
    userConfig = configModule.default || configModule;
    console.log(`⚙️  Loaded config from ${configPath}`);
  } else {
    console.log("⚙️  No config file found, using defaults");
    console.log(
      "   Default: scan ./src, update ./src/utils/messages/messages.json"
    );
  }

  if (dryRun) userConfig.dryRun = true;
  if (undo) userConfig.undo = true;

  await run(userConfig);
}

main().catch((err) => {
  console.error("❌  tririgaReactLabelSyncPlugin failed:", err.message);
  process.exit(1);
});
