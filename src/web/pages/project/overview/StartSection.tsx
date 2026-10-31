import { Plus } from 'lucide-react';
import { useApp } from '../../../shell';
import { Button } from '../../../ui';

/** Começar, for a project with nothing in it yet: one button per kind of item. */
export function StartSection({ projectId }: { projectId: string }) {
  const app = useApp();
  const plus = <Plus size={16} />;
  return (
    <section className="project-section" aria-labelledby="overview-start">
      <h2 className="project-section__label" id="overview-start">
        Começar
      </h2>
      <p className="project-empty">Este projeto está vazio.</p>
      <div className="project-actions">
        <Button icon={plus} isPending={app.creatingDocument} onPress={() => void app.newDocument(projectId)}>
          Documento
        </Button>
        <Button icon={plus} isPending={app.creatingCanvas} onPress={() => void app.newCanvas(projectId)}>
          Desenho
        </Button>
        <Button icon={plus} onPress={() => app.newTask(projectId)}>
          Tarefa
        </Button>
      </div>
    </section>
  );
}
