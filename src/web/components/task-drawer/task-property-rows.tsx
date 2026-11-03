import type { ComponentProps } from 'react';
import { DueField } from './DueField';
import { LabelsField } from './LabelsField';
import { ColumnField, ProjectField } from './TaskProperties';
export const columnRow = (props: ComponentProps<typeof ColumnField>) => ({
  id: 'column',
  label: 'Coluna',
  value: <ColumnField {...props} />,
});
export const projectRow = (props: ComponentProps<typeof ProjectField>) => ({
  id: 'project',
  label: 'Projeto',
  value: <ProjectField {...props} />,
});
export const dueRow = (props: ComponentProps<typeof DueField>) => ({
  id: 'due',
  label: 'Prazo',
  value: <DueField {...props} />,
});
export const labelsRow = (props: ComponentProps<typeof LabelsField>) => ({
  id: 'labels',
  label: 'Etiquetas',
  value: <LabelsField {...props} />,
});
