import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { promisify } from 'node:util';
import { cruise, type IConfiguration, type ICruiseResult } from 'dependency-cruiser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

interface Edge {
  name: string;
  from: string;
  to: string;
  syntax?: 'type' | 'reexport';
  specifier?: string;
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
  {
    name: 'business importing the project catalog through an alias',
    from: 'src/documents/infra/project.ts',
    to: 'project.ts',
    specifier: '#project',
    forbidden: 'project-only-in-server-and-scripts',
  },
  {
    name: 'domain importing project types through a relative path',
    from: 'src/documents/domain/project.ts',
    to: 'project.ts',
    syntax: 'type',
    specifier: '../../../project.js',
    forbidden: 'project-only-in-server-and-scripts',
  },
  {
    name: 'web importing the project catalog as a type',
    from: 'src/web/project.ts',
    to: 'project.ts',
    syntax: 'type',
    specifier: '#project',
    forbidden: 'project-only-in-server-and-scripts',
  },
  {
    name: 'E2E importing the project catalog',
    from: 'e2e/project.ts',
    to: 'project.ts',
    specifier: '#project',
    forbidden: 'project-only-in-server-and-scripts',
  },
  { name: 'server using the project catalog', from: 'src/server/project.ts', to: 'project.ts', specifier: '#project' },
  { name: 'scripts using the project catalog', from: 'scripts/project.ts', to: 'project.ts', specifier: '#project' },
  {
    name: 'the project declaring a public application',
    from: 'project.ts',
    to: 'src/server/application.ts',
    specifier: '#server/application',
  },
  {
    name: 'an unexported deep alias',
    from: 'src/server/private-alias.ts',
    to: 'src/documents/infra/private.ts',
    specifier: '#documents/infra/private',
    forbidden: 'not-to-unresolvable',
  },
];

describe('module dependency policy', () => {
  let directory: string;
  let result: ICruiseResult;
  let configuration: IConfiguration;
  let configPath: string;
  let imports: Record<string, string>;
  const require = createRequire(import.meta.url);
  const projectSource =
    "export { value } from '#server/application'; export type { Model } from '#core/application';\n";
  const inspect = async (paths: string[]) => {
    const { output } = await cruise(paths, {
      ...configuration.options,
      baseDir: directory,
      validate: true,
      outputType: 'json',
      ruleSet: { forbidden: configuration.forbidden ?? [] },
    });
    return typeof output === 'string' ? (JSON.parse(output) as ICruiseResult) : output;
  };
  const loadConfiguration = () => {
    delete require.cache[configPath];
    return require(configPath) as IConfiguration;
  };

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
    imports = {
      ...Object.fromEntries(
        Object.entries(packages).flatMap(([name, entries]) =>
          Object.entries(entries).map(([entry, target]) => [
            `#${name}${entry === '.' ? '' : entry.slice(1)}`,
            `./src/${name}/${target.slice(2)}`,
          ]),
        ),
      ),
      '#server/application': './src/server/application.ts',
      '#project': './project.ts',
    };
    await write('package.json', JSON.stringify({ type: 'module', imports }));
    for (const target of Object.values(imports))
      await write(target, 'export const value = 1; export type Model = { id: string };\n');
    for (const target of new Set(edges.map((edge) => edge.to).filter((path) => !path.startsWith('node:')))) {
      await write(target, 'export const value = 1; export type Model = { id: string };\n');
    }
    for (const { from, to, syntax, specifier } of edges) {
      const alias = Object.entries(imports).find(([, target]) => target === `./${to}`)?.[0];
      const target =
        specifier ??
        (to.startsWith('node:') ? to : (alias ?? `./${relative(dirname(from), to).replace(/\.ts$/u, '.js')}`));
      const source =
        syntax === 'reexport'
          ? `export { value } from '${target}';\n`
          : syntax === 'type'
            ? `import type { Model } from '${target}'; export type Value = Model;\n`
            : `import * as dependency from '${target}'; export const value = dependency;\n`;
      await write(from, source);
    }
    await write('project.ts', projectSource);
    // The real root imports catalog drives both Node resolution and the policy.
    configPath = join(directory, '.dependency-cruiser.cjs');
    await copyFile(new URL('../.dependency-cruiser.cjs', import.meta.url), configPath);
    configuration = loadConfiguration();
    result = await inspect(['project.ts', 'src', 'scripts', 'e2e']);
    expect(
      result.summary.violations
        .filter((violation) => violation.rule.name === 'not-to-unresolvable')
        .map((violation) => violation.from),
    ).toEqual(['src/server/private-alias.ts']);
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

  it('resolves public aliases at runtime and refuses private aliases despite existing files', async () => {
    await write(
      'scripts/alias-runtime.mjs',
      `
      import { value } from '#documents/domain';
      import { value as projectValue } from '#project';
      if (value !== 1 || projectValue !== 1) throw new Error('Public alias resolved incorrectly.');
      try { await import('#documents/infra/private'); }
      catch (error) { if (error.code === 'ERR_PACKAGE_IMPORT_NOT_DEFINED') process.exit(0); throw error; }
      throw new Error('A private alias was exposed.');
    `,
    );
    await expect(
      promisify(execFile)(process.execPath, [join(directory, 'scripts/alias-runtime.mjs')], { cwd: directory }),
    ).resolves.toMatchObject({ stderr: '' });
  });

  it.each([
    ['core infrastructure', '#core/infra'],
    ['transaction participants', '#documents/composition'],
    ['relative private application files', './src/server/private.js'],
  ])('rejects the project importing %s', async (_name, specifier) => {
    await write('src/server/private.ts', 'export const value = 1;');
    await write('project.ts', `export { value } from '${specifier}';`);
    try {
      const inspected = await inspect(['project.ts']);
      expect(inspected.summary.violations.map((violation) => violation.rule.name)).toContain(
        'project-declares-applications-only',
      );
    } finally {
      await write('project.ts', projectSource);
    }
  });

  it('refuses a new source module without a declared public entry', async () => {
    await write('src/unregistered/domain/index.ts', 'export const value = 1;');
    try {
      expect(loadConfiguration).toThrow('Module unregistered has no public entry');
    } finally {
      await rm(join(directory, 'src/unregistered'), { recursive: true, force: true });
    }
  });

  it('refuses wildcard public entries', async () => {
    await write(
      'package.json',
      JSON.stringify({ type: 'module', imports: { ...imports, '#documents/*': './src/documents/*.ts' } }),
    );
    try {
      expect(loadConfiguration).toThrow('without wildcards');
    } finally {
      await write('package.json', JSON.stringify({ type: 'module', imports }));
    }
  });
});
