import { queryClient } from '../../lib/api';
import { projectsQuery } from '../../lib/queries';
import { loadNavState } from '../../router/nav-store';
import { useApp } from '../AppProvider';
import { copyDestination } from './copy-destination';

/**
 * Finds where a copy or import of an item goes, from the projects as the server has them now and the
 * projects this device opened (copy-destination.ts).
 */
export function useCopyDestination() {
  const installationId = useApp().owner.installationId;
  return async (ownProjectId: string | null) => {
    const projects = await queryClient.fetchQuery({ ...projectsQuery(true), staleTime: 0 });
    return { destination: copyDestination(projects, ownProjectId, loadNavState(installationId)), projects };
  };
}
