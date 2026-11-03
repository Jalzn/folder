import './items-header.css';
import { Link } from '@tanstack/react-router';
import { Ellipsis, FileText, Folder, FoldVertical, Plus, Shapes } from 'lucide-react';
import { type Ref, useRef } from 'react';
import { isTextDropItem, useDrop } from 'react-aria-components';
import { NAV_SORTS, type NavSort } from '#workspace/domain';
import { formatCount } from '../../lib/text/count';
import type { Project } from '../../lib/types';
import { paths } from '../../navigation/paths';
import { IconButton, Menu, MenuItem, MenuSection, MenuSeparator, MenuTrigger } from '../../ui';
import { useApp } from '../AppProvider';
import type { FolderMoveItem } from '../folders/use-move-to-folder';
import { useShellActions } from '../shell-ui';
import { ITEM_DRAG } from './tree/use-tree-dnd';

const sortLabels: Record<NavSort, string> = { recent: 'Recentes', title: 'A–Z', created: 'Criação' };

/**
 * "Itens n" over the tree: the count opens the Índice; on hover or focus, "+" creates a document, a drawing
 * or a folder in the project (not in an archived one), and "⋯" orders the items and folds every folder.
 */
export function ItemsHeader({
  project,
  total,
  sort,
  hasFolders,
  onSort,
  onCollapseAll,
  onDropToRoot,
  newItemRef,
}: {
  project: Project;
  /** The "+" button, where the focus goes back when a new folder is given up. */
  newItemRef?: Ref<HTMLButtonElement>;
  total: number | undefined;
  sort: NavSort;
  hasFolders: boolean;
  onSort: (sort: NavSort) => void;
  onCollapseAll: () => void;
  /** An item dragged onto the header goes to the root; none in an archived project. */
  onDropToRoot?: ((item: FolderMoveItem) => void) | undefined;
}) {
  const app = useApp();
  const ui = useShellActions();
  const header = useRef<HTMLDivElement>(null);
  const { dropProps, isDropTarget } = useDrop({
    ref: header,
    isDisabled: !onDropToRoot,
    getDropOperation: (types) => (types.has(ITEM_DRAG) ? 'move' : 'cancel'),
    onDrop: async (event) => {
      const dropped = event.items.find(isTextDropItem);
      if (!dropped || !onDropToRoot) return;
      onDropToRoot(JSON.parse(await dropped.getText(ITEM_DRAG)) as FolderMoveItem);
    },
  });
  return (
    <div ref={header} {...dropProps} className="items-header" data-drop-target={isDropTarget || undefined}>
      <span className="items-header__label">Itens</span>
      <span className="items-header__tools">
        {!project.archivedAt && (
          <MenuTrigger>
            <IconButton label="Novo item" size="sm" ref={newItemRef}>
              <Plus size={14} />
            </IconButton>
            <Menu
              aria-label={`Novo em ${project.name}`}
              placement="bottom start"
              onAction={(key) => {
                if (key === 'document') void app.newDocument(project.id);
                else if (key === 'drawing') void app.newCanvas(project.id);
                else ui.startFolder({ projectId: project.id });
              }}
            >
              <MenuItem id="document" icon={<FileText size={16} />}>
                Documento
              </MenuItem>
              <MenuItem id="drawing" icon={<Shapes size={16} />}>
                Desenho
              </MenuItem>
              <MenuItem id="folder" icon={<Folder size={16} />}>
                Pasta
              </MenuItem>
            </Menu>
          </MenuTrigger>
        )}
        <MenuTrigger>
          <IconButton label="Opções de Itens" size="sm">
            <Ellipsis size={14} />
          </IconButton>
          <Menu
            aria-label="Opções de Itens"
            placement="bottom start"
            onAction={(key) => {
              if (key === 'collapse') onCollapseAll();
              else if (NAV_SORTS.includes(key as NavSort)) onSort(key as NavSort);
            }}
          >
            <MenuSection title="Ordenar" selectionMode="single" selectedKeys={[sort]}>
              {NAV_SORTS.map((option) => (
                <MenuItem key={option} id={option}>
                  {sortLabels[option]}
                </MenuItem>
              ))}
            </MenuSection>
            {hasFolders && (
              <>
                <MenuSeparator />
                <MenuItem id="collapse" icon={<FoldVertical size={16} />}>
                  Recolher todas as pastas
                </MenuItem>
              </>
            )}
          </Menu>
        </MenuTrigger>
      </span>
      {total !== undefined && (
        <Link
          to={paths.index(project.id)}
          className="items-header__count"
          aria-label={`${formatCount(total)} itens no Índice`}
        >
          {formatCount(total)}
        </Link>
      )}
    </div>
  );
}
