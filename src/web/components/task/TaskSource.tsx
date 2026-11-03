import './task-source.css';
import { useNavigate } from '@tanstack/react-router';
import { FileText } from 'lucide-react';
import type { Task } from '../../lib/types';
import { paths } from '../../navigation/paths';

type Source = NonNullable<Task['source']>;

function SourceNote({ source }: { source: Source }) {
  if (!source.documentId)
    return <p className="task-source__note">“{source.documentTitle}” foi excluído de vez. O trecho continua aqui.</p>;
  if (!source.available)
    return <p className="task-source__note">O documento está na lixeira. A tarefa continua aqui.</p>;
  if (!source.blockAvailable)
    return <p className="task-source__note">O trecho original foi removido. Você ainda pode abrir o documento.</p>;
  return null;
}

/**
 * Where a task came from: the excerpt it was created from and, for a saved task, a link back to its
 * document, or why the document no longer opens there.
 */
export function TaskSource({
  excerpt,
  source,
  projectId,
  onLeave,
}: {
  excerpt: string;
  source?: Source | null | undefined;
  projectId?: string | undefined;
  onLeave: () => void;
}) {
  const navigate = useNavigate();
  const documentId = source?.available ? source.documentId : null;
  return (
    <section className="task-source" aria-label="Origem">
      <h3 className="task-source__label">Origem</h3>
      <blockquote className="task-source__excerpt">{excerpt}</blockquote>
      {source && documentId && projectId && (
        <button
          type="button"
          className="task-source__link"
          onClick={() => {
            onLeave();
            // The task's project is the best guess; the document page moves to its own if it differs.
            void navigate({
              href: paths.document(projectId, documentId, source.blockId ?? undefined),
            });
          }}
        >
          <FileText size={14} aria-hidden="true" />
          {source.documentTitle}
        </button>
      )}
      {source && <SourceNote source={source} />}
    </section>
  );
}
