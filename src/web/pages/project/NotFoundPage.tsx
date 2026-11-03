import { Download } from 'lucide-react';
import { useState } from 'react';
import { draftDownload, localDrafts } from '../../lib/autosave/local-drafts';
import { downloadFile } from '../../lib/files/download';
import type { ItemType } from '../../lib/types';
import { paths } from '../../navigation/paths';
import { PageStatus, useApp } from '../../shell';
import { Button, ButtonLink, PageHeader } from '../../ui';

/**
 * A missing address inside the shell: an unknown page, an item deleted for good, or a project that does
 * not exist. The way back is the start, which opens the last place.
 */
export function NotFoundPage({ title, description }: { title: string; description: string }) {
  return (
    <PageStatus>
      <PageHeader title={title} description={description}>
        <ButtonLink to={paths.start}>Ir para o início</ButtonLink>
      </PageHeader>
    </PageStatus>
  );
}

/** Any address the routes do not know. */
export function RouteNotFound() {
  return <NotFoundPage title="Esta página não existe" description="Confira o endereço ou volte ao início." />;
}

/** An item deleted for good. A draft this browser still keeps for it can be downloaded. */
export function ItemNotFound({ type, id }: { type: ItemType; id: string }) {
  const app = useApp();
  const [draft] = useState(() => {
    try {
      return localDrafts(localStorage, app.owner.installationId, type, id)[0] ?? null;
    } catch {
      return null;
    }
  });
  function download() {
    if (!draft) return;
    const { blob, fileName } = draftDownload(type, id, draft);
    downloadFile(blob, fileName);
  }
  return (
    <PageStatus>
      <PageHeader
        title="Este item não existe mais"
        description={
          draft
            ? 'Ele foi excluído de vez. Este navegador ainda guarda um rascunho dele.'
            : 'Ele foi excluído de vez e não pode ser restaurado.'
        }
      >
        {draft && (
          <Button icon={<Download size={16} />} onPress={download}>
            Baixar rascunho
          </Button>
        )}
      </PageHeader>
    </PageStatus>
  );
}
