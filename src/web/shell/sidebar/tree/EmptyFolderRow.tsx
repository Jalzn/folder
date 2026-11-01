import { Button as AriaButton } from 'react-aria-components';

/**
 * "Pasta vazia · + Documento · + Desenho" in an open folder without items, the two links creating in it;
 * → reaches them from the row. In an archived project, only "Pasta vazia".
 */
export function EmptyFolderRow({
  onNewDocument,
  onNewDrawing,
}: {
  onNewDocument?: (() => void) | undefined;
  onNewDrawing?: (() => void) | undefined;
}) {
  return (
    <div className="tree-row__body tree-row__body--empty">
      <span>Pasta vazia</span>
      {onNewDocument && onNewDrawing && (
        <>
          <span aria-hidden="true">·</span>
          <AriaButton className="tree-row__link-button" onPress={onNewDocument}>
            + Documento
          </AriaButton>
          <span aria-hidden="true">·</span>
          <AriaButton className="tree-row__link-button" onPress={onNewDrawing}>
            + Desenho
          </AriaButton>
        </>
      )}
    </div>
  );
}
