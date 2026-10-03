"use client";

/**
 * QueryProvider — TanStack Query root for the dashboard.
 *
 * One QueryClient per browser session (module state would be shared across
 * renders; useState keeps it stable per component instance and per-session
 * in SSR/CSR boundaries). Defaults: no retry storms for health probes,
 * no window-focus refetch bursts beyond what polling intervals already do.
 */

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 5_000,
          },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
