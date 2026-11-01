import { ChevronDown, Download } from 'lucide-react';
import { Button, Menu, MenuItem, MenuTrigger } from '../../ui';

/**
 * "Exportar ▾" in the drawing's bar (the prototype's `export-menu`): a PNG of what is on screen, or the
 * editable `.excalidraw`, which takes the scene as it is, even with a save pending.
 */
export function ExportMenu({
  exporting,
  onPNG,
  onEditable,
}: {
  exporting: boolean;
  onPNG: () => void;
  onEditable: () => void;
}) {
  return (
    <MenuTrigger>
      <Button icon={<Download size={16} />}>
        Exportar
        <ChevronDown size={14} aria-hidden="true" />
      </Button>
      <Menu aria-label="Exportar" disabledKeys={exporting ? ['png'] : []}>
        <MenuItem id="png" icon={<Download size={16} />} description="Imagem com o conteúdo atual" onAction={onPNG}>
          PNG
        </MenuItem>
        <MenuItem
          id="excalidraw"
          icon={<Download size={16} />}
          description="Mesmo com salvamento pendente"
          onAction={onEditable}
        >
          .excalidraw editável
        </MenuItem>
      </Menu>
    </MenuTrigger>
  );
}
