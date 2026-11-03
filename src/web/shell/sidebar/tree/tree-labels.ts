import type { NavItem } from '@tinyfold/workspace/domain';
import { countOf, formatCount } from '../../../lib/text/count';
import { displayTitle } from '../../../lib/types';
import type { FolderNode, ItemNode, MoreNode } from './tree-rows';

const nouns: Record<NavItem['type'], string> = { document: 'documento', drawing: 'desenho' };

/** "Visão do produto, documento, fixado", and ", não salvo" when a change waits to be saved. */
export const itemLabel = (node: ItemNode) =>
  `${displayTitle(node.item.title)}, ${nouns[node.item.type]}${node.item.pinnedAt ? ', fixado' : ''}${node.pending ? ', não salvo' : ''}`;

/** "MCP, pasta, 12 itens", then ", 1 item não salvo", and closed over the open item ", contém o item aberto". */
export const folderLabel = (node: FolderNode) =>
  `${node.folder.name}, pasta, ${countOf(node.folder.total, 'item', 'itens')}${
    node.pending ? `, ${countOf(node.pending, 'item não salvo', 'itens não salvos')}` : ''
  }${node.holdsCurrent && !node.expanded ? ', contém o item aberto' : ''}`;

/** "Ver todos os 18 itens de Arquitetura no Índice", or of the project's root. */
export const moreLabel = (node: MoreNode, folderName: string | null) =>
  `Ver todos os ${formatCount(node.count)} itens ${folderName === null ? 'da raiz do projeto' : `de ${folderName}`} no Índice`;
