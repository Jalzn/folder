import { Plus } from 'lucide-react';
import { type RefObject, useEffect, useState } from 'react';
import { Menu as AriaMenu, SearchField as AriaSearchField, Autocomplete, Input } from 'react-aria-components';
import { type SearchResult, useProjects, useSearch } from '../lib/queries';
import { displayTitle } from '../lib/types';
import { MenuItem, MenuSection, PopoverSurface, ProjectMark } from '../ui';
import type { EmbedKind } from './insert-menu';

const NEW = 'new';

const words: Record<EmbedKind, { label: string; create: string; existing: string; empty: string }> = {
  task: {
    label: 'Incorporar tarefa',
    create: 'Nova tarefa…',
    existing: 'Incorporar tarefa existente',
    empty: 'Nenhuma tarefa encontrada.',
  },
  drawing: {
    label: 'Incorporar desenho',
    create: 'Novo desenho',
    existing: 'Incorporar desenho existente',
    empty: 'Nenhum desenho encontrado.',
  },
};

/**
 * The live items a document can embed, by the search: the document's project first, then the other active
 * projects' (docs/etapas/11-documento-desenho.md, user decision 1); recent ones before anything is typed.
 */
export function pickerItems(own: readonly SearchResult[], all: readonly SearchResult[], projectId: string) {
  const seen = new Set(own.map((item) => item.id));
  const others = all.filter((item) => item.projectId !== projectId && !item.projectArchived && !seen.has(item.id));
  return [...own.filter((item) => !item.projectArchived), ...others];
}

/**
 * The embed picker of the `/` menu (docs/etapas/11-documento-desenho.md, "Menu /"): a popover on the block,
 * with the search field, "Nova tarefa…" or "Novo desenho", and the existing items, the other projects' with
 * their mark and name on the right. The field keeps its keys; Esc closes it and the cursor goes back.
 */
export function EmbedPicker({
  kind,
  projectId,
  triggerRef,
  onClose,
  onNew,
  onPick,
}: {
  kind: EmbedKind;
  projectId: string;
  triggerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onNew: () => void;
  onPick: (item: SearchResult) => void;
}) {
  const [text, setText] = useState('');
  const type = kind === 'task' ? 'task' : 'drawing';
  const own = useSearch({ query: text, types: [type], projectId, limit: 20 });
  const all = useSearch({ query: text, types: [type], limit: 20 });
  const projects = useProjects(true).data ?? [];
  // The list changes once per text, when both searches answered it: an arrow already pressed stays where it
  // went, instead of the list moving under it as the second answer comes.
  const answered = own.answers !== null && own.answers === all.answers;
  const [items, setItems] = useState<SearchResult[]>([]);
  useEffect(() => {
    if (answered) setItems(pickerItems(own.data?.items ?? [], all.data?.items ?? [], projectId));
  }, [answered, own.data, all.data, projectId]);
  const say = words[kind];
  return (
    <PopoverSurface
      triggerRef={triggerRef}
      isOpen
      onOpenChange={(open) => !open && onClose()}
      placement="bottom start"
      className="embed-picker"
      aria-label={say.label}
    >
      {/* No filter: the search already matched every word, and the list shows what it answered. */}
      <Autocomplete inputValue={text} onInputChange={setText}>
        <AriaSearchField aria-label={say.label} className="embed-picker__filter" autoFocus>
          <Input className="embed-picker__input" placeholder={kind === 'task' ? 'Buscar tarefa' : 'Buscar desenho'} />
        </AriaSearchField>
        <AriaMenu
          className="menu embed-picker__list"
          aria-label={say.label}
          onAction={(key) => {
            if (key === NEW) return onNew();
            const item = items.find((each) => each.id === key);
            if (item) onPick(item);
          }}
        >
          <MenuSection>
            <MenuItem id={NEW} textValue={say.create} icon={<Plus size={16} />}>
              {say.create}
            </MenuItem>
          </MenuSection>
          <MenuSection title={say.existing}>
            {items.length ? (
              items.map((item) => {
                const project =
                  item.projectId === projectId ? null : projects.find((each) => each.id === item.projectId);
                return (
                  <MenuItem
                    key={item.id}
                    id={item.id}
                    textValue={displayTitle(item.title)}
                    detail={
                      project ? (
                        <span className="embed-picker__project">
                          <ProjectMark name={project.name} color={project.color} size={16} />
                          <span className="embed-picker__project-name">{project.name}</span>
                        </span>
                      ) : undefined
                    }
                  >
                    {displayTitle(item.title)}
                  </MenuItem>
                );
              })
            ) : (
              <MenuItem id="none" isDisabled textValue={say.empty}>
                {answered ? say.empty : 'Buscando…'}
              </MenuItem>
            )}
          </MenuSection>
        </AriaMenu>
      </Autocomplete>
    </PopoverSurface>
  );
}
