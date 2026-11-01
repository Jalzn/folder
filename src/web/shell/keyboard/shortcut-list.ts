/** One shortcut: the keys pressed together, `mod` for ⌘ or Ctrl. */
type Keys = readonly string[];

export interface ShortcutGroup {
  title: string;
  rows: { label: string; alternatives: readonly Keys[] }[];
}

/** The table of the Atalhos dialog, from the prototype's, without what later stages bring. */
export const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Geral',
    rows: [
      { label: 'Buscar ou comandar', alternatives: [['mod', 'K']] },
      { label: 'Trocar de projeto', alternatives: [['G', 'P']] },
      { label: 'Projeto n do seletor', alternatives: [['G', '1–9']] },
      {
        label: 'Visão geral · Quadro · Lixeira',
        alternatives: [
          ['G', 'V'],
          ['G', 'Q'],
          ['G', 'L'],
        ],
      },
      { label: 'Recolher ou expandir a lateral', alternatives: [['mod', '\\']] },
      { label: 'Lateral → página', alternatives: [['F6'], ['⇧', 'F6']] },
      { label: 'Novo no projeto atual', alternatives: [['N']] },
      { label: 'Atalhos', alternatives: [['?']] },
      { label: 'Salvar agora; depois de falha, tentar de novo', alternatives: [['mod', 'S']] },
      { label: 'Voltar', alternatives: [['mod', '[']] },
      { label: 'Desfazer a ação do toast na tela', alternatives: [['mod', 'Z']] },
      { label: 'Fecha a camada aberta mais recente', alternatives: [['Esc']] },
    ],
  },
  {
    title: 'Barra lateral',
    rows: [
      { label: 'Buscar no projeto', alternatives: [['/']] },
      { label: 'Percorrer as linhas', alternatives: [['↑'], ['↓']] },
      { label: 'Primeira e última linha', alternatives: [['Home'], ['End']] },
      { label: 'Recolher ou expandir a pasta; ir ao primeiro item ou à pasta', alternatives: [['←'], ['→']] },
      { label: 'Abrir o item; numa pasta, abrir ou fechar', alternatives: [['↵']] },
      { label: 'Ir ao item que começa com as letras digitadas', alternatives: [['a–z']] },
      { label: 'Renomear a pasta', alternatives: [['F2']] },
      {
        label: 'Mover a pasta para cima ou para baixo',
        alternatives: [
          ['⌥', '↑'],
          ['⌥', '↓'],
        ],
      },
      { label: 'Menu da pasta', alternatives: [['⇧', 'F10']] },
      { label: 'Novo na pasta', alternatives: [['N']] },
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
      { label: 'Mover o card para outra coluna', alternatives: [['M']] },
      { label: 'Concluir ou reabrir', alternatives: [['mod', '↵']] },
      { label: 'Menu do card ou da coluna', alternatives: [['⇧', 'F10']] },
      { label: 'Nova tarefa na coluna em foco', alternatives: [['N']] },
    ],
  },
  {
    title: 'Documento e desenho',
    rows: [
      { label: 'Fixar ou desafixar', alternatives: [['P']] },
      { label: 'Mover para pasta', alternatives: [['M']] },
    ],
  },
];
