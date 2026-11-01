import './folder-label.css';
import { ChevronDown, Folder } from 'lucide-react';
import { Button as AriaButton } from 'react-aria-components';
import { useFolders, useProject } from '../../lib/queries';
import { shortcutLabel, Tooltip, TooltipTrigger } from '../../ui';
import { useShellUi } from '../shell-ui';

/** Where "Mover para pasta…" opens from the page: on the label, when the header shows it. */
export const FOLDER_LABEL = 'data-folder-label';

/**
 * The folder of the open document or drawing, on the left of its header (docs/etapas/09-pastas.md, "Onde as
 * pastas aparecem"): the folder's icon and name, or "Sem pasta" at the root, with a chevron on hover. It
 * opens "Mover para pasta…", as M does; in an archived project it is only the text. The header leaves it
 * out below 720 px (decision 16).
 */
export function FolderLabel({ projectId, folderId }: { projectId: string; folderId: string | null }) {
  const ui = useShellUi();
  const archived = Boolean(useProject(projectId)?.archivedAt);
  const folders = useFolders(projectId).data;
  // Until the folders arrive, an item in a folder shows no name rather than a wrong "Sem pasta".
  const name = folderId === null ? 'Sem pasta' : folders?.find((folder) => folder.id === folderId)?.name;
  if (name === undefined) return <span className="folder-label" />;
  const text = (
    <>
      <Folder size={14} aria-hidden="true" />
      <span className="folder-label__name">{name}</span>
    </>
  );
  const place = folderId === null ? 'Sem pasta' : `Pasta ${name}`;
  if (archived)
    return (
      <span className="folder-label" data-archived="">
        {text}
      </span>
    );
  return (
    <TooltipTrigger delay={600} closeDelay={0}>
      <AriaButton
        className="folder-label"
        aria-label={`${place}. Mover para pasta (M)`}
        aria-haspopup="dialog"
        aria-expanded={ui.moveOpen === 'folder'}
        onPress={() => ui.setMoveOpen('folder')}
        {...{ [FOLDER_LABEL]: '' }}
      >
        {text}
        <ChevronDown className="folder-label__chevron" size={12} aria-hidden="true" />
      </AriaButton>
      <Tooltip>
        Mover para pasta
        <span className="tooltip__keys">{shortcutLabel(['M'])}</span>
      </Tooltip>
    </TooltipTrigger>
  );
}
