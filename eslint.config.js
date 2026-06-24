// ESLint flat config — compatible with ESLint v10+
// Converts the previous .eslintrc.json rules to flat config format.

const js = require('@eslint/js');

module.exports = [
  // Inherit "eslint:recommended"
  js.configs.recommended,

  // Language options and globals
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        // Node.js
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'writable',
        Buffer: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        global: 'readonly',
        // Jest
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        // Web-like globals commonly available
        URL: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
  },

  // Project-specific rules
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-implicit-coercion': 'error',
      'prefer-const': 'error',
    },
  },

  // Ignore patterns
  {
    ignores: ['dist/', 'coverage/', 'node_modules/'],
  },
];
