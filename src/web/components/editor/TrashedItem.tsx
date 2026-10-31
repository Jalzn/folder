import './editor.css';
import { Link } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { paths } from '../../router/paths';
import { EmptyState } from '../../ui';

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
        <Link to={paths.trash(projectId)} className="btn" data-variant="primary" data-size="md">
          Abrir lixeira
        </Link>
      </EmptyState>
    </div>
  );
}
