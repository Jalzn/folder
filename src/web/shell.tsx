import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import {
  ArrowRight,
  ChevronDown,
  FileText,
  Folder,
  Home,
  LayoutGrid,
  LoaderCircle,
  Menu as MenuIcon,
  PenTool,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { createContext, type FormEvent, useContext, useEffect, useRef, useState } from 'react';
import { api, errorCode, errorMessage, queryClient } from './lib/api';
import { useProjects } from './lib/queries';
import { useAction } from './lib/use-action';
import { useRequest } from './lib/use-request';
import { Dialog, ErrorNotice, Logo, Spinner } from './ui';

interface Owner {
  name: string;
  installationId: string;
}
interface AppContextValue {
  owner: Owner;
  newDocument: (projectId?: string | null) => Promise<void>;
  newCanvas: (projectId?: string | null) => Promise<void>;
  openProjectDialog: () => void;
  creatingDocument: boolean;
  creatingCanvas: boolean;
}
const AppContext = createContext<AppContextValue | null>(null);
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('Contexto do aplicativo indisponível');
  return value;
}

function LoginForm({ expired = false, onSuccess }: { expired?: boolean; onSuccess: (owner: Owner) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.auth.login({ password });
      setPassword('');
      onSuccess(result.owner);
    } catch (e) {
      setError(errorCode(e) === 'UNAUTHENTICATED' ? 'Essa senha não está correta. Tente novamente.' : errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="login-form" onSubmit={submit}>
      {!expired && (
        <>
          <Logo />
          <div className="login-intro">
            <span className="eyebrow">SEU ESPAÇO PESSOAL</span>
            <h1>
              Ideias ganham
              <br />
              um lugar.
            </h1>
            <p>
              Escreva livremente.
              <br />
              Organize no seu tempo.
            </p>
          </div>
        </>
      )}
      {expired && <p className="muted">Seu rascunho está preservado. Entre novamente para continuar de onde parou.</p>}
      <label className="field">
        Sua senha
        <input
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          placeholder="Digite sua senha"
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary login-submit" disabled={busy} type="submit">
        {busy ? <LoaderCircle size={17} className="spin" /> : <ArrowRight size={17} />}{' '}
        {busy ? 'Entrando…' : 'Entrar no Tinyfold'}
      </button>
      {!expired && <p className="login-footnote">Um pouco de espaço para pensar melhor.</p>}
    </form>
  );
}

export function Shell() {
  const session = useQuery({
    queryKey: ['session'],
    queryFn: () => api.auth.session(),
    retry: false,
    staleTime: 60_000,
  });
  const [owner, setOwner] = useState<Owner | null>(null);
  const [expired, setExpired] = useState(false);
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (session.data) {
      setOwner(session.data.owner);
      setExpired(false);
    }
  }, [session.data]);
  useEffect(() => {
    const handler = () => setExpired(true);
    window.addEventListener('tinyfold:session-expired', handler);
    return () => window.removeEventListener('tinyfold:session-expired', handler);
  }, []);
  useEffect(() => {
    const handler = () => {
      setOwner(null);
      setExpired(false);
      queryClient.clear();
      void queryClient.invalidateQueries({ queryKey: ['session'] });
    };
    window.addEventListener('tinyfold:logout', handler);
    return () => window.removeEventListener('tinyfold:logout', handler);
  }, []);
  function loggedIn(value: Owner) {
    setOwner(value);
    setExpired(false);
    void queryClient.invalidateQueries();
    if (path === '/login') void navigate({ to: '/' });
  }
  if (!owner && session.isPending)
    return (
      <div className="full-page-center">
        <Logo />
        <Spinner label="Abrindo seu espaço…" />
      </div>
    );
  if (
    !owner &&
    session.error &&
    !['UNAUTHENTICATED', 'UNAUTHORIZED'].includes(errorCode(session.error) ?? '') &&
    !expired
  )
    return (
      <div className="full-page-center">
        <Logo />
        <ErrorNotice error={session.error} retry={() => void session.refetch()} />
      </div>
    );
  if (!owner)
    return (
      <main className="login-page">
        <div className="login-art" aria-hidden="true">
          <div className="fold fold-one" />
          <div className="fold fold-two" />
          <div className="fold fold-three" />
          <span className="login-art-caption">PENSE. ESCREVA. FAÇA.</span>
        </div>
        <LoginForm onSuccess={loggedIn} />
      </main>
    );
  return (
    <>
      <AuthenticatedShell owner={owner} />
      <Dialog title="Vamos continuar?" open={expired} onClose={() => undefined} dismissable={false}>
        <LoginForm expired onSuccess={loggedIn} />
      </Dialog>
    </>
  );
}

function AuthenticatedShell({ owner }: { owner: Owner }) {
  const projects = useProjects();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchKind, setSearchKind] = useState<'documents' | 'canvases'>('documents');
  const navigation = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const createAction = useAction();
  const canvasAction = useAction();
  const projectAction = useAction();
  const createRequest = useRequest();
  const canvasRequest = useRequest();
  const projectRequest = useRequest();
  const previousPath = useRef(pathname);
  useEffect(() => {
    if (previousPath.current !== pathname) {
      setMobileOpen(false);
      previousPath.current = pathname;
    }
  }, [pathname]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        if (event.defaultPrevented || (event.target instanceof Element && event.target.closest('.excalidraw'))) return;
        event.preventDefault();
        setSearchKind(pathname.startsWith('/desenhos') ? 'canvases' : 'documents');
        setSearchOpen(true);
      }
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [pathname]);
  async function newDocument(projectId: string | null = null) {
    const input = { projectId };
    await createAction.run(
      () => api.workspace.createDocument({ ...input, requestId: createRequest.for(input) }),
      (doc) => {
        createRequest.clear();
        void navigation({ to: '/documentos/$documentId', params: { documentId: doc.id } });
      },
    );
  }
  async function newCanvas(projectId: string | null = null) {
    const input = { projectId };
    await canvasAction.run(
      () => api.workspace.createCanvas({ ...input, requestId: canvasRequest.for(input) }),
      (canvas) => {
        canvasRequest.clear();
        void navigation({ to: '/desenhos/$canvasId', params: { canvasId: canvas.id } });
      },
    );
  }
  function openSearch() {
    setSearchKind(pathname.startsWith('/desenhos') ? 'canvases' : 'documents');
    setSearchOpen(true);
  }
  async function createProject(event: FormEvent) {
    event.preventDefault();
    const input = { name: projectName.trim() };
    if (!input.name) return;
    await projectAction.run(
      () => api.workspace.createProject({ ...input, requestId: projectRequest.for(input) }),
      (project) => {
        projectRequest.clear();
        setProjectOpen(false);
        setProjectName('');
        void navigation({ to: '/projetos/$projectId', params: { projectId: project.id } });
      },
    );
  }
  return (
    <AppContext.Provider
      value={{
        owner,
        newDocument,
        newCanvas,
        openProjectDialog: () => setProjectOpen(true),
        creatingDocument: createAction.busy,
        creatingCanvas: canvasAction.busy,
      }}
    >
      <div className="app-shell">
        <header className="mobile-header" inert={mobileOpen}>
          <button
            type="button"
            className="icon-button"
            aria-label="Abrir navegação"
            onClick={() => setMobileOpen(true)}
          >
            <MenuIcon size={21} />
          </button>
          <Link to="/" aria-label="Tinyfold, início">
            <Logo compact />
          </Link>
          <button type="button" className="icon-button" aria-label="Buscar documentos ou desenhos" onClick={openSearch}>
            <Search size={20} />
          </button>
        </header>
        {mobileOpen && (
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label="Fechar navegação"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`} aria-label="Navegação principal">
          <div className="sidebar-brand">
            <Link to="/" aria-label="Tinyfold, início">
              <Logo />
            </Link>
            <button
              type="button"
              className="icon-button mobile-only"
              aria-label="Fechar navegação"
              onClick={() => setMobileOpen(false)}
            >
              <X size={19} />
            </button>
          </div>
          <button type="button" className="search-trigger" onClick={openSearch}>
            <Search size={16} />
            <span>Buscar</span>
            <kbd>⌘ K</kbd>
          </button>
          <button
            type="button"
            className="button primary new-document"
            disabled={createAction.busy}
            onClick={() => void newDocument()}
          >
            <Plus size={17} />
            Novo documento
          </button>
          <nav className="primary-nav">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              className="nav-item"
              activeProps={{ className: 'nav-item active' }}
            >
              <Home size={17} />
              Início
            </Link>
            <Link to="/documentos" className="nav-item" activeProps={{ className: 'nav-item active' }}>
              <FileText size={17} />
              Documentos
            </Link>
            <Link to="/desenhos" className="nav-item" activeProps={{ className: 'nav-item active' }}>
              <PenTool size={17} />
              Desenhos
            </Link>
            <Link to="/kanban" className="nav-item" activeProps={{ className: 'nav-item active' }}>
              <LayoutGrid size={17} />
              Kanban
            </Link>
          </nav>
          <div className="sidebar-section-label">
            <span>PROJETOS</span>
            <button
              type="button"
              className="icon-button"
              aria-label="Criar projeto"
              onClick={() => setProjectOpen(true)}
            >
              <Plus size={16} />
            </button>
          </div>
          <nav className="project-nav" aria-label="Projetos">
            {projects.data?.map((project) => (
              <Link
                key={project.id}
                to="/projetos/$projectId"
                params={{ projectId: project.id }}
                className="nav-item"
                activeProps={{ className: 'nav-item active' }}
              >
                <Folder size={16} />
                <span>{project.name}</span>
              </Link>
            ))}
            {projects.data?.length === 0 && (
              <button type="button" className="quiet-project-create" onClick={() => setProjectOpen(true)}>
                Seu próximo projeto
                <br />
                <span>começa aqui.</span>
              </button>
            )}
          </nav>
          <div className="sidebar-bottom">
            <Link to="/lixeira" className="nav-item" activeProps={{ className: 'nav-item active' }}>
              <Trash2 size={16} />
              Lixeira
            </Link>
            <Link to="/perfil" className="profile-link" activeProps={{ className: 'profile-link active' }}>
              <span className="avatar">{owner.name.slice(0, 1).toUpperCase()}</span>
              <span>
                <strong>{owner.name}</strong>
                <small>Meu espaço</small>
              </span>
              <ChevronDown size={15} />
            </Link>
          </div>
        </aside>
        <main className="main-content" id="main-content" inert={mobileOpen}>
          <Outlet />
        </main>
      </div>
      <Dialog title="Um novo projeto" open={projectOpen} onClose={() => setProjectOpen(false)}>
        <form onSubmit={createProject}>
          <p className="muted">Um lugar para reunir documentos, desenhos e próximos passos.</p>
          <label className="field">
            Nome do projeto
            <input
              autoFocus
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ex.: Meu próximo site"
              required
              maxLength={100}
            />
          </label>
          <div className="dialog-actions">
            <button type="button" className="button secondary" onClick={() => setProjectOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="button primary" disabled={projectAction.busy || !projectName.trim()}>
              {projectAction.busy ? 'Criando…' : 'Criar projeto'}
            </button>
          </div>
        </form>
      </Dialog>
      <Dialog
        title={searchKind === 'canvases' ? 'Buscar desenhos' : 'Buscar documentos'}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        className="search-dialog"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSearchOpen(false);
            void navigation({ to: searchKind === 'canvases' ? '/desenhos' : '/documentos', search: { q: search } });
          }}
        >
          <label className="field">
            Buscar em
            <select
              value={searchKind}
              onChange={(event) => setSearchKind(event.target.value as 'documents' | 'canvases')}
            >
              <option value="documents">Documentos</option>
              <option value="canvases">Desenhos</option>
            </select>
          </label>
          <label className="field">
            <span className="sr-only">Buscar por título ou conteúdo</span>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Uma ideia, uma palavra, um projeto…"
            />
          </label>
          <p className="muted small">
            {searchKind === 'canvases'
              ? 'Busque pelo título ou pelos textos dos seus desenhos.'
              : 'Busque pelo título ou pelo conteúdo dos seus documentos.'}
          </p>
          <div className="dialog-actions">
            <button type="submit" className="button primary">
              <Search size={16} />
              Buscar
            </button>
          </div>
        </form>
      </Dialog>
    </AppContext.Provider>
  );
}
