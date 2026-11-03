import { useLocation } from '@tanstack/react-router';
import { loadNavState } from './nav-store';
import { parseProjectPath, paths } from './paths';

/**
 * The project the current page belongs to: the route's, which item pages keep canonical; in the Perfil, the
 * last place, even archived; elsewhere, none.
 */
export function useCurrentProjectId(installationId: string): string | null {
  const pathname = useLocation({ select: (location) => location.pathname });
  const fromPath = parseProjectPath(pathname)?.projectId;
  if (fromPath) return fromPath;
  if (pathname === paths.profile) return loadNavState(installationId).lastProjectId;
  return null;
}
