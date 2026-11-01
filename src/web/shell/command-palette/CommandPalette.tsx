import './command-palette.css';
import { Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { Menu as AriaMenu, Autocomplete, Dialog, Input, Modal, ModalOverlay, TextField } from 'react-aria-components';
import { Kbd, MenuSection } from '../../ui';
import { type SwitcherPlace, useShellUi } from '../shell-ui';
import { availableCommands } from './commands';
import { PaletteRow } from './PaletteRow';
import { rowIcon, rowRight } from './palette-row-content';
import { paletteSections } from './palette-sections';
import { useHereActions } from './use-here-actions';
import { usePaletteActions } from './use-palette-actions';
import { usePaletteContext } from './use-palette-context';
import { usePaletteData } from './use-palette-data';
import { usePaletteFocus } from './use-palette-focus';

interface PaletteProps {
  switcherPlace: SwitcherPlace;
  toggleSidebar: () => void;
}

/**
 * ⌘K: search and commands (docs/etapas/08-fundacao.md, "Buscar e ⌘K"). Neste item acts on the open page;
 * Itens searches every project, the eight edited last without text; Projetos, Pastas and Comandos filter
 * here.
 */
export function CommandPalette(props: PaletteProps) {
  const ui = useShellUi();
  const open = ui.palette !== null;
  return (
    <ModalOverlay
      className="palette-overlay"
      isOpen={open}
      onOpenChange={(value) => !value && ui.closePalette()}
      isDismissable
    >
      <Modal className="palette">
        <Dialog className="palette__dialog" aria-label="Buscar e comandar">
          {open && <PaletteBody {...props} initial={ui.palette ?? ''} />}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

/** The field and the sections (palette-sections.ts), each row run after the palette closes. */
function PaletteBody({ initial, switcherPlace, toggleSidebar }: PaletteProps & { initial: string }) {
  const ui = useShellUi();
  const { context, project, projects, item, pinned } = usePaletteContext();
  const [query, setQuery] = useState(initial);
  const { results, searching, folders } = usePaletteData(query);
  const here = useHereActions({ item, project, pinned });
  const run = usePaletteActions({ here, project, projects, switcherPlace, toggleSidebar });
  const sections = paletteSections({
    query,
    here,
    results,
    projects,
    folders,
    commands: availableCommands(context),
  });
  const rows = new Map(sections.flatMap((section) => section.rows.map((row) => [row.key, row] as const)));
  // Items found for an earlier text stay in place, dimmed, until this text's answer: they take no highlight and
  // run nothing, so a command typed at once is what Enter runs.
  const stale = searching ? (sections.find((section) => section.id === 'items')?.rows.map((row) => row.key) ?? []) : [];
  const list = useRef<HTMLDivElement>(null);
  function choose(key: string) {
    const row = rows.get(key);
    if (!row) return;
    // The palette closes first, so what the action opens gets the focus.
    ui.closePalette();
    requestAnimationFrame(() => run(row.action));
  }
  const { onKeyDownCapture } = usePaletteFocus({
    list,
    rows: [...rows.keys()],
    usable: [...rows.keys()].filter((key) => !stale.includes(key)),
    typed: query.trim() !== '',
    onRun: choose,
  });

  return (
    <Autocomplete inputValue={query} onInputChange={setQuery}>
      <TextField aria-label="Buscar ou comandar" className="palette__field" autoFocus>
        <Search size={16} aria-hidden="true" />
        <Input
          className="palette__input"
          placeholder="Buscar itens, projetos e comandos…"
          onKeyDownCapture={onKeyDownCapture}
        />
      </TextField>
      <AriaMenu
        ref={list}
        className="palette__list"
        aria-label="Resultados"
        onAction={(key) => choose(String(key))}
        disabledKeys={stale}
        renderEmptyState={() => (searching ? null : <p className="palette__empty">Nada encontrado.</p>)}
      >
        {sections.map((section) => (
          <MenuSection key={section.id} title={section.title}>
            {section.rows.map((row) => (
              <PaletteRow
                key={row.key}
                id={row.key}
                icon={rowIcon(row, here, projects)}
                label={row.label}
                note={row.note}
                query={query}
                archived={row.archived ?? false}
                excerpt={row.excerpt}
                right={rowRight(row, projects)}
                shortcut={row.shortcut}
              />
            ))}
          </MenuSection>
        ))}
      </AriaMenu>
      <footer className="palette__footer" aria-hidden="true">
        <span>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> navegar
        </span>
        <span>
          <Kbd>↵</Kbd> abrir
        </span>
        <span>
          <Kbd>esc</Kbd> fechar
        </span>
      </footer>
    </Autocomplete>
  );
}
