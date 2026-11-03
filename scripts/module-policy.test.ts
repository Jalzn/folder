import { copyFile, mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { cruise, type IConfiguration, type ICruiseResult } from 'dependency-cruiser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

interface Edge {
  name: string;
  from: string;
  to: string;
  syntax?: 'type' | 'reexport';
  forbidden?: string;
}

const edges: Edge[] = [
  {
    name: 'a business module importing another module type',
    from: 'src/documents/application/foreign-type.ts',
    to: 'src/drawings/domain/index.ts',
    syntax: 'type',
    forbidden: 'modules-do-not-know-each-other',
  },
  {
    name: 'a workspace barrel reexporting another module',
    from: 'src/workspace/index.ts',
    to: 'src/drawings/index.ts',
    syntax: 'reexport',
    forbidden: 'modules-do-not-know-each-other',
  },
  {
    name: 'application importing its own infrastructure',
    from: 'src/documents/application/sql.ts',
    to: 'src/documents/infra/private.ts',
    forbidden: 'application-stays-inside',
  },
  {
    name: 'a shared core deep import',
    from: 'src/documents/infra/core-private.ts',
    to: 'src/core/infra/private.ts',
    forbidden: 'core-through-public-entries',
  },
  {
    name: 'a shared rich-text deep import',
    from: 'src/documents/domain/text-private.ts',
    to: 'src/rich-text/domain/private.ts',
    forbidden: 'rich-text-through-public-entries',
  },
  {
    name: 'a browser type import of transaction composition',
    from: 'src/web/composition-type.ts',
    to: 'src/documents/infra/composition.ts',
    syntax: 'type',
    forbidden: 'documents-composition-only-in-server',
  },
  {
    name: 'a script importing transaction composition',
    from: 'scripts/composition.ts',
    to: 'src/documents/infra/composition.ts',
    forbidden: 'documents-composition-only-in-server',
  },
  {
    name: 'a browser runtime import of a module class',
    from: 'src/web/module-runtime.ts',
    to: 'src/documents/index.ts',
    forbidden: 'web-runtime-imports',
  },
  {
    name: 'a server deep import bypassing public entries',
    from: 'src/server/module-private.ts',
    to: 'src/documents/infra/private.ts',
    forbidden: 'compose-through-entry-points',
  },
  {
    name: 'rich-text reaching a business module',
    from: 'src/rich-text/domain/foreign.ts',
    to: 'src/documents/domain/index.ts',
    forbidden: 'rich-text-is-pure',
  },
  {
    name: 'rich-text reaching Node',
    from: 'src/rich-text/domain/node.ts',
    to: 'node:fs',
    forbidden: 'rich-text-is-pure',
  },
  {
    name: 'rich-text reaching core infrastructure',
    from: 'src/rich-text/domain/sql.ts',
    to: 'src/core/infra/index.ts',
    forbidden: 'rich-text-is-pure',
  },
  {
    name: 'a pure domain using the public rich-text entry',
    from: 'src/documents/domain/text.ts',
    to: 'src/rich-text/domain/index.ts',
  },
  {
    name: 'application using the public core application entry',
    from: 'src/documents/application/errors.ts',
    to: 'src/core/application/index.ts',
  },
  {
    name: 'infrastructure using the public core infrastructure entry',
    from: 'src/documents/infra/sql.ts',
    to: 'src/core/infra/index.ts',
  },
  {
    name: 'server binding transaction participants',
    from: 'src/server/workspace/compose.ts',
    to: 'src/documents/infra/composition.ts',
  },
  {
    name: 'a module using its own transaction binding',
    from: 'src/documents/infra/module.ts',
    to: 'src/documents/infra/composition.ts',
  },
  {
    name: 'a browser importing domain rules',
    from: 'src/web/domain.ts',
    to: 'src/documents/domain/index.ts',
  },
  {
    name: 'a browser importing only operation contract types',
    from: 'src/web/contracts.ts',
    to: 'src/documents/application/contracts/index.ts',
    syntax: 'type',
  },
  {
    name: 'a script using the server composition',
    from: 'scripts/seed.ts',
    to: 'src/server/workspace/compose.ts',
  },
];

describe('module dependency policy', () => {
  let directory: string;
  let result: ICruiseResult;

  const write = async (path: string, content: string) => {
    const target = join(directory, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  };

  beforeAll(async () => {
    directory = await realpath(await mkdtemp(join(tmpdir(), 'tinyfold-module-policy-')));
    const packages: Record<string, Record<string, string>> = {
      core: {
        './domain': './domain/index.ts',
        './application': './application/index.ts',
        './infra': './infra/index.ts',
      },
      'rich-text': { './domain': './domain/index.ts' },
      ...Object.fromEntries(
        ['documents', 'drawings', 'workspace'].map((name) => [
          name,
          {
            '.': './index.ts',
            './domain': './domain/index.ts',
            './contracts': './application/contracts/index.ts',
            './composition': './infra/composition.ts',
          },
        ]),
      ),
    };
    for (const [name, exports] of Object.entries(packages)) {
      await write(`src/${name}/package.json`, JSON.stringify({ name: `@tinyfold/${name}`, type: 'module', exports }));
    }
    for (const target of new Set(edges.map((edge) => edge.to).filter((path) => !path.startsWith('node:')))) {
      await write(target, 'export const value = 1; export type Model = { id: string };\n');
    }
    for (const { from, to, syntax } of edges) {
      const target = to.startsWith('node:') ? to : `./${relative(dirname(from), to).replace(/\.ts$/u, '.js')}`;
      const source =
        syntax === 'reexport'
          ? `export { value } from '${target}';\n`
          : syntax === 'type'
            ? `import type { Model } from '${target}'; export type Value = Model;\n`
            : `import * as dependency from '${target}'; export const value = dependency;\n`;
      await write(from, source);
    }
    // Execute the real configuration against an isolated package tree, including its export discovery.
    const configPath = join(directory, '.dependency-cruiser.cjs');
    await copyFile(new URL('../.dependency-cruiser.cjs', import.meta.url), configPath);
    const configuration = createRequire(import.meta.url)(configPath) as IConfiguration;
    const { output } = await cruise(['src', 'scripts'], {
      ...configuration.options,
      baseDir: directory,
      validate: true,
      outputType: 'json',
      ruleSet: { forbidden: configuration.forbidden ?? [] },
    });
    result = typeof output === 'string' ? (JSON.parse(output) as ICruiseResult) : output;
    expect(result.summary.violations.filter((violation) => violation.rule.name === 'not-to-unresolvable')).toEqual([]);
  }, 20_000);

  afterAll(async () => {
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  for (const edge of edges) {
    it(`${edge.forbidden ? 'rejects' : 'allows'} ${edge.name}`, () => {
      const violations = result.summary.violations
        .filter((violation) => violation.from === edge.from)
        .map((violation) => violation.rule.name);
      if (edge.forbidden) expect(violations).toContain(edge.forbidden);
      else expect(violations).toEqual([]);
    });
  }
});
