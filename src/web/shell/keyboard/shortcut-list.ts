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
      { label: 'Fecha a camada aberta mais recente', alternatives: [['Esc']] },
    ],
  },
  {
    title: 'Barra lateral',
    rows: [
      { label: 'Buscar no projeto', alternatives: [['/']] },
      { label: 'Percorrer as linhas', alternatives: [['↑'], ['↓']] },
      { label: 'Primeira e última linha', alternatives: [['Home'], ['End']] },
      { label: 'Recolher ou expandir a seção, no rótulo', alternatives: [['←'], ['→']] },
      { label: 'Abrir', alternatives: [['↵']] },
    ],
  },
  {
    title: 'Documento e desenho',
    rows: [
      { label: 'Fixar ou desafixar', alternatives: [['P']] },
      { label: 'Mover para projeto', alternatives: [['M']] },
    ],
  },
];
