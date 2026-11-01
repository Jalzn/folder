import './move-folder.css';
import { searchText } from '@tinyfold/workspace/domain';
import { ArrowRightLeft, Check, Folder, FolderPlus, Layers } from 'lucide-react';
import type { JSX, RefObject } from 'react';
import { Menu as AriaMenu, SearchField as AriaSearchField, Autocomplete, Input } from 'react-aria-components';
import { formatCount } from '../../lib/count';
import { queryWords } from '../../lib/highlight';
import { useFolders } from '../../lib/queries';
import { MenuItem, MenuSeparator, PopoverSurface } from '../../ui';
import { useShellActions } from '../shell-ui';
import { type FolderMoveItem, useMoveToFolder } from './use-move-to-folder';

const ROOT = 'root';
const NEW_FOLDER = 'new-folder';
const OTHER_PROJECT = 'other-project';

/** Every word of the filter, accents and case aside; "Nova pasta…" and "Outro projeto…" always show. */
const matches = (text: string, input: string, key: string | number) =>
  key === NEW_FOLDER || key === OTHER_PROJECT || queryWords(input).every((word) => searchText(text).includes(word));

/**
 * "Mover para pasta…" (docs/interface/pastas.md §2): a filter over "Raiz do projeto" and the folders in their
 * order, the item's place checked, then "Nova pasta…", which names a folder in the sidebar and moves the item
 * into it, and "Outro projeto…".
 */
export function MoveToFolderPopover({
  item,
  triggerRef,
  isOpen,
  onOpenChange,
  onOtherProject,
  onMoved,
}: {
  item: FolderMoveItem;
  triggerRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOtherProject: () => void;
  /** After the item went somewhere else, with where: the tree keeps the focus on it. */
  onMoved?: (folderId: string | null) => void;
}) {
  const ui = useShellActions();
  const folders = useFolders(item.projectId).data ?? [];
  const { move } = useMoveToFolder();
  function choose(key: string) {
    // "Outro projeto…" hands the anchor to the projects' menu, which replaces this one.
    if (key === OTHER_PROJECT) return onOtherProject();
    onOpenChange(false);
    if (key === NEW_FOLDER)
      return ui.startFolder({
        projectId: item.projectId,
        onCreated: (folder) => void move(item, folder).then((moved) => moved && onMoved?.(folder.id)),
      });
    const folder = key === ROOT ? null : (folders.find((each) => each.id === key) ?? null);
    void move(item, folder).then((moved) => moved && onMoved?.(folder?.id ?? null));
  }
  // The item's place shows ✓ in place of its icon, as in the prototype, and says so to a screen reader.
  const here = (folderId: string | null) => item.folderId === folderId;
  const icon = (folderId: string | null, fallback: JSX.Element) =>
    here(folderId) ? <Check className="move-folder__current" size={16} /> : fallback;
  const current = (folderId: string | null) => here(folderId) && <span className="sr-only">, lugar atual</span>;
  return (
    <PopoverSurface
      triggerRef={triggerRef}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="bottom start"
      className="move-folder"
      aria-label="Mover para pasta"
    >
      <Autocomplete filter={(text, input, node) => matches(text, input, node.key)}>
        <AriaSearchField aria-label="Mover para pasta" className="move-folder__filter" autoFocus>
          <Input className="move-folder__input" placeholder="Mover para pasta…" />
        </AriaSearchField>
        <AriaMenu className="menu move-folder__list" aria-label="Pastas" onAction={(key) => choose(String(key))}>
          <MenuItem id={ROOT} textValue="Raiz do projeto" icon={icon(null, <Layers size={16} />)}>
            Raiz do projeto
            {current(null)}
          </MenuItem>
          {folders.map((folder) => (
            <MenuItem
              key={folder.id}
              id={folder.id}
              textValue={folder.name}
              icon={icon(folder.id, <Folder size={16} />)}
              detail={<span className="move-folder__count">{formatCount(folder.items)}</span>}
            >
              {folder.name}
              {current(folder.id)}
            </MenuItem>
          ))}
          <MenuSeparator />
          <MenuItem id={NEW_FOLDER} textValue="Nova pasta" icon={<FolderPlus size={16} />}>
            Nova pasta…
          </MenuItem>
          <MenuItem id={OTHER_PROJECT} textValue="Outro projeto" icon={<ArrowRightLeft size={16} />}>
            Outro projeto…
          </MenuItem>
        </AriaMenu>
      </Autocomplete>
    </PopoverSurface>
  );
}
