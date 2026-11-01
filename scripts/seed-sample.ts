/**
 * Fills a temporary database with the sample data of docs/interface/brief.md, filed in the folders of
 * docs/interface/pastas.md §5, for visual checks and screenshots, never for production. The board has
 * the brief's columns, labels, due dates and the prototype's descriptions, and the brief's items
 * without a project live in Geral, as migration 005 left them. Due dates and completions count from
 * the day the seed runs, in UTC, as the brief's count from October 30th. The scenes are built here,
 * since the test helpers of the testing/ folders stay out of runtime code.
 *
 *   DATABASE_PATH=/tmp/tinyfold-10/tinyfold.sqlite pnpm seed:sample
 *   DATABASE_PATH=/tmp/tinyfold-10/grande.sqlite pnpm seed:sample --grande
 *
 * `--grande` takes Tinyfold to 55 items in four folders, like the prototype's "Simular projeto grande":
 * Produto 11, MCP 12, Arquitetura 18, Operação 8 and 5 loose at the root, besides the pinned vision.
 * It also adds 60 tasks completed 15 to 120 days before, for the done column's footer and the pages of
 * Concluídas.
 *
 * Writes only inside the system's temporary folders, to a new file or an empty database: before
 * migrating anything, it refuses any other target (see assertSeedTarget), the main database
 * (data/tinyfold.sqlite) and the production one (/data/tinyfold.sqlite) included.
 */
import { randomUUID } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { addDays, todayIn } from '../src/core/domain/index.js';
import { createDatabase, type Database, migrate } from '../src/core/infra/index.js';
import { readConfig } from '../src/server/config.js';
import { modules } from '../src/server/modules.js';
import type { CanvasScene, DocumentBlock, JsonValue, LabelColor } from '../src/workspace/domain/index.js';
import { createWorkspaceService, type WorkspaceService } from '../src/workspace/index.js';
import { flow } from './sample-scenes.js';
import { assertSeedTarget, temporaryRoots } from './seed-target.js';

const request = () => ({ requestId: randomUUID() });

const text = (value: string): JsonValue => [{ type: 'text', text: value, styles: {} }];
/**
 * A block as BlockNote saves it: an id of its own, default props and children included, so opening
 * it changes nothing. Without an id, the editor would make one up each time it opens the document,
 * and a task from a selection in a document nobody has edited yet would point at a block the server
 * does not have.
 */
const block = (type: string, value: string, props: Record<string, JsonValue> = {}): DocumentBlock & { id: string } => ({
  id: randomUUID(),
  type,
  props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left', ...props },
  content: text(value),
  children: [],
});
const paragraph = (value: string) => block('paragraph', value);
const heading = (value: string, level = 2) => block('heading', value, { level });
const bullet = (value: string) => block('bulletListItem', value);
const check = (value: string, checked = false) => block('checkListItem', value, { checked });
const line = paragraph;
const item = check;
/** An embed as the document editor saves it: only the item's ID, no text, no blocks inside. */
const taskEmbed = (taskId: string): DocumentBlock => ({
  id: randomUUID(),
  type: 'taskEmbed',
  props: { taskId },
  children: [],
});
const drawingEmbed = (canvasId: string): DocumentBlock => ({
  id: randomUUID(),
  type: 'drawingEmbed',
  props: { canvasId },
  children: [],
});

/** The paragraph of "MCP somente leitura" that "Gerar token pessoal no Perfil" was created from. */
const TOKEN_BLOCK = paragraph(
  'Gerar token pessoal no Perfil, mostrado uma única vez, com o comando pronto para copiar.',
);
export const TOKEN_EXCERPT = 'Gerar token pessoal no Perfil';

/** The documents of the sample, by title, as the editor saves them, but for the embeds of the vision. */
export const SAMPLE_DOCUMENTS = {
  'Ideias soltas': [
    paragraph('Anotar aqui o que ainda não tem projeto.'),
    bullet('Um diário de leituras com trechos favoritos.'),
    bullet('Organizar as fotos da viagem por cidade.'),
  ],
  'Orçamento e fornecedores': [
    heading('Orçamento'),
    paragraph('Teto de R$ 8.000 para marcenaria, pintura e iluminação.'),
    heading('Fornecedores'),
    bullet('Marcenaria Silva: armário e prateleiras sob medida.'),
    bullet('Loja de iluminação do centro: luminária de mesa e pendente.'),
  ],
  'Lista de compras': [
    check('Tinta acrílica fosca, 18 litros', true),
    check('Fita crepe e lona'),
    check('Luminária de mesa'),
  ],
  'MCP somente leitura': [
    paragraph('O Claude Code consulta documentos, desenhos e tarefas por MCP, sem escrever nada.'),
    TOKEN_BLOCK,
    paragraph('Cada resposta cabe em 45.000 caracteres; documentos longos vêm em páginas.'),
  ],
  'Notas de arquitetura': [
    heading('Módulos'),
    paragraph('core, auth, workspace, server e web, cada um com domínio, aplicação e infraestrutura.'),
    heading('Persistência'),
    paragraph('SQLite no servidor, com migrações numeradas e escritas idempotentes.'),
  ],
  Portfólio: [paragraph('Projetos de 2024 e um texto curto de apresentação.')],
} satisfies Record<string, DocumentBlock[]>;

/**
 * "Visão do produto", as the brief and the prototype have it: the drawing "Navegação com projeto no
 * centro" after the navigation, then the task "Gerar token pessoal no Perfil" and the deleted one,
 * "Revisar textos do onboarding", which waits in the trash.
 */
export function visionDocument(ids: { navigation: string; token: string; onboarding: string }): DocumentBlock[] {
  return [
    heading('Por que existe', 1),
    paragraph(
      'Um espaço pessoal e minimalista para conduzir projetos, com escrita, desenho e tarefas no mesmo lugar, ' +
        'sem o excesso de Notion, Excalidraw e Trello.',
    ),
    heading('Princípios'),
    bullet('O projeto é o centro.'),
    bullet('Cada ferramenta faz menos que a original.'),
    bullet('Ligações vivem nos documentos.'),
    bullet('Nada se perde.'),
    heading('Navegação'),
    paragraph(
      'O projeto fica no centro. Cada projeto tem um sumário na barra lateral, e o que é avulso mora no projeto Geral.',
    ),
    drawingEmbed(ids.navigation),
    heading('Acesso pelo Claude Code'),
    paragraph('Um servidor MCP somente leitura deixa o Claude Code consultar documentos, desenhos e tarefas.'),
    taskEmbed(ids.token),
    taskEmbed(ids.onboarding),
    paragraph('Próximo passo: gerar token pessoal no Perfil para o Claude Code ler o Tinyfold.'),
  ];
}

/** The brief's labels, in the prototype's colors. */
const LABELS = [
  ['mcp', 'blue'],
  ['backend', 'slate'],
  ['editor', 'purple'],
  ['kanban', 'teal'],
  ['operação', 'amber'],
  ['fornecedores', 'coral'],
  ['compras', 'lime'],
] as const satisfies readonly (readonly [string, LabelColor])[];
type LabelName = (typeof LABELS)[number][0];

/** The board's columns by the brief's names; Revisão is created by the seed. */
type ColumnName = 'A fazer' | 'Em andamento' | 'Revisão' | 'Concluído';

/**
 * The descriptions of the prototype's tasks, as the editor saves them: checklists of 2/5, 3/3 and
 * 1/3. Tasks the prototype leaves without text keep an empty description.
 */
export const SAMPLE_DESCRIPTIONS = {
  'Configurar backup externo': [line('Cópia diária do banco para fora do servidor, com restauração testada.')],
  'Expor documentos em Markdown pelo MCP': [
    line('Ler um documento em Markdown. Tarefas e desenhos incorporados aparecem como referências.'),
  ],
  'Renderizar desenho incorporado no documento': [
    line('Mostrar a versão atual, somente leitura. Clicar abre o editor do desenho.'),
  ],
  'Gerar token pessoal no Perfil': [
    line('Token somente leitura para o MCP. Guardar só o hash do valor.'),
    item('Tabela de tokens com hash', true),
    item('Gerar valor e mostrar uma vez', true),
    item('Botão de copiar'),
    item('Revogar token'),
    item('Registrar último uso'),
  ],
  'Colunas configuráveis no quadro': [
    line('Um único conjunto de colunas para todo o espaço.'),
    item('Criar e renomear colunas', true),
    item('Reordenar colunas', true),
    item('Excluir com destino das tarefas', true),
  ],
  'Corrigir foco ao fechar diálogo': [line('O foco volta para o botão que abriu o diálogo.')],
  'Pedir orçamento do marceneiro': [line('Estante e mesa sob medida.')],
  'Escolher luminária': [
    line('Luz para a mesa perto da janela.'),
    item('Medir a altura da mesa', true),
    item('Comparar modelos'),
    item('Comprar'),
  ],
} satisfies Record<string, DocumentBlock[]>;

/** The prototype's old completed tasks, which `--grande` adds twice over. */
const OLD_DONE = [
  'Configurar repositório',
  'Escolher licença',
  'Definir paleta inicial',
  'Criar tela de login',
  'Salvar documento no servidor',
  'Lista de documentos',
  'Editor de desenho embutido',
  'Quadro com três colunas',
  'Mover tarefa entre colunas',
  'Criar tarefa no quadro',
  'Busca por título',
  'Exportar documento .md',
  'Importar documento .md',
  'Página do Perfil',
  'Trocar senha',
  'Encerrar sessões',
  'Rascunho local do documento',
  'Estado de salvamento no cabeçalho',
  'Lixeira de documentos',
  'Restaurar da lixeira',
  'Arquivar projeto',
  'Seletor de projetos',
  'Atalhos com G',
  'Linha de comando',
  'Etiquetas nas tarefas',
  'Prazo nas tarefas',
  'Checklist na descrição',
  'Desenho incorporado no documento',
  'Tema escuro',
  'Testes do editor',
];

/** Creates the folders in the order given; each new folder goes first, so they are made from the last. */
async function folders<const Name extends string>(workspace: WorkspaceService, projectId: string, names: Name[]) {
  const ids = {} as Record<Name, string>;
  for (const name of [...names].reverse())
    ids[name] = (await workspace.createFolder({ ...request(), projectId, name })).id;
  return ids;
}

/**
 * The items the large project adds, as the prototype's loadBigProject numbers them: 37 documents and
 * 13 drawings, filed by their number. Written before the sample's own items, so these read as older.
 */
async function loadBigProject(
  workspace: WorkspaceService,
  projectId: string,
  folder: Record<'Produto' | 'MCP' | 'Arquitetura' | 'Operação', string>,
) {
  const pad = (number: number) => String(number).padStart(2, '0');
  const documentFolder = (number: number) =>
    number <= 8
      ? folder.Produto
      : number <= 17
        ? folder.MCP
        : number <= 28
          ? folder.Arquitetura
          : number <= 34
            ? folder.Operação
            : undefined;
  const drawingFolder = (number: number) =>
    number <= 3
      ? folder.Produto
      : number <= 5
        ? folder.MCP
        : number <= 10
          ? folder.Arquitetura
          : number <= 12
            ? folder.Operação
            : undefined;
  for (let number = 1; number <= 37; number++)
    await workspace.createDocument({
      ...request(),
      projectId,
      folderId: documentFolder(number),
      title: `Documento de carga ${pad(number)}`,
      content: [paragraph('Conteúdo de carga para testar a barra lateral com muitos itens.')],
    });
  for (let number = 1; number <= 13; number++)
    await workspace.createCanvas({
      ...request(),
      projectId,
      folderId: drawingFolder(number),
      title: `Desenho de carga ${pad(number)}`,
      scene: flow(['Etapa A', 'Etapa B', 'Etapa C']),
    });
}

/** The sample's writes, and a service whose clock stops at `instant` for the completed tasks. */
interface Writers {
  workspace: WorkspaceService;
  at(instant: string): WorkspaceService;
  /** The day the seed runs, in UTC, which due dates and completions count from. */
  today: string;
}

interface SampleTask {
  column: ColumnName;
  /** Days from the seed's day; negative ones are late. */
  due?: number;
  labels?: LabelName[];
  /** Days before the seed's day the task was completed, at 15:00 UTC, in the done column. */
  doneDaysAgo?: number;
}

async function seed({ workspace, at, today }: Writers, { grande }: { grande: boolean }) {
  const project = (name: string, color: 'violet' | 'ochre' | 'gray' | 'green') =>
    workspace.createProject({ ...request(), name, color });
  const document = (projectId: string, title: string, content: DocumentBlock[], folderId?: string) =>
    workspace.createDocument({ ...request(), projectId, folderId, title, content });
  const drawing = (projectId: string, title: string, scene: CanvasScene, folderId?: string) =>
    workspace.createCanvas({ ...request(), projectId, folderId, title, scene });

  await workspace.createColumn({ ...request(), name: 'Revisão' });
  const columnIds = Object.fromEntries(
    (await workspace.listColumns({})).columns.map((column) => [column.name, column.id]),
  ) as Record<ColumnName, string>;
  const labelIds = {} as Record<LabelName, string>;
  for (const [name, color] of LABELS) labelIds[name] = (await workspace.createLabel({ ...request(), name, color })).id;
  const completedOn = (daysAgo: number) => `${addDays(today, -daysAgo)}T15:00:00.000Z`;
  const fields = (title: string, sample: SampleTask) => ({
    ...request(),
    title,
    columnId: columnIds[sample.column],
    ...(sample.due === undefined ? {} : { dueOn: addDays(today, sample.due) }),
    labelIds: (sample.labels ?? []).map((name) => labelIds[name]),
    ...(title in SAMPLE_DESCRIPTIONS
      ? { description: SAMPLE_DESCRIPTIONS[title as keyof typeof SAMPLE_DESCRIPTIONS] }
      : {}),
  });
  const task = (projectId: string, title: string, sample: SampleTask) =>
    (sample.doneDaysAgo === undefined ? workspace : at(completedOn(sample.doneDaysAgo))).createTask({
      ...fields(title, sample),
      projectId,
    });

  const tinyfold = await project('Tinyfold', 'violet');
  const reforma = await project('Reforma do escritório', 'ochre');
  const geral = await project('Geral', 'gray');
  const site = await project('Site pessoal 2024', 'green');

  // Geral has no folders, to show that folders are optional; "Produto" and "Operação" exist only in
  // the large project, so the normal sample has no folder with a single item (pastas.md §5).
  const compras = await folders(workspace, reforma.id, ['Compras']);
  let tinyfoldFolders: Record<'MCP' | 'Arquitetura', string>;
  if (grande) {
    const all = await folders(workspace, tinyfold.id, ['Produto', 'MCP', 'Arquitetura', 'Operação']);
    await loadBigProject(workspace, tinyfold.id, all);
    tinyfoldFolders = all;
  } else tinyfoldFolders = await folders(workspace, tinyfold.id, ['MCP', 'Arquitetura']);

  await document(geral.id, 'Ideias soltas', SAMPLE_DOCUMENTS['Ideias soltas']);
  await drawing(geral.id, 'Rabisco de logo', flow(['Dobra', 'Folha', 'Marca'], 'Três ideias para o logo'));
  await task(geral.id, 'Renovar domínio', { column: 'A fazer', due: 16 });

  await document(reforma.id, 'Orçamento e fornecedores', SAMPLE_DOCUMENTS['Orçamento e fornecedores'], compras.Compras);
  await document(reforma.id, 'Lista de compras', SAMPLE_DOCUMENTS['Lista de compras'], compras.Compras);
  const planta = await drawing(
    reforma.id,
    'Planta do escritório',
    flow(['Porta', 'Mesa', 'Janela'], 'Planta baixa, sem escala'),
  );
  for (const [title, sample] of [
    ['Pedir orçamento do marceneiro', { column: 'A fazer', due: 4, labels: ['fornecedores'] }],
    ['Pintar parede', { column: 'A fazer' }],
    ['Escolher luminária', { column: 'Em andamento', labels: ['compras'] }],
    ['Medir janela', { column: 'Concluído', doneDaysAgo: 4 }],
  ] as const satisfies readonly (readonly [string, SampleTask])[])
    await task(reforma.id, title, sample);

  const mcp = await document(
    tinyfold.id,
    'MCP somente leitura',
    SAMPLE_DOCUMENTS['MCP somente leitura'],
    tinyfoldFolders.MCP,
  );
  await document(
    tinyfold.id,
    'Notas de arquitetura',
    SAMPLE_DOCUMENTS['Notas de arquitetura'],
    tinyfoldFolders.Arquitetura,
  );
  await drawing(
    tinyfold.id,
    'Fluxo do autosave',
    flow(['Editor', 'Rascunho local', 'Servidor'], 'Uma chamada em voo por documento'),
    tinyfoldFolders.Arquitetura,
  );
  const navigation = await drawing(
    tinyfold.id,
    'Navegação com projeto no centro',
    flow(['Seletor', 'Projeto', 'Item']),
  );
  if (grande)
    for (const [index, title] of [...OLD_DONE, ...OLD_DONE.map((name) => `${name} (revisão)`)].entries())
      await task(tinyfold.id, title, {
        column: 'Concluído',
        labels: [(['editor', 'backend', 'kanban', 'mcp', 'operação'] as const)[index % 5] ?? 'editor'],
        doneDaysAgo: 15 + Math.round((index * 105) / 59),
      });
  // In the prototype's board order: each task goes to the end of its column.
  for (const [title, sample] of [
    ['Configurar backup externo', { column: 'A fazer', due: -2, labels: ['operação'] }],
    ['Expor documentos em Markdown pelo MCP', { column: 'A fazer', due: 13, labels: ['mcp'] }],
    ['Renderizar desenho incorporado no documento', { column: 'A fazer', labels: ['editor'] }],
  ] as const satisfies readonly (readonly [string, SampleTask])[])
    await task(tinyfold.id, title, sample);
  // Created from the token's paragraph of "MCP somente leitura", whose origin marker it shows.
  const token = await workspace.createTask({
    ...fields('Gerar token pessoal no Perfil', { column: 'Em andamento', due: 5, labels: ['mcp', 'backend'] }),
    source: { documentId: mcp.id, blockId: TOKEN_BLOCK.id, excerpt: TOKEN_EXCERPT },
  });
  await task(tinyfold.id, 'Colunas configuráveis no quadro', { column: 'Revisão', labels: ['kanban'] });
  await task(tinyfold.id, 'Corrigir foco ao fechar diálogo', {
    column: 'Concluído',
    labels: ['editor'],
    doneDaysAgo: 3,
  });
  // The brief's document embeds a task that was deleted; here it waits in the trash.
  const deleted = await task(tinyfold.id, 'Revisar textos do onboarding', { column: 'A fazer' });
  await workspace.deleteTask({ ...request(), id: deleted.id, expectedVersion: deleted.version });
  // Written last, so the overview names it as the last text edited.
  const vision = await document(
    tinyfold.id,
    'Visão do produto',
    visionDocument({ navigation: navigation.id, token: token.id, onboarding: deleted.id }),
  );
  await workspace.pinItem({ type: 'document', id: vision.id });
  await workspace.pinItem({ type: 'drawing', id: planta.id });

  await document(site.id, 'Portfólio', SAMPLE_DOCUMENTS.Portfólio);
  await workspace.updateProject({ ...request(), id: site.id, expectedVersion: site.version, archived: true });
  return [tinyfold, reforma, geral, site];
}

/**
 * Spreads the sample's writes over the last `days`, an hour and a half apart, so recency orders them
 * as written and the interface shows plausible dates. It never passes the current time.
 */
function sampleClock(days: number) {
  const step = 90 * 60_000;
  let at = Date.now() - days * 24 * 60 * 60_000;
  return () => {
    at = Math.min(at + step, Date.now());
    return new Date(at);
  };
}

/** The only option is `--grande`; anything else is refused before the database is opened. */
function readOptions(args: string[]) {
  const unknown = args.filter((arg) => arg !== '--grande');
  if (unknown.length > 0) throw new Error(`Opção desconhecida: ${unknown.join(' ')}. Use apenas --grande.`);
  return { grande: args.includes('--grande') };
}

/** Writes the sample to a migrated database; the seed's tests call it on their own. */
export function seedSample(db: Database, options: { grande: boolean }) {
  // The large project's 54 more writes would reach the current time within two days.
  const workspace = createWorkspaceService(db, sampleClock(options.grande ? 7 : 2));
  const at = (instant: string) => createWorkspaceService(db, () => new Date(instant));
  return seed({ workspace, at, today: todayIn('UTC', new Date()) }, options);
}

async function main() {
  const options = readOptions(process.argv.slice(2));
  const { databasePath } = readConfig();
  assertSeedTarget(databasePath, { roots: temporaryRoots(), production: process.env.NODE_ENV === 'production' });
  const db = createDatabase(databasePath);
  try {
    await migrate(db, modules);
    const projects = await seedSample(db, options);
    const names = projects.map((project) => project.name).join(', ');
    console.info(`Exemplo${options.grande ? ' grande' : ''} criado em ${databasePath}: ${names}.`);
  } finally {
    await db.destroy();
  }
}

// Run as a script, not when a test imports the sample. The module's URL has the real path.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href)
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Falha ao criar o exemplo.');
    process.exitCode = 1;
  }
