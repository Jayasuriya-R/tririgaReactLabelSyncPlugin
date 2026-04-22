// src/core/routeDetector.js
// Detects if a file contains route definitions and helps identify route components

import _parser from "@babel/parser";
import _traverse from "@babel/traverse";
import fs from "fs-extra";

const parser = _parser.default || _parser;
const traverse = _traverse.default || _traverse;

/**
 * Check if a file contains React Router routes
 * Returns: { hasRoutes: bool, routeComponents: [{ name, path }] }
 */
function detectRoutes(filePath) {
  try {
    const code = fs.readFileSync(filePath, "utf8");
    let hasRoutes = false;
    const routeComponents = [];

    const ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });

    traverse(ast, {
      // Look for createBrowserRouter or useRoutes patterns
      CallExpression(path) {
        const callee = path.node.callee;
        
        // Check for createBrowserRouter([...])
        if (
          callee.name === "createBrowserRouter" ||
          (callee.type === "MemberExpression" && callee.property?.name === "createBrowserRouter")
        ) {
          hasRoutes = true;
          // Extract route components from the array
          const arrayArg = path.node.arguments[0];
          if (arrayArg?.type === "ArrayExpression") {
            arrayArg.elements.forEach((element) => {
              if (element?.type === "ObjectExpression") {
                let componentName = null;
                let routePath = null;
                
                element.properties.forEach((prop) => {
                  if (prop.key.name === "element") {
                    // Get component name from JSX
                    if (prop.value?.openingElement?.name?.name) {
                      componentName = prop.value.openingElement.name.name;
                    }
                  }
                  if (prop.key.name === "path") {
                    if (prop.value?.value) {
                      routePath = prop.value.value;
                    }
                  }
                });
                
                if (componentName) {
                  routeComponents.push({ name: componentName, path: routePath });
                }
              }
            });
          }
        }
      },
      
      // Look for useRoutes pattern
      JSXElement(path) {
        if (path.node.openingElement.name.name === "Routes") {
          hasRoutes = true;
        }
      }
    });

    return { hasRoutes, routeComponents };
  } catch (e) {
    return { hasRoutes: false, routeComponents: [] };
  }
}

export { detectRoutes };
