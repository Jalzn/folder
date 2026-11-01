import type { ItemType } from '../../lib/types';

/** How the editors' messages name each kind of item. */
export interface ItemWords {
  /** "o documento" */
  the: string;
  /** "este documento" */
  this: string;
  /** "um novo documento" */
  aNew: string;
  /** "Documento" */
  capital: string;
}

export const itemWords: Record<ItemType, ItemWords> = {
  document: { the: 'o documento', this: 'este documento', aNew: 'um novo documento', capital: 'Documento' },
  drawing: { the: 'o desenho', this: 'este desenho', aNew: 'um novo desenho', capital: 'Desenho' },
};
