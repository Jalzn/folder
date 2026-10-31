import { useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { errorCode } from '../lib/api';
import { useCanvas, useDocument, useProjects } from '../lib/queries';
import { ItemNotFound } from '../pages/project/NotFoundPage';
import { PageStatus, useApp } from '../shell';
import { ErrorNotice, Spinner } from '../ui';
import { loadNavState } from './nav-store';
import {
  itemRedirectPath,
  type LegacyAddress,
  listRedirectPath,
  listRedirectProject,
  parseLegacyAddress,
} from './redirects';

function Redirecting({ to, error, retry }: { to: string | null; error?: unknown; retry?: (() => void) | undefined }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (to) void navigate({ href: to, replace: true });
  }, [to, navigate]);
  return <PageStatus>{error ? <ErrorNotice error={error} retry={retry} /> : <Spinner />}</PageStatus>;
}

function ListRedirect({ target }: { target: Extract<LegacyAddress, { kind: 'list' }>['target'] }) {
  const app = useApp();
  const projects = useProjects(true);
  const projectId = projects.data
    ? listRedirectProject(projects.data, loadNavState(app.owner.installationId).lastProjectId)
    : undefined;
  return (
    <Redirecting
      to={projectId === undefined ? null : listRedirectPath(target, projectId)}
      error={projects.error}
      retry={() => void projects.refetch()}
    />
  );
}

function ItemRedirect({
  address,
  item,
}: {
  address: Extract<LegacyAddress, { kind: 'document' | 'drawing' }>;
  item: { data?: { projectId: string | null } | undefined; error: unknown; refetch: () => unknown };
}) {
  if (item.error && errorCode(item.error) === 'NOT_FOUND') return <ItemNotFound type={address.kind} id={address.id} />;
  const projectId = item.data?.projectId;
  return (
    <Redirecting
      to={projectId ? itemRedirectPath(address, projectId) : null}
      error={item.error}
      retry={() => void item.refetch()}
    />
  );
}

function DocumentRedirect({ address }: { address: Extract<LegacyAddress, { kind: 'document' }> }) {
  return <ItemRedirect address={address} item={useDocument(address.id)} />;
}

function DrawingRedirect({ address }: { address: Extract<LegacyAddress, { kind: 'drawing' }> }) {
  return <ItemRedirect address={address} item={useCanvas(address.id)} />;
}

/** The addresses before stage 08: lists open in the last project, items under their own project. */
export function LegacyRedirect() {
  const location = useLocation();
  // Read once: while the redirect runs, the location already shows the new address.
  const [address] = useState(() => parseLegacyAddress(location.pathname, location.search));
  if (!address || address.kind === 'login') return <Redirecting to="/entrar" />;
  if (address.kind === 'list') return <ListRedirect target={address.target} />;
  if (address.kind === 'document') return <DocumentRedirect address={address} />;
  return <DrawingRedirect address={address} />;
}
