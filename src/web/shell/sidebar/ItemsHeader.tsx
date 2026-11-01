import './items-header.css';
import { Link } from '@tanstack/react-router';
import { NAV_SORTS, type NavSort } from '@tinyfold/workspace/domain';
import { Ellipsis, FileText, FoldVertical, Plus, Shapes } from 'lucide-react';
import { formatCount } from '../../lib/count';
import type { Project } from '../../lib/types';
import { paths } from '../../router/paths';
import { IconButton, Menu, MenuItem, MenuSection, MenuSeparator, MenuTrigger } from '../../ui';
import { useApp } from '../AppProvider';

const sortLabels: Record<NavSort, string> = { recent: 'Recentes', title: 'A–Z', created: 'Criação' };

/**
 * "Itens n" over the tree: the count opens the Índice; on hover or focus, "+" creates a document or a drawing
 * in the project (not in an archived one), and "⋯" orders the items and folds every folder.
 */
export function ItemsHeader({
  project,
  total,
  sort,
  hasFolders,
  onSort,
  onCollapseAll,
}: {
  project: Project;
  total: number | undefined;
  sort: NavSort;
  hasFolders: boolean;
  onSort: (sort: NavSort) => void;
  onCollapseAll: () => void;
}) {
  const app = useApp();
  return (
    <div className="items-header">
      <span className="items-header__label">Itens</span>
      <span className="items-header__tools">
        {!project.archivedAt && (
          <MenuTrigger>
            <IconButton label="Novo item" size="sm">
              <Plus size={14} />
            </IconButton>
            <Menu
              aria-label={`Novo em ${project.name}`}
              placement="bottom start"
              onAction={(key) => void (key === 'document' ? app.newDocument(project.id) : app.newCanvas(project.id))}
            >
              <MenuItem id="document" icon={<FileText size={16} />}>
                Documento
              </MenuItem>
              <MenuItem id="drawing" icon={<Shapes size={16} />}>
                Desenho
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
