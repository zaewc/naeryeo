// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const NATIVE_ACCESS_MESSAGE =
  'Native modules are only reachable through a port in src/shared/platform. Depend on the port instead.';

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*', 'coverage/*', '**/.wrangler/**'],
  },
  {
    files: ['server/worker.mjs'],
    rules: { 'import/no-unresolved': ['error', { ignore: ['^cloudflare:workers$'] }] },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-expect-error': true,
          'ts-nocheck': true,
          'ts-check': false,
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "TSAsExpression[expression.type='TSAsExpression'][expression.typeAnnotation.type='TSUnknownKeyword']",
          message: '`as unknown as` bypasses the type system. Validate or narrow the value instead.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: ['src/shared/platform/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['NativeModules', 'TurboModuleRegistry', 'NativeEventEmitter'],
              message: NATIVE_ACCESS_MESSAGE,
            },
            {
              name: 'expo',
              importNames: ['requireNativeModule', 'requireOptionalNativeModule'],
              message: NATIVE_ACCESS_MESSAGE,
            },
            { name: 'expo-modules-core', message: NATIVE_ACCESS_MESSAGE },
          ],
        },
      ],
    },
  },
]);
