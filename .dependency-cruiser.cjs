// Dependency rules from docs/arquitetura.md ("Regras de dependência").
// A module is any folder in src/ except server and web.

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-is-pure',
      comment: 'domain/ only imports its own domain and @tinyfold/core/domain: no database, HTTP, React or Node APIs.',
      severity: 'error',
      from: { path: '^src/([^/]+)/domain/', pathNot: '\\.test\\.tsx?$' },
      to: { pathNot: ['^src/$1/domain/', '^src/core/domain/'] },
    },
    {
      name: 'application-stays-inside',
      comment:
        'application/ imports its domain, @tinyfold/core application/domain and Zod; never infra, Kysely or oRPC.',
      severity: 'error',
      from: { path: '^src/([^/]+)/application/', pathNot: '\\.test\\.tsx?$' },
      to: {
        pathNot: ['^src/$1/(application|domain)/', '^src/core/(application|domain)/', 'node_modules/zod/'],
      },
    },
    {
      name: 'modules-do-not-know-each-other',
      comment: 'A module never imports another module; only server composes them. Every module may use core.',
      severity: 'error',
      from: { path: '^src/([^/]+)/', pathNot: '^src/(server|web)/' },
      to: { path: '^src/', pathNot: ['^src/$1/', '^src/core/'] },
    },
    {
      name: 'web-runtime-imports',
      comment: 'At runtime the browser only gets web code and pure domain code; server and module APIs are type-only.',
      severity: 'error',
      from: { path: '^src/web/' },
      to: {
        path: '^src/',
        pathNot: ['^src/web/', '^src/[^/]+/domain/'],
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    // npm packages stay in the graph (so rules see them) but are not traversed.
    doNotFollow: { path: 'node_modules' },
    // Build output is not source.
    exclude: { path: '(^|/)dist/' },
    // swc parses the TypeScript source directly and already marks `import type` as type-only.
    // tsPreCompilationDeps would demand the tsc API, which TypeScript 7 does not publish yet.
    parser: 'swc',
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'types', 'node', 'default'],
      extensions: ['.ts', '.tsx', '.js'],
    },
  },
};
