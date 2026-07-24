// import { StrictMode } from 'react';
// import { createRoot } from 'react-dom/client';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { ErrorBoundary } from './components/ErrorBoundary.tsx';
// import App from './App.tsx';
// import './index.css';

// const queryClient = new QueryClient({
//   defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
// });

// async function enableMocking() {
//   // const { worker } = await import('./mocks/browser');
//   // return worker.start({ onUnhandledRequest: 'bypass' });
// }

// enableMocking().then(() => {
//   createRoot(document.getElementById('root')!).render(
//     <StrictMode>
//       <QueryClientProvider client={queryClient}>
//         <App />
//       </QueryClientProvider>
//     </StrictMode>,
//   );
// });

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <ErrorBoundary>
//       <QueryClientProvider client={queryClient}>
//         <App />
//       </QueryClientProvider>
//     </ErrorBoundary>
//   </StrictMode>,
// );


import { createRoot } from 'react-dom/client';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// StrictMode SENGAJA dihapus — ag-Grid mengelola cellEditorPopup lewat DOM
// manipulation manual (di luar React), dan double-invoke mount/unmount ala
// StrictMode bentrok dengan itu (persis error "removeChild" yang kalian lihat).
// Ini kasus umum & terdokumentasi untuk library grid berat seperti ag-Grid.
// Tidak ada dampak ke production build — StrictMode memang cuma aktif di dev.
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </ErrorBoundary>,
);