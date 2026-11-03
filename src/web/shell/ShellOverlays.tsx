import { type RefObject, useMemo, useRef } from 'react';
import { Dialog as AriaDialog, Modal, ModalOverlay } from 'react-aria-components';
import { LabelsDialog } from '../components/labels/LabelsDialog';
import { useFolders } from '../lib/queries';
import type { Project } from '../lib/types';
import { CommandPalette } from './command-palette/CommandPalette';
import { FOLDER_LABEL } from './folders/FolderLabel';
import { MoveMenus } from './folders/MoveMenus';
import { ShortcutsDialog } from './keyboard/ShortcutsDialog';
import { NewItemPopover } from './project/NewItemMenu';
import { type SwitcherPlace, useShellOverlays } from './shell-ui';
import { ProjectSidebar } from './sidebar/ProjectSidebar';
import { useOpenItem } from './sidebar/use-open-item';
export function ShellOverlays({
  project,
  switcherPlace,
  toggleSidebar,
}: {
  project: Project | null;
  switcherPlace: SwitcherPlace;
  toggleSidebar: () => void;
}) {
  const ui = useShellOverlays();
  const anchor = useRef<HTMLSpanElement>(null);
  const openItem = useOpenItem();
  // N on an item's page offers its folder first, and M opens at the header's folder label when it shows.
  const folders = useFolders(project?.id ?? null).data;
  const itemFolder = folders?.find((folder) => folder.id === openItem?.folderId);
  const moveAnchor = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        return document.querySelector<HTMLElement>(`main [${FOLDER_LABEL}]`) ?? anchor.current;
      },
    }),
    [],
  );

  return (
    <>
      <span ref={anchor} className="app-layout__anchor" aria-hidden="true" />
      <ModalOverlay
        className="sidebar-overlay"
        isOpen={ui.overlay.open}
        onOpenChange={(open) => ui.setOverlay(open)}
        isDismissable
      >
        <Modal className="sidebar-overlay__panel">
          {/* Following a link closes the overlay, the current page's too. */}
          <AriaDialog
            className="sidebar-overlay__dialog"
            aria-label="Navegação"
            onClick={(event) => {
              if ((event.target as Element).closest('a[href]')) ui.setOverlay(false);
            }}
          >
            <ProjectSidebar
              project={project}
              place="overlay"
              collapseLabel="Fechar a barra lateral"
              onCollapse={() => ui.setOverlay(false)}
              focusSearch={ui.overlay.search}
            />
          </AriaDialog>
        </Modal>
      </ModalOverlay>
      <CommandPalette switcherPlace={switcherPlace} toggleSidebar={toggleSidebar} />
      <ShortcutsDialog open={ui.shortcutsOpen} onClose={() => ui.setShortcutsOpen(false)} />
      <LabelsDialog open={ui.labelsOpen} onClose={() => ui.setLabelsOpen(false)} />
      {project && ui.newItemOpen && (
        <NewItemPopover
          project={project}
          folder={itemFolder && { id: itemFolder.id, name: itemFolder.name }}
          taskColumnId={ui.newTaskColumn ?? undefined}
          triggerRef={anchor}
          isOpen
          onOpenChange={(open) => ui.setNewItemOpen(open)}
        />
      )}
      {project && openItem && ui.moveOpen && (
        <MoveMenus
          key={ui.moveOpen}
          item={{
            type: openItem.type,
            id: openItem.id,
            projectId: project.id,
            folderId: openItem.folderId,
            pinned: openItem.pinnedAt !== null,
          }}
          triggerRef={moveAnchor}
          start={ui.moveOpen}
          onClose={() => ui.setMoveOpen(false)}
        />
      )}
    </>
  );
}
