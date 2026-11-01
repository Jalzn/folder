import './route-error.css';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { PageStatus, useOptionalShellUi } from '../shell';
import { Button, ButtonLink, PageHeader } from '../ui';

/**
 * A page that failed to render: said in Portuguese, with a retry and the way back. Inside the shell it is a
 * page of the shell; when the shell itself failed, there is no shell around it, and it stands alone.
 */
export function RouteError({ reset }: ErrorComponentProps) {
  const shell = useOptionalShellUi();
  const content = (
    <PageHeader
      title="Algo deu errado nesta página"
      description={
        shell
          ? 'O resto do aplicativo continua aqui. Tente de novo ou volte ao início.'
          : 'Tente de novo ou volte ao início. Se continuar, recarregue a página.'
      }
    >
      <Button onPress={reset}>Tentar de novo</Button>
      <ButtonLink to="/">Ir para o início</ButtonLink>
    </PageHeader>
  );
  if (!shell)
    return (
      <main id="main-content" className="route-error" tabIndex={-1}>
        {content}
      </main>
    );
  return <PageStatus>{content}</PageStatus>;
}
