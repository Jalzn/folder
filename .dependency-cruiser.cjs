// Dependency rules from docs/arquitetura.md.
// Public entries come only from the root package imports; src directories define module coverage.
// `pnpm deps` includes project.ts, src, scripts and e2e.

const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const { imports = {} } = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
for (const [alias, target] of Object.entries(imports)) {
  if (
    !alias.startsWith('#') ||
    alias.includes('*') ||
    typeof target !== 'string' ||
    target.includes('*') ||
    !target.startsWith('./') ||
    target.split('/').includes('..')
  )
    throw new Error(`Public import ${alias} must have one exact local target, without wildcards.`);
}
if (imports['#project'] !== './project.ts') throw new Error('The #project entry must point to ./project.ts.');

const pathPattern = (target) => `^${RegExp.escape(target.replace(/^\.\//u, ''))}$`;
const publicEntries = Object.entries(imports);
const moduleEntries = readdirSync(join(__dirname, 'src'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !['server', 'web'].includes(entry.name))
  .map(({ name }) => {
    const entries = publicEntries.filter(
      ([alias, target]) =>
        (alias === `#${name}` || alias.startsWith(`#${name}/`)) && target.startsWith(`./src/${name}/`),
    );
    if (!entries.length) throw new Error(`Module ${name} has no public entry in root package.json imports.`);
    return { name, entries };
  });

const moduleEntryPoints = moduleEntries.flatMap(({ entries }) => entries.map(([, target]) => pathPattern(target)));
const sourceConsumers = '^(?:(?:src|scripts|e2e)/|project\\.ts$)';

const sharedEntryRules = moduleEntries
  .filter(({ name }) => ['core', 'rich-text'].includes(name))
  .map(({ name, entries }) => ({
    name: `${name}-through-public-entries`,
    severity: 'error',
    comment: `Other modules and tests reach ${name} only through its explicit public entries.`,
    from: { path: sourceConsumers, pathNot: `^src/${name}/` },
    to: { path: `^src/${name}/`, pathNot: entries.map(([, target]) => pathPattern(target)) },
  }));

const compositionEntryRules = moduleEntries.flatMap(({ name, entries }) => {
  const entry = entries.find(([alias]) => alias === `#${name}/composition`);
  return entry
    ? [
        {
          name: `${name}-composition-only-in-server`,
          severity: 'error',
          comment: 'Transaction participants are wired by server; clients and scripts use ordinary module APIs.',
          from: { path: sourceConsumers, pathNot: [`^src/${name}/`, '^src/server/'] },
          to: { path: pathPattern(entry[1]) },
        },
      ]
    : [];
});

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    ...sharedEntryRules,
    ...compositionEntryRules,
    {
      name: 'project-only-in-server-and-scripts',
      severity: 'error',
      comment: 'The project catalog is composition; business modules, web and E2E cannot import it, even as a type.',
      from: { pathNot: ['^src/server/', '^scripts/'] },
      to: { path: '^project\\.ts$' },
    },
    {
      name: 'project-declares-applications-only',
      severity: 'error',
      comment: 'The root project declares applications through public application entries, without infrastructure.',
      from: { path: '^project\\.ts$' },
      to: {
        pathNot: publicEntries
          .filter(([alias]) => alias.endsWith('/application'))
          .map(([, target]) => pathPattern(target)),
      },
    },
    {
      name: 'domain-is-pure',
      comment: 'domain/ uses its own domain and public core/rich-text domain entries: no infrastructure or Node APIs.',
      severity: 'error',
      from: { path: '^src/([^/]+)/domain/', pathNot: '\\.test\\.tsx?$' },
      to: { pathNot: ['^src/$1/domain/', '^src/core/domain/', '^src/rich-text/domain/index\\.ts$'] },
    },
    {
      name: 'application-stays-inside',
      comment: 'application/ uses its domain, public core/rich-text entries and Zod; never infra, Kysely or oRPC.',
      severity: 'error',
      from: { path: '^src/([^/]+)/application/', pathNot: '\\.test\\.tsx?$' },
      to: {
        pathNot: [
          '^src/$1/(application|domain)/',
          '^src/core/(application|domain)/',
          '^src/rich-text/domain/index\\.ts$',
          'node_modules/zod/',
        ],
      },
    },
    {
      name: 'modules-do-not-know-each-other',
      comment: 'Business modules never import each other, including types; server composes them through ports.',
      severity: 'error',
      from: { path: '^src/([^/]+)/', pathNot: '^src/(server|web)/' },
      to: { path: '^src/', pathNot: ['^src/$1/', '^src/core/', '^src/rich-text/domain/index\\.ts$'] },
    },
    {
      name: 'rich-text-is-pure',
      severity: 'error',
      comment:
        'Shared text code contains only pure domain rules and never reaches a business module or infrastructure.',
      from: { path: '^src/rich-text/', pathNot: ['\\.test\\.tsx?$', '^src/rich-text/testing/'] },
      to: { pathNot: ['^src/rich-text/domain/', '^src/core/domain/index\\.ts$'] },
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
      from: { path: '^(src|scripts)/', pathNot: ['\\.test\\.tsx?$', '^src/[^/]+/testing/', '^scripts/testing/'] },
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
      to: { path: '^src/web/(shell|components|pages|editor|router|navigation)/' },
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
      to: { path: '^src/web/(ui|shell|components|pages|editor|router|navigation)/' },
    },
    {
      name: 'web-shell-through-public-entries',
      comment: 'Other web layers use explicit shell entry points.',
      severity: 'error',
      from: { path: '^src/web/', pathNot: ['^src/web/shell/', '\\.test\\.tsx?$'] },
      to: { path: '^src/web/shell/', pathNot: '^src/web/shell/(index|[^/]+/index)\\.tsx?$' },
    },
    {
      name: 'web-router-only-mounts-routes',
      comment: 'Navigation helpers live below route composition; no web layer imports the mounted router.',
      severity: 'error',
      from: { path: '^src/web/(pages|components|shell|editor|navigation)/' },
      to: { path: '^src/web/router/' },
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
