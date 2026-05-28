"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Enterprise standard: only use RQ for mostly static data. 
            // The default is to not cache things forever. Stale time is controlled per query.
            staleTime: 60 * 1000, // 1 minute default, overridden per query
            refetchOnWindowFocus: false, // Prevents aggressive background polling
            retry: 1, // Only retry once to avoid network cascade
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
