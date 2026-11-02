import { ArrowDown, ArrowUp, Ellipsis, FileText, FolderX, Pencil, Plus, Shapes, Trash2 } from 'lucide-react';
import { IconButton, Menu, MenuItem, MenuSection, MenuSeparator, MenuTrigger } from '../../ui';
import { KEYS } from '../keyboard/keys';

export type FolderMenuAction = 'rename' | 'up' | 'down' | 'delete' | 'delete-with-items';

/**
 * The "+" and "⋯" of a folder's row, shown on hover or focus in place of its count: "Novo em MCP" creates a
 * document or a drawing in it, and the ⋯ renames, reorders and deletes it. ⇧F10 or the Menu key open the ⋯.
 */
export function FolderTools({
  name,
  hasItems,
  first,
  last,
  menuOpen,
  onMenuOpenChange,
  onNew,
  onAction,
}: {
  name: string;
  hasItems: boolean;
  first: boolean;
  last: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onNew: (kind: 'document' | 'drawing') => void;
  onAction: (action: FolderMenuAction) => void;
}) {
  const disabled = [...(first ? ['up'] : []), ...(last ? ['down'] : [])];
  return (
    <span className="folder-tools">
      <MenuTrigger>
        <IconButton label={`Novo em ${name}`} size="sm" excludeFromTabOrder>
          <Plus size={14} />
        </IconButton>
        <Menu
          aria-label={`Novo em ${name}`}
          placement="bottom start"
          onAction={(key) => onNew(key as 'document' | 'drawing')}
        >
          <MenuSection title={`Novo em ${name}`}>
            <MenuItem id="document" icon={<FileText size={16} />}>
              Documento
            </MenuItem>
            <MenuItem id="drawing" icon={<Shapes size={16} />}>
              Desenho
            </MenuItem>
          </MenuSection>
        </Menu>
      </MenuTrigger>
      <MenuTrigger isOpen={menuOpen} onOpenChange={onMenuOpenChange}>
        <IconButton label={`Opções da pasta ${name}`} size="sm" excludeFromTabOrder>
          <Ellipsis size={14} />
        </IconButton>
        <Menu
          aria-label={`Opções da pasta ${name}`}
          placement="bottom start"
          disabledKeys={disabled}
          onAction={(key) => onAction(key as FolderMenuAction)}
        >
          <MenuItem id="rename" icon={<Pencil size={16} />} shortcut={KEYS.rename}>
            Renomear
          </MenuItem>
          <MenuItem id="up" icon={<ArrowUp size={16} />} shortcut={KEYS.moveUp}>
            Mover para cima
          </MenuItem>
          <MenuItem id="down" icon={<ArrowDown size={16} />} shortcut={KEYS.moveDown}>
            Mover para baixo
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            id="delete"
            icon={<FolderX size={16} />}
            {...(hasItems ? { description: 'Os itens vão para a raiz' } : {})}
          >
            Excluir pasta
          </MenuItem>
          {hasItems && (
            <MenuItem id="delete-with-items" icon={<Trash2 size={16} />} danger>
              Excluir pasta e itens…
            </MenuItem>
          )}
        </Menu>
      </MenuTrigger>
    </span>
  );
}
