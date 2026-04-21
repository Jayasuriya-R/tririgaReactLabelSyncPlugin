// src/plugin/vitePlugin.js
// Vite plugin integration for tririgaReactLabelSyncPlugin
// 
// Usage in vite.config.js:
//   import tririgaReactLabelSyncPlugin from 'tririgaReactLabelSyncPlugin/plugin'
//   plugins: [tririgaReactLabelSyncPlugin({ scanDir: './src' })]
//
// This will auto-sync labels on:
// - Dev server start
// - Hot module reload on save

import { run } from "./orchestrator.js";

function tririgaReactLabelSyncPlugin(userConfig = {}) {
  return {
    name: "vite-plugin-tririga-react-label-sync",
    enforce: "pre",

    // Run on every hot reload save
    async handleHotUpdate({ file }) {
      const ext = file.split(".").pop();
      if (["jsx", "tsx", "js", "ts"].includes(ext)) {
        console.log(
          "\n[tririgaReactLabelSyncPlugin] File changed, syncing labels..."
        );
        await run({ ...userConfig, dryRun: false });
      }
    },

    // Run once on dev server start
    async buildStart() {
      console.log("\n[tririgaReactLabelSyncPlugin] Initial label sync...");
      await run({ ...userConfig, dryRun: false });
    },
  };
}

export default tririgaReactLabelSyncPlugin;
