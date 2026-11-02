import { Ban } from 'lucide-react';
import { Button } from '../../ui';
import type { UnavailableView } from './embed-view';
import { useEmbedsContext } from './embeds-context';

/**
 * An embed whose item is in the trash or gone (docs/etapas/11-documento-desenho.md, "Indisponível"): a
 * dashed box with what happened, and Restaurar, which puts the item back, and Remover, which takes the
 * block out of the document, each named with the item ("Remover “título”"). A document that only reads
 * offers neither.
 */
export function UnavailableEmbed({
  view,
  kind,
  blockId,
}: {
  view: UnavailableView;
  kind: 'task' | 'drawing';
  blockId: string;
}) {
  const embeds = useEmbedsContext();
  const restore = view.restore;
  return (
    <div className="embed-missing" contentEditable={false}>
      <Ban size={16} aria-hidden="true" />
      <span className="embed-missing__text">{view.text}</span>
      {embeds && restore && (
        <Button
          size="sm"
          variant="ghost"
          aria-label={`Restaurar ${view.subject}`}
          onPress={() => embeds.actions.restore(kind, restore, blockId)}
        >
          Restaurar
        </Button>
      )}
      {embeds && view.remove && (
        <Button
          size="sm"
          variant="ghost"
          aria-label={`Remover ${view.subject}`}
          onPress={() => embeds.actions.remove(blockId)}
        >
          Remover
        </Button>
      )}
    </div>
  );
}
