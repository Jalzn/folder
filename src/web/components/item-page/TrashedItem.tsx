import './editor.css';
import { Trash2 } from 'lucide-react';
import { paths } from '../../navigation/paths';
import { ButtonLink, EmptyState } from '../../ui';

/** An item opened while it is in the trash: what happened and the way to the project's trash. */
export function TrashedItem({
  title,
  description,
  projectId,
}: {
  title: string;
  description: string;
  projectId: string;
}) {
  return (
    <div className="trashed-item">
      <EmptyState icon={<Trash2 size={24} />} title={title} description={description}>
        <ButtonLink to={paths.trash(projectId)} variant="primary">
          Abrir lixeira
        </ButtonLink>
      </EmptyState>
    </div>
  );
}
