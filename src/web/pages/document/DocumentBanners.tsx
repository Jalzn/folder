import { ArrowDownToLine, RotateCcw, X } from 'lucide-react';
import { errorMessage } from '../../lib/api';
import type { SaveState } from '../../lib/autosave';
import { Banner, Button, IconButton } from '../../ui';

/**
 * The document's bands, under the page bar: a draft that could not open, an edit made elsewhere, a failed
 * save, a draft the browser could not keep, and a task's excerpt that is gone. A copy goes to a project;
 * without an active one, the draft can only be downloaded.
 */
export function DocumentBanners({
  state,
  anchorMissing,
  canCopy,
  copying,
  onDismissAnchor,
  onDownloadRecovery,
  onReload,
  onSaveCopy,
  onRetry,
  onExport,
}: {
  state: SaveState;
  anchorMissing: boolean;
  canCopy: boolean;
  copying: boolean;
  onDismissAnchor: () => void;
  onDownloadRecovery: () => void;
  onReload: () => void;
  onSaveCopy: () => void;
  onRetry: () => void;
  onExport: () => void;
}) {
  return (
    <div className="editor-banners">
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
      {state.status === 'conflict' && (
        <Banner
          tone="conflict"
          urgent
          actions={
            <>
              <Button size="sm" onPress={onReload}>
                Carregar versão salva
              </Button>
              {canCopy ? (
                <Button size="sm" variant="primary" isPending={copying} onPress={onSaveCopy}>
                  Salvar meu rascunho como cópia
                </Button>
              ) : (
                <Button size="sm" variant="primary" onPress={onExport}>
                  Baixar cópia
                </Button>
              )}
            </>
          }
        >
          <strong>Este documento mudou em outro dispositivo.</strong> Seu rascunho está preservado. Escolha como
          continuar.
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
            </>
          }
        >
          <strong>Seu rascunho continua aqui.</strong>{' '}
          {state.error ? errorMessage(state.error) : 'Há um salvamento pendente de confirmação.'}
        </Banner>
      )}
      {state.storageFailed && state.status !== 'saved' && (
        <Banner tone="failure" urgent>
          O navegador não conseguiu guardar o rascunho local. Mantenha esta aba aberta até aparecer “Salvo” ou exporte
          uma cópia.
        </Banner>
      )}
      {anchorMissing && (
        <Banner
          tone="info"
          actions={
            <IconButton label="Fechar aviso" size="sm" onPress={onDismissAnchor}>
              <X size={14} />
            </IconButton>
          }
        >
          O trecho de origem mudou. Você está no documento original.
        </Banner>
      )}
    </div>
  );
}
