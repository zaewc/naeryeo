// Architecture rules for Feature-Sliced Design (see docs/architecture.md).
// Run with `npm run lint:arch`; any `error` fails CI.

/** Ordered top → bottom. A layer may only import layers that come after it. */
const LAYERS = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];
const SLICED_LAYERS = ['pages', 'widgets', 'features', 'entities'];
const SLICED = SLICED_LAYERS.join('|');

const layerRules = LAYERS.slice(1).map((layer, index) => {
  const above = LAYERS.slice(0, index + 1);
  return {
    name: `fsd-layer-${layer}`,
    comment: `"${layer}" must not import from higher layers (${above.join(', ')}).`,
    severity: 'error',
    from: { path: `^src/${layer}/` },
    to: { path: `^src/(${above.join('|')})/` },
  };
});

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    ...layerRules,
    {
      name: 'fsd-no-cross-slice',
      comment:
        'Slices on the same layer are isolated (features/a must not import features/b). ' +
        'Compose them in a higher layer instead.',
      severity: 'error',
      from: { path: `^src/(${SLICED})/([^/]+)/` },
      to: { path: '^src/$1/', pathNot: '^src/$1/$2/' },
    },
    {
      name: 'fsd-public-api',
      comment:
        "Import another slice through its public API (index.ts), never its internals.",
      severity: 'error',
      from: { path: `^src/(${SLICED})/([^/]+)/` },
      to: {
        path: `^src/(${SLICED})/[^/]+/`,
        pathNot: [`^src/$1/$2/`, `^src/(${SLICED})/[^/]+/index\\.tsx?$`],
      },
    },
    {
      name: 'fsd-public-api-from-app',
      comment: 'The app layer imports slices through their public API (index.ts) only.',
      severity: 'error',
      from: { path: '^src/app/' },
      to: {
        path: `^src/(${SLICED})/[^/]+/`,
        pathNot: `^src/(${SLICED})/[^/]+/index\\.tsx?$`,
      },
    },
    {
      name: 'fsd-shared-public-api',
      comment:
        'Outside of shared, import a shared segment through its index.ts ' +
        '(e.g. @/shared/platform/live-activity), not its internal files.',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/shared/' },
      to: {
        path: '^src/shared/',
        pathNot: '^src/shared/[^/]+/(index\\.tsx?|[^/]+/index\\.tsx?)$',
      },
    },
    {
      name: 'native-modules-only-via-platform',
      comment:
        'Local native modules (modules/*) are an implementation detail of the platform ' +
        'adapters in src/shared/platform. Everything else depends on the port.',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/shared/platform/' },
      to: { path: '^modules/' },
    },
    {
      name: 'no-circular',
      comment: 'Circular dependencies are forbidden.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'not-to-unresolvable',
      comment: 'Every import must resolve to a file or an installed package.',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'not-to-dev-dep',
      comment: 'Production code must not depend on devDependencies.',
      severity: 'error',
      from: {
        path: '^(src|modules)/',
        pathNot: ['\\.test\\.tsx?$', '/__tests__/', '/__mocks__/'],
      },
      to: { dependencyTypes: ['npm-dev'] },
    },
  ],
  options: {
    doNotFollow: { path: ['node_modules'] },
    exclude: { path: ['^android/', '^ios/', '^\\.expo/', '^coverage/'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['react-native', 'import', 'require', 'default', 'types'],
      mainFields: ['react-native', 'module', 'main', 'types', 'typings'],
      extensions: [
        '.android.ts',
        '.android.tsx',
        '.native.ts',
        '.native.tsx',
        '.ts',
        '.tsx',
        '.d.ts',
        '.js',
        '.json',
      ],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
