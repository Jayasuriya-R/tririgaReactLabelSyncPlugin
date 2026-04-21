// src/core/scanner.js
// Uses Babel AST to find hardcoded strings in JSX files
// Only captures purely alphabetic strings (ignores strings with : or special chars except spaces)
// Finds:
// 1. <Component label="Building Name" />        → common props
// 2. {someString}                                → JSX text
// 3. <div>Building Name</div>                    → Plain JSX text

import _parser from "@babel/parser";
import _traverse from "@babel/traverse";
import fs from "fs-extra";

const parser = _parser.default || _parser;
const traverse = _traverse.default || _traverse;

const LABEL_PROPS = ["label", "t-label", "placeholder", "title", "helperText", "value", "text"];

/**
 * Check if string is valid for syncing (not code, config, URLs, etc)
 * Allows: letters, spaces, hyphens, periods, commas, exclamations
 * Disallows: colons, braces, slashes (likely code), very long strings
 */
function isPurelyAlphabetic(str) {
  if (!str || str.length < 2 || str.length > 200) return false;
  // Allow: letters, spaces, hyphens, periods, commas, exclamation marks, question marks
  // Disallow: colons (config), slashes (paths), braces (code), backticks
  return /^[a-zA-Z\s\-.,!?'&]+$/.test(str);
}

/**
 * Scans a single file and returns all found raw label strings
 * Returns: [{ label: "Building Name", type: "prop"|"jsx"|"attr", line: 12 }]
 */
function scanFile(filePath) {
  const code = fs.readFileSync(filePath, "utf8");
  const found = [];

  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });
  } catch (e) {
    console.warn(`⚠️  Could not parse ${filePath}: ${e.message}`);
    return [];
  }

  traverse(ast, {
    // Case 1: JSX attribute like label="Building Name"
    JSXAttribute(path) {
      const attrName = path.node.name.name;
      if (LABEL_PROPS.includes(attrName)) {
        const val = path.node.value;
        if (val && val.type === "StringLiteral") {
          const trimmed = val.value.trim();
          if (isPurelyAlphabetic(trimmed)) {
            found.push({
              label: trimmed,
              type: "attr",
              line: path.node.loc?.start.line,
            });
          }
        }
      }
    },

    // Case 2: Plain JSX text <p>Building Name</p>
    JSXText(path) {
      const text = path.node.value.trim();
      if (isPurelyAlphabetic(text)) {
        found.push({
          label: text,
          type: "jsx",
          line: path.node.loc?.start.line,
        });
      }
    },

    // Case 3: String literals in JSX expressions
    StringLiteral(path) {
      const text = path.node.value.trim();
      // Only in JSX context, not in imports/requires
      if (path.parent.type === "JSXExpressionContainer" || path.parent.type === "JSXAttribute") {
        if (isPurelyAlphabetic(text)) {
          // Check if not already captured by JSXAttribute handler
          if (path.parent.type === "JSXExpressionContainer") {
            found.push({
              label: text,
              type: "jsx",
              line: path.node.loc?.start.line,
            });
          }
        }
      }
    },
  });

  return found;
}

export { scanFile };
