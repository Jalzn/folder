import { Link } from '@tanstack/react-router';
import type { LiveDrawing } from '../../lib/queries/embeds';
import { paths } from '../../router/paths';
import { drawingEmbedView } from './embed-view';
import { useEmbedsContext } from './embeds-context';
import { UnavailableEmbed } from './UnavailableEmbed';

/**
 * The address of a drawing's stored preview, which the server serves with the session cookie and an ETag
 * of the scene's fingerprint (docs/etapas/11-documento-desenho.md, decision 5); the query names the scene, so
 * a new preview is a new address.
 */
export const previewSrc = (drawing: LiveDrawing) =>
  drawing.preview
    ? `/arquivos/desenhos/${encodeURIComponent(drawing.id)}/previa.png?v=${encodeURIComponent(
        drawing.preview.fingerprint ?? `v${drawing.preview.sceneVersion}`,
      )}`
    : null;

/**
 * A drawing embedded in a document: a link to its page, so the middle click and ⌘-click open another tab,
 * with the stored preview in a frame and "Figura n — título" under it; "Abrir ↗" shows on hover and focus.
 * A drawing in the trash or gone shows the unavailable box.
 */
export function DrawingEmbed({ canvasId, blockId }: { canvasId: string; blockId: string }) {
  const embeds = useEmbedsContext();
  if (!embeds)
    return (
      <UnavailableEmbed
        view={{ kind: 'unavailable', text: 'Desenho incorporado', restore: null, remove: false }}
        kind="drawing"
        blockId={blockId}
      />
    );
  const view = drawingEmbedView(embeds.drawings.get(canvasId), embeds.figures.get(blockId) ?? 0, embeds);
  if (view.kind === 'loading')
    return (
      <div className="embed-loading embed-loading--figure" contentEditable={false}>
        <span className="sr-only">Carregando o desenho incorporado…</span>
      </div>
    );
  if (view.kind === 'unavailable') return <UnavailableEmbed view={view} kind="drawing" blockId={blockId} />;
  const { drawing } = view;
  const src = previewSrc(drawing);
  const work = embeds.previews.get(drawing.id);
  // The old image stays while the new one is made; a drawing no preview size holds says to open it.
  const updating =
    work === 'updating' || Boolean(drawing.preview && !drawing.preview.current && work !== 'unavailable');
  const unavailable = work === 'unavailable' || (!src && !updating);
  return (
    <Link
      to={paths.drawing(drawing.project.id, drawing.id)}
      className="embed-figure"
      contentEditable={false}
      aria-label={view.label}
      onClick={(event) => {
        // A plain click goes through the document's own way, which keeps the editor's state in order.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        embeds.actions.openDrawing(drawing);
      }}
    >
      <span className="embed-figure__frame" data-empty={drawing.empty || undefined}>
        {drawing.empty ? (
          <span className="embed-figure__note">Desenho vazio</span>
        ) : unavailable ? (
          <span className="embed-figure__note">Imagem indisponível. Abra o desenho para ver.</span>
        ) : (
          <>
            {src && <img src={src} alt="" width={drawing.preview?.width} height={drawing.preview?.height} />}
            {updating && <span className="embed-figure__note">Atualizando a imagem…</span>}
          </>
        )}
      </span>
      <span className="embed-figure__caption">
        <span>{view.caption}</span>
        <span className="embed-figure__open" aria-hidden="true">
          Abrir ↗
        </span>
      </span>
    </Link>
  );
}
