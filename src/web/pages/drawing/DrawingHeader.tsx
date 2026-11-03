import { ArrowUpFromLine } from 'lucide-react';
import type { IsoInstant } from '#core/domain';
import { SaveState, useEdited } from '../../components/item-page';
import type { SaveStatus } from '../../lib/autosave';
import { ItemMenu } from '../../shell';
import { KEYS } from '../../shell/keyboard';
import { ExportMenu } from './ExportMenu';

/**
 * The actions of the drawing's bar, right of its folder (docs/etapas/11-documento-desenho.md, "Página do
 * desenho"): the save state, "Exportar ▾", and the ⋯ with "Importar .excalidraw" over the item menu.
 */
export function DrawingHeader({
  canvas,
  projectId,
  status,
  trashed,
  files,
  onRetry,
  onImport,
  onTrash,
}: {
  canvas: { id: string; folderId: string | null; pinnedAt: IsoInstant | null; updatedAt: IsoInstant };
  projectId: string;
  status: SaveStatus;
  /** In the trash, the drawing shows no save state: nothing is sent, and its band says why. */
  trashed: boolean;
  files: { exporting: boolean; importing: boolean; exportPNG: () => void; exportEditable: () => void };
  onRetry: () => void;
  onImport: () => void;
  onTrash: () => void;
}) {
  const edited = useEdited(canvas.updatedAt);
  return (
    <>
      {!trashed && <SaveState status={status} edited={edited} onRetry={onRetry} retryKeys={KEYS.save} />}
      <ExportMenu exporting={files.exporting} onPNG={files.exportPNG} onEditable={files.exportEditable} />
      <ItemMenu
        type="drawing"
        id={canvas.id}
        projectId={projectId}
        folderId={canvas.folderId}
        pinned={Boolean(canvas.pinnedAt)}
        onTrash={onTrash}
        actions={[
          {
            id: 'import',
            label: 'Importar .excalidraw',
            icon: <ArrowUpFromLine size={16} />,
            description: 'Cria outro desenho',
            action: onImport,
            disabled: files.importing,
          },
        ]}
      />
    </>
  );
}
