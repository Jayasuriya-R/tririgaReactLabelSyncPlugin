<<<<<<< HEAD
// src/utils/providers/DictionaryProvider.js
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

  WrappedComponent.displayName = `withDictionary(${
    Component.displayName || Component.name || 'Component'
  })`;

  return WrappedComponent;
};

export default DictionaryProvider;
=======
// src/utils/providers/DictionaryProvider.js
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

  WrappedComponent.displayName = `withDictionary(${
    Component.displayName || Component.name || 'Component'
  })`;

  return WrappedComponent;
};

export default DictionaryProvider;
>>>>>>> 56475fd (inital commit)
