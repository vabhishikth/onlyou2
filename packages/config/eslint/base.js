import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import importPlugin from 'eslint-plugin-import-x'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const noHardcodedHex = require('./no-hardcoded-hex')

export default [
  {
    plugins: {
      onlyou: {
        rules: {
          'no-hardcoded-hex': noHardcodedHex,
        },
      },
    },
    rules: {
      'onlyou/no-hardcoded-hex': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 10,
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**', '**/.expo/**', '**/.turbo/**', '**/_generated/**'],
  },
]
