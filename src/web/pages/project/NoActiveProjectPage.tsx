import { Plus } from 'lucide-react';
import { useProjects } from '../../lib/queries';
import { StartRedirect } from '../../router/StartRedirect';
import { useApp } from '../../shell';
import { Button, ErrorNotice, PageHeader, Spinner } from '../../ui';
import { emptyStateKind } from './empty-state-kind';

const copy = {
  'first-project': {
    title: 'Comece um projeto',
    description: 'No Tinyfold, documentos, desenhos e tarefas vivem dentro de um projeto.',
  },
  'all-archived': {
    title: 'Nenhum projeto ativo',
    description: 'Crie um projeto ou desarquive um dos arquivados. O conteúdo deles está preservado.',
  },
} as const;

/** `/projetos`: the empty state without an active project; with one, it opens like `/`. */
export function NoActiveProjectPage() {
  const app = useApp();
  const projects = useProjects(true);
  if (projects.isPending)
    return (
      <div className="page">
        <Spinner />
      </div>
    );
  if (projects.error)
    return (
      <div className="page">
        <ErrorNotice error={projects.error} retry={() => void projects.refetch()} />
      </div>
    );
  const kind = emptyStateKind(projects.data);
  if (!kind) return <StartRedirect />;
  return (
    <div className="page">
      <PageHeader title={copy[kind].title} description={copy[kind].description} />
      <Button variant="primary" icon={<Plus size={16} />} onPress={app.openProjectDialog}>
        Novo projeto
      </Button>
    </div>
  );
}
