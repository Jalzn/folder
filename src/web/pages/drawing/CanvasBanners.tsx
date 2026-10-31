import { Link } from '@tanstack/react-router';
import { RotateCcw } from 'lucide-react';
import { errorMessage } from '../../lib/api';
import type { SaveState } from '../../lib/autosave';
import type { CanvasSnapshot } from '../../lib/canvas-autosave';
import { paths } from '../../router/paths';
import { Banner, Button } from '../../ui';

/**
 * The drawing's bands: a draft that could not open, an edit made elsewhere or a move to the trash while
 * drawing, a failed save, and a draft the browser could not keep. A copy goes to a project; without an
 * active one, the draft can only be downloaded.
 */
export function CanvasBanners({
  state,
  trashed,
  projectId,
  canCopy,
  copying,
  onDownloadRecovery,
  onReload,
  onSaveCopy,
  onRetry,
  onExport,
}: {
  state: SaveState<CanvasSnapshot>;
  trashed: boolean;
  projectId: string | null;
  canCopy: boolean;
  copying: boolean;
  onDownloadRecovery: () => void;
  onReload: () => void;
  onSaveCopy: () => void;
  onRetry: () => void;
  onExport: () => void;
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
    <div className="editor-banners editor-banners--wide">
      {state.recoveryData && (
        <Banner
          tone="draft"
          urgent
          actions={
            <Button size="sm" onPress={onDownloadRecovery}>
              Baixar rascunho original
            </Button>
          }
        >
          <strong>Encontramos um rascunho que não pôde ser aberto.</strong> Baixe o rascunho original para preservar seu
          conteúdo.
        </Banner>
      )}
      {(state.status === 'conflict' || trashed) && (
        <Banner
          tone="conflict"
          urgent
          actions={
            <>
              {trashed ? (
                projectId && (
                  <Link to={paths.trash(projectId)} className="btn" data-variant="secondary" data-size="sm">
                    Abrir lixeira
                  </Link>
                )
              ) : (
                <Button size="sm" onPress={onReload}>
                  Carregar versão salva
                </Button>
              )}
              {copy}
            </>
          }
        >
          <strong>
            {trashed ? 'Este desenho foi movido para a lixeira.' : 'Este desenho mudou em outro dispositivo.'}
          </strong>{' '}
          Seu rascunho está preservado. Escolha como continuar.
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
    </div>
  );
}
