import { type ErrorComponentProps, Link } from '@tanstack/react-router';
import { PageStatus } from '../shell';
import { Button, PageHeader } from '../ui';

/** A page that failed to render: said in Portuguese, inside the shell, with a retry and the way back. */
export function RouteError({ reset }: ErrorComponentProps) {
  return (
    <PageStatus>
      <PageHeader
        title="Algo deu errado nesta página"
        description="O resto do aplicativo continua aqui. Tente de novo ou volte ao início."
      >
        <Button onPress={reset}>Tentar de novo</Button>
        <Link to="/" className="btn" data-variant="secondary" data-size="md">
          Ir para o início
        </Link>
      </PageHeader>
    </PageStatus>
  );
}
