import './editor.css';
import { ArrowDownToLine, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { errorMessage } from '../../lib/api';
import type { SaveState } from '../../lib/autosave';
import { paths } from '../../router/paths';
import { Banner, Button, ButtonLink } from '../../ui';

/**
 * The bands of an open document or drawing, under the page bar: a draft that could not open, an edit made
 * elsewhere or a move to the trash while editing, a failed save, and a draft the browser could not keep.
 * A copy goes to a project; without an active one, the draft can only be downloaded. `children` adds the
 * page's own bands, such as a task's excerpt that is gone.
 */
export function SaveBanners({
  state,
  noun,
  trashed = false,
  projectId,
  canCopy,
  copying,
  onDownloadRecovery,
  onReload,
  onSaveCopy,
  onRetry,
  onExport,
  className,
  children,
}: {
  state: SaveState<unknown>;
  /** "Este documento", "Este desenho". */
  noun: string;
  trashed?: boolean;
  projectId: string;
  canCopy: boolean;
  copying: boolean;
  onDownloadRecovery: () => void;
  onReload: () => void;
  onSaveCopy: () => void;
  onRetry: () => void;
  onExport: () => void;
  className?: string;
  children?: ReactNode;
}) {
  const copy = canCopy ? (
    <Button size="sm" variant="primary" isPending={copying} onPress={onSaveCopy}>
      Salvar meu rascunho como cópia
    </Button>
  ) : (
    <Button size="sm" variant="primary" onPress={onExport}>
      Baixar cópia
    </Button>
  );
  return (
    <div className={className ?? 'editor-banners'}>
      {state.recoveryData && (
        <Banner
          tone="draft"
          urgent
          actions={
            <Button size="sm" icon={<ArrowDownToLine size={14} />} onPress={onDownloadRecovery}>
              Baixar rascunho original
            </Button>
          }
        >
          <strong>Encontramos um rascunho que não pôde ser aberto.</strong> Você está vendo a versão salva. Baixe o
          rascunho original para preservar seu conteúdo.
        </Banner>
      )}
      {(state.status === 'conflict' || trashed) && (
        <Banner
          tone="conflict"
          urgent
          actions={
            <>
              {trashed ? (
                <ButtonLink to={paths.trash(projectId)} size="sm">
                  Abrir lixeira
                </ButtonLink>
              ) : (
                <Button size="sm" onPress={onReload}>
                  Carregar versão salva
                </Button>
              )}
              {copy}
            </>
          }
        >
          <strong>{trashed ? `${noun} foi movido para a lixeira.` : `${noun} mudou em outro dispositivo.`}</strong> Seu
          rascunho está preservado. Escolha como continuar.
        </Banner>
      )}
      {state.status === 'error' && (
        <Banner
          tone="failure"
          urgent
          actions={
            <>
              <Button size="sm" icon={<RotateCcw size={14} />} onPress={onRetry}>
                Tentar salvar
              </Button>
              <Button size="sm" variant="ghost" onPress={onExport}>
                Exportar cópia
              </Button>
              {!trashed && canCopy && copy}
            </>
          }
        >
          <strong>Seu rascunho continua aqui.</strong>{' '}
          {state.error ? errorMessage(state.error) : 'Há um salvamento pendente de confirmação.'}
        </Banner>
      )}
      {state.storageFailed && state.status !== 'saved' && (
        <Banner
          tone="failure"
          urgent
          actions={
            <Button size="sm" variant="ghost" onPress={onExport}>
              Exportar cópia
            </Button>
          }
        >
          O navegador não conseguiu guardar o rascunho local. Mantenha esta aba aberta até aparecer “Salvo” ou exporte
          uma cópia.
        </Banner>
      )}
      {children}
    </div>
  );
}
