// Dependency rules from docs/arquitetura.md ("Regras de dependência").
// A module is any folder in src/ except server and web.
// `pnpm deps` cruises src, scripts and e2e.

const { existsSync, readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

/** The files each module's package.json exports, as path patterns: the only way into a module. */
const moduleEntryPoints = readdirSync(join(__dirname, 'src'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !['server', 'web'].includes(entry.name))
  .filter((entry) => existsSync(join(__dirname, 'src', entry.name, 'package.json')))
  .flatMap((entry) => {
    const { exports = {} } = JSON.parse(readFileSync(join(__dirname, 'src', entry.name, 'package.json'), 'utf8'));
    return Object.values(exports)
      .filter((target) => typeof target === 'string')
      .map((target) => `^src/${entry.name}/${target.replace(/^\.\//u, '').replaceAll('.', '\\.')}$`);
  });

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
      from: { path: '^src/web/', pathNot: '\\.test\\.tsx?$' },
      to: {
        path: '^src/',
        pathNot: ['^src/web/', '^src/[^/]+/domain/'],
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'compose-through-entry-points',
      comment: 'server and web reach a module only through its package entry points, never through its internals.',
      severity: 'error',
      from: { path: '^src/(server|web)/', pathNot: '\\.test\\.tsx?$' },
      to: { path: '^src/[^/]+/', pathNot: ['^src/(server|web)/', ...moduleEntryPoints] },
    },
    {
      name: 'mcp-sdk-stays-in-server-mcp',
      comment: 'Only src/server/mcp/ adapts tools to the MCP SDK, so replacing the SDK touches only that folder.',
      severity: 'error',
      from: { path: '^src/', pathNot: ['^src/server/mcp/', '\\.test\\.tsx?$'] },
      to: { path: '@modelcontextprotocol/' },
    },
    {
      name: 'testing-helpers-stay-in-tests',
      comment: 'testing/ folders hold test helpers that use vitest and fixtures: runtime code never imports them.',
      severity: 'error',
      from: { path: '^(src|scripts)/', pathNot: ['\\.test\\.tsx?$', '^src/[^/]+/testing/'] },
      to: { path: '^src/[^/]+/testing/' },
    },
    {
      name: 'scripts-through-entry-points',
      comment:
        'Runtime scripts reuse the server composition, but reach a module only through its package entry points and never import web code.',
      severity: 'error',
      from: { path: '^scripts/', pathNot: '\\.test\\.tsx?$' },
      to: { path: '^src/', pathNot: ['^src/server/', ...moduleEntryPoints] },
    },
    {
      name: 'e2e-type-only',
      comment: 'Browser tests drive the app from outside: from src they import types only, never code.',
      severity: 'error',
      from: { path: '^e2e/' },
      to: { path: '^src/', dependencyTypesNot: ['type-only'] },
    },
    {
      name: 'web-ui-knows-no-app',
      comment:
        "web/ui holds the app's primitives: it never imports the shell, components, pages, the editor or the router.",
      severity: 'error',
      from: { path: '^src/web/ui/' },
      to: { path: '^src/web/(shell|components|pages|editor|router)/' },
    },
    {
      name: 'web-nothing-imports-pages',
      comment: 'Pages sit on top of the web: only the router mounts them, and other pages may reuse them.',
      severity: 'error',
      from: { path: '^src/web/', pathNot: '^src/web/(pages|router)/' },
      to: { path: '^src/web/pages/' },
    },
    {
      name: 'web-lib-is-a-leaf',
      comment:
        'web/lib holds helpers and hooks below the interface: it imports no other web layer. The write hooks that need the toast live in shell/writes.',
      severity: 'error',
      from: { path: '^src/web/lib/' },
      to: { path: '^src/web/(ui|shell|components|pages|editor|router)/' },
    },
    {
      name: 'workspace-read-models-share-sql-only',
      comment: 'Repository, agent and navigation adapters share only infra/sql helpers.',
      severity: 'error',
      from: { path: '^src/workspace/infra/(repository|reader|navigation)/' },
      to: { path: '^src/workspace/infra/(repository|reader|navigation)/', pathNot: '^src/workspace/infra/$1/' },
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
    // Build output is not source. Packages' own dist/ folders stay visible to the rules.
    exclude: { path: '^src/[^/]+/dist/' },
    // swc parses the TypeScript source directly and already marks `import type` as type-only.
    // tsPreCompilationDeps would demand the tsc API, which TypeScript 7 does not publish yet.
    parser: 'swc',
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'types', 'node', 'production', 'default'],
      extensions: ['.ts', '.tsx', '.js'],
    },
  },
};
