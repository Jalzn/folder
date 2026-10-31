import './styles/tokens.css';
import './styles/fonts.css';
import './styles/base.css';
import '@blocknote/mantine/style.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { I18nProvider } from 'react-aria-components';
import { createRoot } from 'react-dom/client';
import { queryClient } from './lib/api';
import { router } from './router';
import { ToastProvider } from './ui';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento root não encontrado.');
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider locale="pt-BR">
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
);
