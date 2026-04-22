// src/core/transformer.js
// Rewrites JSX files replacing plain label strings with:
// appMessages[AppMsg.MESSAGES.KEY]
//
// Before: label="Building Name"
// After:  label={appMessages[AppMsg.MESSAGES.BUILDING_NAME]}
//
// Before: <p>Building Name</p>
// After:  {appMessages[AppMsg.MESSAGES.BUILDING_NAME]}
//
// Note: appMessages should be available as a prop from parent component

import _parser from "@babel/parser";
import _traverse from "@babel/traverse";
import _generate from "@babel/generator";
import _t from "@babel/types";
import fs from "fs-extra";
import { toScreamingSnakeCase } from "./keyGenerator.js";

const parser = _parser.default || _parser;
const traverse = _traverse.default || _traverse;
const generate = _generate.default || _generate;
const t = _t.default || _t;

const LABEL_PROPS = ["label", "t-label", "placeholder", "title", "helperText", "value", "text"];

/**
 * Builds AST node for: appMessages[AppMsg.MESSAGES.KEY]
 */
function buildLabelExpression(key) {
  return t.memberExpression(
    t.identifier("appMessages"),
    t.memberExpression(
      t.memberExpression(t.identifier("AppMsg"), t.identifier("MESSAGES")),
      t.identifier(key)
    ),
    true
  );
}

/**
 * Check if component has appMessages prop in its parameters
 */
function componentHasAppMessagesProp(path) {
  // For functional components: ({ appMessages, ...otherProps }) => {}
  if (path.node.params && path.node.params.length > 0) {
    const param = path.node.params[0];
    if (param.type === "ObjectPattern") {
      return param.properties.some(
        (prop) =>
          (prop.key.name === "appMessages" || prop.key.name === "appMessages")
      );
    }
  }
  return false;
}

/**
 * Transforms a single file, replacing plain strings with appMessages references
 * labelMap: { "Building Name": "BUILDING_NAME", ... }
 * Returns: { replacements: [...], needsAppMessagesProp: bool, componentName: string }
 */
function transformFile(filePath, labelMap, dryRun = false) {
  const code = fs.readFileSync(filePath, "utf8");
  const replacements = [];
  let needsAppMessagesProp = false;
  let componentName = null;

  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });
  } catch (e) {
    console.warn(`⚠️  Could not parse ${filePath}: ${e.message}`);
    return { replacements, needsAppMessagesProp, componentName };
  }

  let modified = false;
  let foundReplacements = false;
  let hasAppMsgImport = false;

  traverse(ast, {
    // Check if AppMsg is already imported
    ImportDeclaration(path) {
      if (path.node.source.value.includes("AppMsg")) {
        hasAppMsgImport = true;
      }
    },

    // Find component name
    ExportDefaultDeclaration(path) {
      if (path.node.declaration.id) {
        componentName = path.node.declaration.id.name;
      } else if (path.node.declaration.name) {
        componentName = path.node.declaration.name;
      }
    },

    // Replace attribute value: label="Building Name" => label={appMessages[AppMsg.MESSAGES.BUILDING_NAME]}
    JSXAttribute(path) {
      const attrName = path.node.name.name;
      if (LABEL_PROPS.includes(attrName)) {
        const val = path.node.value;
        if (val?.type === "StringLiteral") {
          const trimmed = val.value.trim();
          const key = labelMap[trimmed];
          if (key) {
            path.node.value = t.jsxExpressionContainer(
              buildLabelExpression(key)
            );
            replacements.push({ label: trimmed, key, type: "attr" });
            foundReplacements = true;
            modified = true;
          }
        }
      }
    },

    // Replace JSX text: <p>Building Name</p> => {appMessages[AppMsg.MESSAGES.BUILDING_NAME]}
    JSXText(path) {
      const text = path.node.value.trim();
      const key = labelMap[text];
      if (key) {
        const parent = path.parent;
        const index = parent.children.indexOf(path.node);
        if (index !== -1) {
          parent.children[index] = t.jsxExpressionContainer(
            buildLabelExpression(key)
          );
          replacements.push({ label: text, key, type: "jsx" });
          foundReplacements = true;
          modified = true;
        }
      }
    },
  });

  // Check if component needs appMessages prop
  if (foundReplacements) {
    needsAppMessagesProp = true; // Component now needs appMessages prop
    
    // Add AppMsg import if not already present
    if (!hasAppMsgImport) {
      const appMsgImport = t.importDeclaration(
        [t.importSpecifier(t.identifier("AppMsg"), t.identifier("AppMsg"))],
        t.stringLiteral("../utils")
      );
      ast.program.body.unshift(appMsgImport);
      modified = true;
    }
    
    // Add appMessages to component's parameters
    traverse(ast, {
      ExportDefaultDeclaration(path) {
        const decl = path.node.declaration;
        
        // Handle: export default function Demo() { ... }
        if (decl.type === "FunctionDeclaration" || decl.type === "FunctionExpression") {
          if (!decl.params || decl.params.length === 0) {
            // No parameters, add object pattern with appMessages
            decl.params = [t.objectPattern([
              t.objectProperty(t.identifier("appMessages"), t.identifier("appMessages"), false, true)
            ])];
            modified = true;
          } else {
            const param = decl.params[0];
            if (param.type === "ObjectPattern") {
              const hasAppMessages = param.properties.some(
                (prop) => prop.key.name === "appMessages"
              );
              if (!hasAppMessages) {
                param.properties.unshift(
                  t.objectProperty(t.identifier("appMessages"), t.identifier("appMessages"), false, true)
                );
                modified = true;
              }
            }
          }
        }
      },
      ArrowFunctionExpression(path) {
        // Skip if already in an export or traversed
        if (path.parent.type === "ExportDefaultDeclaration") return;
        
        if (!path.node.params || path.node.params.length === 0) {
          path.node.params = [t.objectPattern([
            t.objectProperty(t.identifier("appMessages"), t.identifier("appMessages"), false, true)
          ])];
          modified = true;
        } else {
          const param = path.node.params[0];
          if (param.type === "ObjectPattern") {
            const hasAppMessages = param.properties.some(
              (prop) => prop.key.name === "appMessages"
            );
            if (!hasAppMessages) {
              param.properties.unshift(
                t.objectProperty(t.identifier("appMessages"), t.identifier("appMessages"), false, true)
              );
              modified = true;
            }
          }
        }
      }
    });
  }

  if (!dryRun && modified) {
    const { code: newCode } = generate(
      ast,
      { retainLines: true, jsescOption: { minimal: true } },
      code
    );
    fs.writeFileSync(filePath, newCode, "utf8");
  }

  return { replacements, needsAppMessagesProp, componentName };
}

export { transformFile };

/**
 * Wrap a component's default export with withTriDictionary(ComponentName)
 * Adds import for withTriDictionary from ../utils if missing
 */
function wrapComponentWithHOC(filePath, componentName, dryRun = false) {
  const code = fs.readFileSync(filePath, "utf8");
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });
  } catch (e) {
    console.warn(`⚠️  Could not parse ${filePath}: ${e.message}`);
    return false;
  }

  let modified = false;
  let hasWrapperImport = false;

  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value === "../utils") {
        // check for withTriDictionary specifier
        const hasSpec = path.node.specifiers.some(
          (s) => s.imported && s.imported.name === "withTriDictionary"
        );
        if (hasSpec) hasWrapperImport = true;
      }
    },

    ExportDefaultDeclaration(path) {
      const decl = path.node.declaration;
      // If export default is an identifier: export default ComponentName;
      if (decl.type === "Identifier" && decl.name === componentName) {
        path.node.declaration = t.callExpression(
          t.identifier("withTriDictionary"),
          [t.identifier(componentName)]
        );
        modified = true;
      } else if (decl.type === "FunctionDeclaration") {
        // Named function declaration: export default function Comp() {}
        const name = decl.id && decl.id.name;
        if (name === componentName) {
          // replace export default declaration with call expression
          path.node.declaration = t.callExpression(
            t.identifier("withTriDictionary"),
            [t.identifier(componentName)]
          );
          modified = true;
        }
      }
    },
  });

  if (!hasWrapperImport && modified) {
    const importDecl = t.importDeclaration(
      [t.importSpecifier(t.identifier("withTriDictionary"), t.identifier("withTriDictionary"))],
      t.stringLiteral("../utils")
    );
    ast.program.body.unshift(importDecl);
    modified = true;
  }

  if (!dryRun && modified) {
    const { code: newCode } = generate(ast, { retainLines: true, jsescOption: { minimal: true } }, code);
    fs.writeFileSync(filePath, newCode, "utf8");
    return true;
  }

  return modified;
}

export { wrapComponentWithHOC };
