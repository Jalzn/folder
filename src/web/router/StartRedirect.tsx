import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { queryClient } from '../lib/api';
import { canvasQuery, documentQuery, useProjects } from '../lib/queries';
import type { ItemType, Project } from '../lib/types';
import { PageStatus, useApp } from '../shell';
import { ErrorNotice, Spinner } from '../ui';
import { loadNavState } from './nav-store';
import { isAppPath, parseProjectPath, paths } from './paths';
import { scheduleScrollRestore } from './scroll';
import { resolveStartPath, type StartLocation } from './start-path';

/** Whether an item can still open: a path to one deleted for good or in the trash is dropped silently. */
async function itemIsOpen(type: ItemType, id: string) {
  try {
    const item =
      type === 'document'
        ? await queryClient.fetchQuery(documentQuery(id))
        : await queryClient.fetchQuery(canvasQuery(id));
    return !item.deletedAt;
  } catch {
    return false;
  }
}

async function startLocation(installationId: string, projects: Project[]): Promise<StartLocation> {
  const start = resolveStartPath(loadNavState(installationId), projects);
  // A stored path is checked when it is read; this keeps anything else from leaving the app.
  if (!isAppPath(start.path)) return { path: paths.noProject, scrollTop: 0 };
  const place = parseProjectPath(start.path);
  if (!place?.item || (await itemIsOpen(place.item.type, place.item.id))) return start;
  return { path: paths.overview(place.projectId), scrollTop: 0 };
}

/** `/`: continues in the last project, on its last page and scroll position. */
export function StartRedirect() {
  const app = useApp();
  const projects = useProjects(true);
  const navigate = useNavigate();
  const installationId = app.owner.installationId;
  useEffect(() => {
    if (!projects.data) return;
    let current = true;
    void startLocation(installationId, projects.data).then(({ path, scrollTop }) => {
      if (!current) return;
      scheduleScrollRestore(path, scrollTop);
      void navigate({ href: path, replace: true });
    });
    return () => {
      current = false;
    };
  }, [projects.data, installationId, navigate]);
  return (
    <PageStatus>
      {projects.error ? (
        <ErrorNotice error={projects.error} retry={() => void projects.refetch()} />
      ) : (
        <Spinner label="Abrindo seu espaço…" />
      )}
    </PageStatus>
  );
}
