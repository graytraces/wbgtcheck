import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    /**
     * The .js/.mjs half of the codebase was unchecked entirely: policyData.js
     * and airPolicyData.js are the single source for every published
     * threshold, stateDirectory.js and guideRegistry.js drive both renderers,
     * and prerender.mjs plus scripts/checks/*.mjs are the build and the
     * gates. An unused variable and a call to an undefined function both
     * passed the budget from guideRegistry.js.
     *
     * Browser globals for the shared data modules (they are imported by React
     * too), Node globals for the scripts.
     */
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // A mock's parameters can be load-bearing for typing while never being
      // read: the fetch stubs here exist to fix the call signature so
      // `mock.calls[0][1]` types, and deleting them turns the tuple into `[]`.
      // Underscore-prefixed is the documented way to say "declared on purpose".
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
])
