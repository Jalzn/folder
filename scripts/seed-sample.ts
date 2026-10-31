/**
 * Fills a temporary database with the sample data of docs/interface/brief.md, for visual checks and
 * screenshots, never for production. Deadlines and labels wait for stage 10, and the brief's items
 * without a project live in Geral, as migration 005 left them. The scenes are built here, since the
 * test helpers of the testing/ folders stay out of runtime code.
 *
 *   DATABASE_PATH=/tmp/tinyfold-08/tinyfold.sqlite pnpm seed:sample
 *
 * Refuses the main database, data/tinyfold.sqlite, and any database that already has documents.
 */
import { randomUUID } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { createDatabase, migrate } from '../src/core/infra/index.js';
import { readConfig, repositoryRoot } from '../src/server/config.js';
import { modules } from '../src/server/modules.js';
import type {
  CanvasElement,
  CanvasScene,
  DocumentBlock,
  JsonValue,
  TaskStatus,
} from '../src/workspace/domain/index.js';
import { createWorkspaceService, type WorkspaceService } from '../src/workspace/index.js';

const request = () => ({ requestId: randomUUID() });

const text = (value: string): JsonValue => [{ type: 'text', text: value, styles: {} }];
/**
 * A block with an id of its own, as the editor saves it. Without one, the editor would make up an id
 * each time it opens the document, and a task from a selection in a document nobody has edited yet
 * would point at a block the server does not have.
 */
const block = (type: string, value: string, props?: Record<string, JsonValue>): DocumentBlock & { id: string } => ({
  id: randomUUID(),
  type,
  ...(props ? { props } : {}),
  content: text(value),
});
const paragraph = (value: string) => block('paragraph', value);
const heading = (value: string, level = 2) => block('heading', value, { level });
const bullet = (value: string) => block('bulletListItem', value);
const check = (value: string, checked = false) => block('checkListItem', value, { checked });

/** Excalidraw elements with the properties its editor writes, so the editor opens them unchanged. */
function sceneBuilder() {
  let seed = 1;
  const element = (fields: Record<string, JsonValue> & { id: string; type: string }): CanvasElement => ({
    angle: 0,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 3 },
    seed,
    version: 1,
    versionNonce: seed++,
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    ...fields,
  });
  const width = 200;
  const height = 80;
  return {
    /** A rectangle with a label inside, bound to the arrows that reach it. */
    box(id: string, x: number, y: number, label: string, arrows: string[] = []): CanvasElement[] {
      const labelId = `${id}-label`;
      return [
        element({
          id,
          type: 'rectangle',
          x,
          y,
          width,
          height,
          backgroundColor: '#e8ecf2',
          boundElements: [{ id: labelId, type: 'text' }, ...arrows.map((arrow) => ({ id: arrow, type: 'arrow' }))],
        }),
        element({
          id: labelId,
          type: 'text',
          x: x + 10,
          y: y + 27,
          width: width - 20,
          height: 25,
          roundness: null,
          text: label,
          originalText: label,
          fontSize: 20,
          fontFamily: 5,
          textAlign: 'center',
          verticalAlign: 'middle',
          containerId: id,
          autoResize: true,
          lineHeight: 1.25,
        }),
      ];
    },
    /** An arrow from the right side of one box to the left side of another. */
    arrow(id: string, from: { id: string; x: number; y: number }, to: { id: string; x: number; y: number }) {
      const start = [from.x + width + 4, from.y + height / 2];
      const end = [to.x - 4, to.y + height / 2];
      return element({
        id,
        type: 'arrow',
        x: start[0] ?? 0,
        y: start[1] ?? 0,
        width: Math.abs((end[0] ?? 0) - (start[0] ?? 0)),
        height: Math.abs((end[1] ?? 0) - (start[1] ?? 0)),
        roundness: { type: 2 },
        points: [
          [0, 0],
          [(end[0] ?? 0) - (start[0] ?? 0), (end[1] ?? 0) - (start[1] ?? 0)],
        ],
        startBinding: { elementId: from.id, focus: 0, gap: 4 },
        endBinding: { elementId: to.id, focus: 0, gap: 4 },
        startArrowhead: null,
        endArrowhead: 'arrow',
        elbowed: false,
      });
    },
    /** A free text, outside any shape. */
    note(id: string, x: number, y: number, value: string) {
      return element({
        id,
        type: 'text',
        x,
        y,
        width: 12 * value.length,
        height: 25,
        roundness: null,
        text: value,
        originalText: value,
        fontSize: 20,
        fontFamily: 5,
        textAlign: 'left',
        verticalAlign: 'top',
        containerId: null,
        autoResize: true,
        lineHeight: 1.25,
      });
    },
  };
}

/** Boxes in a row, each linked to the next by an arrow. */
function flow(labels: string[], caption?: string): CanvasScene {
  const draw = sceneBuilder();
  const boxes = labels.map((label, index) => ({ id: `b${index}`, x: 40 + index * 300, y: 120, label }));
  const elements = boxes.flatMap((box, index) =>
    draw.box(
      box.id,
      box.x,
      box.y,
      box.label,
      [index > 0 ? `a${index - 1}` : undefined, index < boxes.length - 1 ? `a${index}` : undefined].filter(
        (arrow): arrow is string => arrow !== undefined,
      ),
    ),
  );
  for (const [index, box] of boxes.slice(0, -1).entries()) {
    const next = boxes[index + 1];
    if (next) elements.push(draw.arrow(`a${index}`, box, next));
  }
  if (caption) elements.push(draw.note('caption', 40, 40, caption));
  return { appState: { viewBackgroundColor: '#ffffff' }, elements };
}

/** The main database never gets the sample, nor does one in memory, which would keep nothing. */
function assertTemporaryPath(path: string) {
  const main = resolve(repositoryRoot, 'data/tinyfold.sqlite');
  const real = (file: string) => (existsSync(file) ? realpathSync(file) : resolve(file));
  if (path === ':memory:' || real(path) === real(main))
    throw new Error('Defina DATABASE_PATH com um banco temporário. O banco principal nunca recebe o exemplo.');
}

/** Nothing real is mixed with the sample. */
async function assertNoDocuments(workspace: WorkspaceService) {
  const documents = [...(await workspace.listDocuments()), ...(await workspace.listDocuments({ deleted: true }))];
  if (documents.length) throw new Error('O banco já tem documentos. Use um banco novo para o exemplo.');
}

async function seed(workspace: WorkspaceService) {
  const project = (name: string, color: 'violet' | 'ochre' | 'gray' | 'green') =>
    workspace.createProject({ ...request(), name, color });
  const document = (projectId: string, title: string, content: DocumentBlock[]) =>
    workspace.createDocument({ ...request(), projectId, title, content });
  const drawing = (projectId: string, title: string, scene: CanvasScene) =>
    workspace.createCanvas({ ...request(), projectId, title, scene });
  const task = (projectId: string, title: string, status: TaskStatus) =>
    workspace.createTask({ ...request(), projectId, title, status });

  const tinyfold = await project('Tinyfold', 'violet');
  const reforma = await project('Reforma do escritório', 'ochre');
  const geral = await project('Geral', 'gray');
  const site = await project('Site pessoal 2024', 'green');

  await document(geral.id, 'Ideias soltas', [
    paragraph('Anotar aqui o que ainda não tem projeto.'),
    bullet('Um diário de leituras com trechos favoritos.'),
    bullet('Organizar as fotos da viagem por cidade.'),
  ]);
  await drawing(geral.id, 'Rabisco de logo', flow(['Dobra', 'Folha', 'Marca'], 'Três ideias para o logo'));
  await task(geral.id, 'Renovar domínio', 'todo');

  await document(reforma.id, 'Orçamento e fornecedores', [
    heading('Orçamento'),
    paragraph('Teto de R$ 8.000 para marcenaria, pintura e iluminação.'),
    heading('Fornecedores'),
    bullet('Marcenaria Silva: armário e prateleiras sob medida.'),
    bullet('Loja de iluminação do centro: luminária de mesa e pendente.'),
  ]);
  await document(reforma.id, 'Lista de compras', [
    check('Tinta acrílica fosca, 18 litros', true),
    check('Fita crepe e lona'),
    check('Luminária de mesa'),
  ]);
  await drawing(reforma.id, 'Planta do escritório', flow(['Porta', 'Mesa', 'Janela'], 'Planta baixa, sem escala'));
  for (const [title, status] of [
    ['Pedir orçamento do marceneiro', 'todo'],
    ['Escolher luminária', 'doing'],
    ['Pintar parede', 'todo'],
    ['Medir janela', 'done'],
  ] as const)
    await task(reforma.id, title, status);

  const token = paragraph('Gerar token pessoal no Perfil, mostrado uma única vez, com o comando pronto para copiar.');
  const mcp = await document(tinyfold.id, 'MCP somente leitura', [
    paragraph('O Claude Code consulta documentos, desenhos e tarefas por MCP, sem escrever nada.'),
    token,
    paragraph('Cada resposta cabe em 45.000 caracteres; documentos longos vêm em páginas.'),
  ]);
  await document(tinyfold.id, 'Notas de arquitetura', [
    heading('Módulos'),
    paragraph('core, auth, workspace, server e web, cada um com domínio, aplicação e infraestrutura.'),
    heading('Persistência'),
    paragraph('SQLite no servidor, com migrações numeradas e escritas idempotentes.'),
  ]);
  const autosave = await drawing(
    tinyfold.id,
    'Fluxo do autosave',
    flow(['Editor', 'Rascunho local', 'Servidor'], 'Uma chamada em voo por documento'),
  );
  await drawing(tinyfold.id, 'Navegação com projeto no centro', flow(['Seletor', 'Projeto', 'Item']));
  await workspace.createTask({
    ...request(),
    title: 'Gerar token pessoal no Perfil',
    status: 'doing',
    source: { documentId: mcp.id, blockId: token.id, excerpt: 'Gerar token pessoal no Perfil' },
  });
  for (const [title, status] of [
    ['Expor documentos em Markdown pelo MCP', 'todo'],
    ['Renderizar desenho incorporado no documento', 'todo'],
    // The brief's "Revisão" column arrives with configurable columns in stage 10.
    ['Colunas configuráveis no quadro', 'doing'],
    ['Configurar backup externo', 'todo'],
    ['Corrigir foco ao fechar diálogo', 'done'],
  ] as const)
    await task(tinyfold.id, title, status);
  // The brief's document embeds a task that was deleted; here it waits in the trash.
  const deleted = await task(tinyfold.id, 'Revisar textos do onboarding', 'todo');
  await workspace.deleteTask({ ...request(), id: deleted.task.id, expectedVersion: deleted.task.version });
  // Written last, so the overview names it as the last text edited.
  const vision = await document(tinyfold.id, 'Visão do produto', [
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
    paragraph('Próximo passo: gerar token pessoal no Perfil para o Claude Code ler o Tinyfold.'),
  ]);
  await workspace.pinItem({ type: 'document', id: vision.id });
  await workspace.pinItem({ type: 'drawing', id: autosave.id });

  await document(site.id, 'Portfólio', [paragraph('Projetos de 2024 e um texto curto de apresentação.')]);
  await workspace.updateProject({ ...request(), id: site.id, expectedVersion: site.version, archived: true });
  return [tinyfold, reforma, geral, site];
}

/**
 * Spreads the sample's writes over the last two days, an hour and a half apart, so recency orders
 * them as written and the interface shows plausible dates. It never passes the current time.
 */
function sampleClock() {
  const step = 90 * 60_000;
  let at = Date.now() - 2 * 24 * 60 * 60_000;
  return () => {
    at = Math.min(at + step, Date.now());
    return new Date(at);
  };
}

async function main() {
  const { databasePath } = readConfig();
  assertTemporaryPath(databasePath);
  const db = createDatabase(databasePath);
  try {
    await migrate(db, modules);
    const workspace = createWorkspaceService(db, sampleClock());
    await assertNoDocuments(workspace);
    const projects = await seed(workspace);
    console.info(`Exemplo criado em ${databasePath}: ${projects.map((project) => project.name).join(', ')}.`);
  } finally {
    await db.destroy();
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Falha ao criar o exemplo.');
  process.exitCode = 1;
}
