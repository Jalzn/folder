import './project-dialog.css';
import { useNavigate } from '@tanstack/react-router';
import { defaultProjectColor, PROJECT_COLORS, type ProjectColor } from '@tinyfold/workspace/domain';
import { type FormEvent, useState } from 'react';
import { api } from '../../lib/api';
import { useProjects } from '../../lib/queries';
import type { Project } from '../../lib/types';
import { useAction } from '../../lib/use-action';
import { useRequest } from '../../lib/use-request';
import { paths } from '../../router/paths';
import { Button, Dialog, DialogActions, ProjectMark, RadioChip, RadioGroup, TextField, useToast } from '../../ui';

const projectColorLabels: Record<ProjectColor, string> = {
  violet: 'Violeta',
  ochre: 'Ocre',
  gray: 'Cinza',
  green: 'Verde',
};

/**
 * "Novo projeto" and "Renomear projeto": a name of 1 to 100 characters, repeats allowed, and one of the four
 * mark colours. A new project takes the first colour no active project uses, joins the end of the switcher
 * and opens on its Visão geral.
 */
export function ProjectDialog({ project, onClose }: { project?: Project | undefined; onClose: () => void }) {
  const projects = useProjects(true);
  const navigate = useNavigate();
  const toast = useToast();
  const action = useAction();
  const request = useRequest();
  const activeColors = (projects.data ?? []).filter((item) => !item.archivedAt).map((item) => item.color);
  const [name, setName] = useState(project?.name ?? '');
  const [color, setColor] = useState<ProjectColor>(project?.color ?? defaultProjectColor(activeColors));
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Dê um nome ao projeto.');
      return;
    }
    if (project) {
      const input = { id: project.id, expectedVersion: project.version, name: trimmed, color };
      await action.run(
        () => api.workspace.updateProject({ ...input, requestId: request.for(input) }),
        () => onClose(),
      );
      return;
    }
    const input = { name: trimmed, color };
    await action.run(
      () => api.workspace.createProject({ ...input, requestId: request.for(input) }),
      (created) => {
        onClose();
        toast(`Projeto ${created.name} criado.`);
        void navigate({ href: paths.overview(created.id) });
      },
    );
  }
  return (
    <Dialog title={project ? 'Renomear projeto' : 'Novo projeto'} open onClose={onClose}>
      <form className="project-dialog" onSubmit={(event) => void submit(event)} noValidate>
        <TextField
          label="Nome"
          value={name}
          onChange={(value) => {
            setName(value);
            setError(null);
          }}
          maxLength={100}
          autoFocus
          errorMessage={error}
          inputProps={{ autoComplete: 'off', 'data-1p-ignore': true, 'data-lpignore': 'true' }}
        />
        <RadioGroup label="Cor da marca" value={color} onChange={(value) => setColor(value as ProjectColor)}>
          {PROJECT_COLORS.map((option) => (
            <RadioChip key={option} value={option}>
              <ProjectMark name={name} color={option} />
              {projectColorLabels[option]}
            </RadioChip>
          ))}
        </RadioGroup>
        <DialogActions>
          <Button onPress={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" isPending={action.busy}>
            {project ? 'Salvar' : 'Criar projeto'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
