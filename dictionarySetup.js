// src/core/dictionarySetup.js
// Handles setup of DictionaryProvider and related configurations

import fs from "fs-extra";
import path from "path";
import _parser from "@babel/parser";
import _traverse from "@babel/traverse";
import _generate from "@babel/generator";
import _t from "@babel/types";

const parser = _parser.default || _parser;
const traverse = _traverse.default || _traverse;
const generate = _generate.default || _generate;
const t = _t.default || _t;

const DICTIONARY_PROVIDER_CONTENT = `// src/utils/providers/DictionaryProvider.js
// Context Provider for appMessages
// 
// Usage:
// 1. Wrap root component with DictionaryProvider:
//    <DictionaryProvider appMessages={appMessages}>
//      <App />
//    </DictionaryProvider>
//
// 2. Use withDictionary HOC to inject appMessages as prop:
//    export default withDictionary(MyComponent);
//
// 3. In component, access appMessages from props:
//    const MyComponent = ({ appMessages, ...otherProps }) => {
//      return <div>{appMessages[AppMsg.MESSAGES.LABEL]}</div>
//    }

import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

// Create context
const DictionaryContext = createContext(null);

/**
 * Provider component that wraps the app with appMessages
 * Place this at the root level of your app
 */
export const DictionaryProvider = ({ appMessages, children }) => {
  return (
    <DictionaryContext.Provider value={appMessages}>
      {children}
    </DictionaryContext.Provider>
  );
};

DictionaryProvider.propTypes = {
  appMessages: PropTypes.object.isRequired,
  children: PropTypes.node.isRequired,
};

/**
 * Hook to use appMessages in functional components
 * Usage: const appMessages = useDictionary();
 */
export const useDictionary = () => {
  const appMessages = useContext(DictionaryContext);
  if (!appMessages) {
    console.warn(
      'useDictionary must be used within <DictionaryProvider>. ' +
        'Make sure your root component is wrapped with DictionaryProvider.'
    );
  }
  return appMessages;
};

/**
 * HOC to inject appMessages as a prop to a component
 * Usage: export default withDictionary(MyComponent);
 *
 * In your component:
 * const MyComponent = ({ appMessages, ...otherProps }) => { ... }
 */
export const withDictionary = (Component) => {
  const WrappedComponent = (props) => {
    const appMessages = useDictionary();
    return <Component {...props} appMessages={appMessages} />;
  };

  WrappedComponent.displayName = \`withDictionary(\${
    Component.displayName || Component.name || 'Component'
  })\`;

  return WrappedComponent;
};

export default DictionaryProvider;
`;

/**
 * Creates DictionaryProvider.js if it doesn't exist
 */
function createDictionaryProvider(dryRun = false) {
  const providerPath = path.resolve(process.cwd(), "src/utils/providers/DictionaryProvider.js");
  
  if (fs.existsSync(providerPath)) {
    return false; // Already exists
  }

  if (!dryRun) {
    fs.ensureDirSync(path.dirname(providerPath));
    fs.writeFileSync(providerPath, DICTIONARY_PROVIDER_CONTENT, "utf8");
  }

  return true;
}

/**
 * Updates main.jsx to wrap TririgaUXWebApp with DictionaryProvider
 */
function updateMainJsx(dryRun = false) {
  const mainPath = path.resolve(process.cwd(), "src/main.jsx");
  
  if (!fs.existsSync(mainPath)) {
    return false;
  }

  let content = fs.readFileSync(mainPath, "utf8");

  // Check if DictionaryProvider is already imported
  if (content.includes("DictionaryProvider")) {
    return false; // Already updated
  }

  // Add import statement
  const importRegex = /^(import\s+.+from\s+['"].+['"];)/m;
  const importMatch = content.match(importRegex);
  
  if (importMatch) {
    const insertPos = content.indexOf('\n', importMatch.index) + 1;
    const newImport = 'import { DictionaryProvider } from "./utils/providers/DictionaryProvider";\n';
    content = content.slice(0, insertPos) + newImport + content.slice(insertPos);
  }

  // Find and wrap the TririgaUXWebApp rendering
  // Pattern: <BrowserRouter ...>  <TririgaUXWebApp /> </BrowserRouter>
  const wrapperRegex = /(<BrowserRouter\s+basename={appConfig\.appPath}>\s*<TririgaUXWebApp\s*\/>\s*<\/BrowserRouter>)/;
  
  if (wrapperRegex.test(content)) {
    content = content.replace(
      wrapperRegex,
      `<DictionaryProvider appMessages={AppMsg.getAppMessages()}>
        <BrowserRouter basename={appConfig.appPath}>
          <TririgaUXWebApp />
        </BrowserRouter>
      </DictionaryProvider>`
    );
  }

  if (!dryRun) {
    fs.writeFileSync(mainPath, content, "utf8");
  }

  return true;
}

/**
 * Wraps a component with withDictionary HOC
 */
function wrapComponentWithDictionary(filePath, dryRun = false) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const code = fs.readFileSync(filePath, "utf8");

  // Check if already wrapped
  if (code.includes("withDictionary(") || code.includes("export default withDictionary")) {
    return false;
  }

  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });
  } catch (e) {
    return false;
  }

  let modified = false;
  let hasWithDictionaryImport = false;
  let componentName = null;

  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value.includes("DictionaryProvider")) {
        hasWithDictionaryImport = true;
      }
    },

    ExportDefaultDeclaration(path) {
      const decl = path.node.declaration;
      
      // Get component name
      if (decl.name) {
        componentName = decl.name;
      } else if (decl.id?.name) {
        componentName = decl.id.name;
      } else if (decl.callee?.name) {
        componentName = decl.callee.name;
      }

      // Only wrap if not already wrapped and component is exported directly
      if (
        componentName &&
        decl.type !== "CallExpression" &&
        !code.includes("withDictionary(")
      ) {
        // Wrap the component
        path.node.declaration = t.callExpression(
          t.identifier("withDictionary"),
          [t.identifier(componentName)]
        );
        modified = true;
      }
    },
  });

  if (modified) {
    // Calculate relative path from component to DictionaryProvider
    // Components are typically in src/pages or src/components
    // DictionaryProvider is at src/utils/providers/DictionaryProvider
    const relPath = "../../utils/providers/DictionaryProvider";

    // Add import if not present
    if (!hasWithDictionaryImport) {
      const withDictionaryImport = t.importDeclaration(
        [t.importSpecifier(t.identifier("withDictionary"), t.identifier("withDictionary"))],
        t.stringLiteral(relPath)
      );
      ast.program.body.unshift(withDictionaryImport);
    }

    const newCode = generate(ast).code;

    if (!dryRun) {
      fs.writeFileSync(filePath, newCode, "utf8");
    }

    return true;
  }

  return false;
}

export {
  createDictionaryProvider,
  updateMainJsx,
  wrapComponentWithDictionary,
};
