import { KEYS } from './keys';

/** One shortcut: the keys pressed together, `mod` for ⌘ or Ctrl. */
type Keys = readonly string[];

export interface ShortcutGroup {
  title: string;
  rows: { label: string; alternatives: readonly Keys[] }[];
}

/** The table of the Atalhos dialog, from the prototype's, with the keys of KEYS. */
export const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Geral',
    rows: [
      { label: 'Buscar ou comandar', alternatives: [KEYS.palette] },
      { label: 'Trocar de projeto', alternatives: [KEYS.switcher] },
      { label: 'Projeto n do seletor', alternatives: [['G', '1–9']] },
      {
        label: 'Visão geral · Quadro · Lixeira',
        alternatives: [KEYS.overview, KEYS.board, KEYS.trash],
      },
      { label: 'Recolher ou expandir a lateral', alternatives: [KEYS.toggleSidebar] },
      { label: 'Lateral → página', alternatives: [['F6'], ['⇧', 'F6']] },
      { label: 'Novo no projeto atual', alternatives: [KEYS.newItem] },
      { label: 'Atalhos', alternatives: [KEYS.shortcuts] },
      { label: 'Salvar agora; depois de falha, tentar de novo', alternatives: [KEYS.save] },
      { label: 'Voltar', alternatives: [KEYS.back] },
      { label: 'Desfazer a ação do toast na tela', alternatives: [KEYS.undo] },
      { label: 'Fecha a camada aberta mais recente', alternatives: [KEYS.close] },
    ],
  },
  {
    title: 'Barra lateral',
    rows: [
      { label: 'Buscar no projeto', alternatives: [KEYS.search] },
      { label: 'Percorrer as linhas', alternatives: [['↑'], ['↓']] },
      { label: 'Primeira e última linha', alternatives: [['Home'], ['End']] },
      { label: 'Recolher ou expandir a pasta; ir ao primeiro item ou à pasta', alternatives: [['←'], ['→']] },
      { label: 'Abrir o item; numa pasta, abrir ou fechar', alternatives: [['↵']] },
      { label: 'Ir ao item que começa com as letras digitadas', alternatives: [['a–z']] },
      { label: 'Renomear a pasta', alternatives: [KEYS.rename] },
      {
        label: 'Mover a pasta para cima ou para baixo',
        alternatives: [KEYS.moveUp, KEYS.moveDown],
      },
      { label: 'Menu da pasta', alternatives: [KEYS.menu] },
      { label: 'Novo na pasta', alternatives: [KEYS.newItem] },
    ],
  },
  {
    title: 'Quadro',
    rows: [
      { label: 'Card ou coluna vizinha', alternatives: [['↑'], ['↓'], ['←'], ['→']] },
      {
        label: 'Mover o card; no nome, mover a coluna',
        alternatives: [
          ['⇧', '↑'],
          ['⇧', '↓'],
          ['⇧', '←'],
          ['⇧', '→'],
        ],
      },
      { label: 'Abrir a tarefa; no nome, renomear a coluna', alternatives: [['↵']] },
      { label: 'Mover o card para outra coluna', alternatives: [KEYS.move] },
      { label: 'Concluir ou reabrir', alternatives: [KEYS.toggleDone] },
      { label: 'Menu do card ou da coluna', alternatives: [KEYS.menu] },
      { label: 'Nova tarefa na coluna em foco', alternatives: [KEYS.newItem] },
    ],
  },
  {
    title: 'Documento e desenho',
    rows: [
      { label: 'Fixar ou desafixar', alternatives: [KEYS.pin] },
      { label: 'Mover para pasta', alternatives: [KEYS.move] },
      { label: 'Criar tarefa a partir do trecho selecionado', alternatives: [KEYS.createTask] },
    ],
  },
];
