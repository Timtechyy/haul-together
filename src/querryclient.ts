import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 mins (no refetch)
    //   cacheTime: 1000 * 60 * 30, // keep in memory
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});