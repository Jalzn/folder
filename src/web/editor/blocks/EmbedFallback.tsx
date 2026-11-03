import type { EmbedKind } from '@tinyfold/workspace/domain';
import { UnavailableEmbed } from './UnavailableEmbed';

const words = {
  task: { title: 'Tarefa incorporada', subject: 'a tarefa incorporada' },
  drawing: { title: 'Desenho incorporado', subject: 'o desenho incorporado' },
};
export function AbsentEmbed({ kind, blockId }: { kind: EmbedKind; blockId: string }) {
  const { title, subject } = words[kind];
  return (
    <UnavailableEmbed
      view={{ kind: 'unavailable', text: title, subject, restore: null, remove: false }}
      kind={kind}
      blockId={blockId}
    />
  );
}
export function EmbedLoading({ kind }: { kind: EmbedKind }) {
  return (
    <div
      className={kind === 'drawing' ? 'embed-loading embed-loading--figure' : 'embed-loading'}
      contentEditable={false}
    >
      <span className="sr-only">Carregando {words[kind].subject}…</span>
    </div>
  );
}
