'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      import('../tests/msw/browser').then(({ worker }) => {
        worker.start({ onUnhandledRequest: 'bypass' });
      });
    }
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
