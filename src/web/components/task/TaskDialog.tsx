import './task-dialog.css';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Label, TextArea, TextField } from 'react-aria-components';
import { useProjects } from '../../lib/queries';
import { TASK_STATUSES, type Task, type TaskStatus, taskStatusLabels } from '../../lib/types';
import { AlertDialog, Button, Dialog, DialogActions, IconButton, ProjectMark, Select } from '../../ui';
import { TaskSource } from './TaskSource';
import { type TaskFormInput, useTaskForm } from './use-task-form';

const statusOptions = TASK_STATUSES.map((status) => ({ id: status, label: taskStatusLabels[status] }));

/** The projects a task can go to: the active ones, and its own while it is archived. Never none. */
function useProjectOptions(current: string | null) {
  const projects = useProjects(true).data ?? [];
  return projects
    .filter((project) => !project.archivedAt || project.id === current)
    .map((project) => ({
      id: project.id,
      label: project.archivedAt ? `${project.name} (arquivado)` : project.name,
      icon: <ProjectMark name={project.name} color={project.color} />,
    }));
}

/**
 * A task's dialog: create one, from a document's selection or not, or edit its title, column and project,
 * or delete it. The stage 10 drawer replaces it in the same place.
 */
export function TaskDialog(props: TaskFormInput & { task?: Task | undefined }) {
  const { open, onClose, task, source } = props;
  const form = useTaskForm(props);
  const [discarding, setDiscarding] = useState(false);
  // Esc, the close button and a click outside never throw away what was typed without asking.
  const requestClose = () => (form.dirty && !form.busy ? setDiscarding(true) : onClose());
  const projectOptions = useProjectOptions(form.projectId);
  const excerpt = task?.source?.excerpt ?? source?.excerpt;
  return (
    <Dialog title={task ? 'Detalhes da tarefa' : 'Um próximo passo'} open={open} onClose={requestClose}>
      <form
        className="task-dialog"
        onSubmit={(event) => {
          event.preventDefault();
          void form.submit();
        }}
      >
        <TextField
          className="text-field"
          value={form.title}
          onChange={form.setTitle}
          maxLength={300}
          isRequired
          autoFocus
        >
          <Label className="text-field__label">Título da tarefa</Label>
          <TextArea className="input task-dialog__title" rows={2} placeholder="Ex.: Organizar as referências" />
        </TextField>
        <div className="task-dialog__fields">
          {task && (
            <Select<TaskStatus> label="Estado" options={statusOptions} value={form.status} onChange={form.setStatus} />
          )}
          {form.projectId && projectOptions.length > 0 && (
            <Select label="Projeto" options={projectOptions} value={form.projectId} onChange={form.setProjectId} />
          )}
        </div>
        {excerpt && (
          <TaskSource excerpt={excerpt} source={task?.source} projectId={task?.projectId} onLeave={onClose} />
        )}
        {form.error && (
          <p className="task-dialog__error" role="alert">
            {form.error}
          </p>
        )}
        {form.confirmDelete ? (
          <div className="task-dialog__confirm">
            <p>Excluir esta tarefa? O texto do documento será preservado.</p>
            <DialogActions>
              <Button onPress={() => form.setConfirmDelete(false)}>Manter tarefa</Button>
              <Button variant="danger" isPending={form.busy} onPress={() => void form.remove()}>
                Excluir tarefa
              </Button>
            </DialogActions>
          </div>
        ) : (
          <DialogActions>
            {task && (
              <IconButton
                label="Excluir tarefa"
                className="task-dialog__delete"
                onPress={() => form.setConfirmDelete(true)}
              >
                <Trash2 size={16} />
              </IconButton>
            )}
            <Button onPress={onClose}>Cancelar</Button>
            <Button type="submit" variant="primary" isPending={form.busy} isDisabled={!form.title.trim()}>
              {task ? 'Salvar tarefa' : 'Criar tarefa'}
            </Button>
          </DialogActions>
        )}
      </form>
      <AlertDialog
        open={discarding}
        title="Descartar alterações?"
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        onClose={() => setDiscarding(false)}
        onConfirm={() => {
          setDiscarding(false);
          onClose();
        }}
      >
        <p>O que você mudou nesta tarefa não foi salvo.</p>
      </AlertDialog>
    </Dialog>
  );
}
