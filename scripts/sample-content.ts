/**
 * The content of the sample (docs/interface/brief.md and the prototype): its documents, with the
 * embeds of "Visão do produto", the tasks' descriptions and the drawings' scenes, as the editors
 * save them. Pure data, with no database, DOM or Node API, so the seed writes it and a web unit test
 * can round-trip it through the real editors; `scripts/seed-sample.test.ts` checks the data, and
 * `scripts/seed-sample.db.test.ts` what the seed stores.
 *
 * Blocks are in BlockNote's saved form (default props, `children: []`, headings without
 * `isToggleable`, as the document schema has them), with an id each: without one, the editor would
 * make one up each time it opens the document, and a task from a selection in a document nobody has
 * edited yet would point at a block the server does not have.
 *
 * Scenes are in the form Excalidraw 0.18.1 restores and saves (stage 11, decision 16). Opening the
 * stage 10 scenes in Chrome showed what the editor's restore changed: it gave each element a
 * fractional `index` ("a0", "a1", …), turned `boundElements: null` into `[]`, gave arrows
 * `lastCommittedPoint: null`, and, for the index, raised every `version` and `versionNonce`. Text
 * measurements and the bindings, of arrows to boxes and of labels to their boxes on both sides, were
 * already as it keeps them. e2e/seed-sample.spec.ts opens each item and fails when a new Excalidraw
 * or BlockNote changes this again.
 */
import type { CanvasElement, CanvasScene, DocumentBlock, JsonValue } from '../src/workspace/domain/index.js';

const text = (value: string): JsonValue => [{ type: 'text', text: value, styles: {} }];
/**
 * A block as BlockNote saves it: an id of its own, default props and children included, so opening
 * it changes nothing. Without an id, the editor would make one up each time it opens the document,
 * and a task from a selection in a document nobody has edited yet would point at a block the server
 * does not have.
 */
const block = (type: string, value: string, props: Record<string, JsonValue> = {}): DocumentBlock & { id: string } => ({
  id: crypto.randomUUID(),
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
  id: crypto.randomUUID(),
  type: 'taskEmbed',
  props: { taskId },
  children: [],
});
const drawingEmbed = (canvasId: string): DocumentBlock => ({
  id: crypto.randomUUID(),
  type: 'drawingEmbed',
  props: { canvasId },
  children: [],
});

/** The paragraph of "MCP somente leitura" that "Gerar token pessoal no Perfil" was created from. */
export const TOKEN_BLOCK = paragraph(
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

/** Excalidraw's fractional index digits, in its order: the n-th key of a fresh scene is `a` + digit. */
const INDEX_DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** The fractional index Excalidraw gives the n-th element of a scene it restores, up to 62 elements. */
export function sceneIndex(position: number): string {
  const digit = INDEX_DIGITS[position];
  if (digit === undefined) throw new RangeError(`A sample scene has at most ${INDEX_DIGITS.length} elements.`);
  return `a${digit}`;
}

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
    boundElements: [],
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
        lastCommittedPoint: null,
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

/** Boxes in a row, each linked to the next by an arrow, with an optional caption above. */
export function flow(labels: string[], caption?: string): CanvasScene {
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
  return {
    appState: { viewBackgroundColor: '#ffffff' },
    elements: elements.map((element, position) => ({ ...element, index: sceneIndex(position) })),
  };
}

/** The sample's drawings, by title. Each read builds new elements, with the current time as `updated`. */
export const sampleScenes = () =>
  ({
    'Rabisco de logo': flow(['Dobra', 'Folha', 'Marca'], 'Três ideias para o logo'),
    'Planta do escritório': flow(['Porta', 'Mesa', 'Janela'], 'Planta baixa, sem escala'),
    'Fluxo do autosave': flow(['Editor', 'Rascunho local', 'Servidor'], 'Uma chamada em voo por documento'),
    'Navegação com projeto no centro': flow(['Seletor', 'Projeto', 'Item']),
  }) satisfies Record<string, CanvasScene>;

/** The scene of each drawing `--grande` adds. */
export const loadScene = () => flow(['Etapa A', 'Etapa B', 'Etapa C']);

/** The content of each document `--grande` adds. */
export const loadDocument = (): DocumentBlock[] => [
  paragraph('Conteúdo de carga para testar a barra lateral com muitos itens.'),
];
