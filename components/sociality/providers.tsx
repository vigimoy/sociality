"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import { makeStore, restore, setSession, resetUI } from "@/lib/sociality/store";
import { ApiError } from "@/lib/sociality/api";
const KEY = "sociality-session-v1";
export default function Providers({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore);
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30000,
            retry: (count, error) =>
              !(
                error instanceof ApiError &&
                error.status >= 400 &&
                error.status < 500
              ) && count < 1,
            refetchOnWindowFocus: true,
          },
          mutations: { retry: false },
        },
      }),
  );
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const value = raw ? JSON.parse(raw) : null;
      store.dispatch(
        restore(
          value && typeof value.token === "string" && value.user?.id
            ? value
            : null,
        ),
      );
    } catch {
      store.dispatch(restore(null));
    }
    const unsubscribe = store.subscribe(() => {
      try {
        const session = store.getState().auth.session;
        if (session) localStorage.setItem(KEY, JSON.stringify(session));
        else localStorage.removeItem(KEY);
      } catch {
        /* Browsers with blocked storage keep the in-memory session. */
      }
    });
    const expire = () => {
      store.dispatch(setSession(null));
      store.dispatch(resetUI());
      client.clear();
      toast.error("Your session has expired. Please log in again.");
    };
    const sync = (event: StorageEvent) => {
      if (event.key !== KEY) return;
      client.clear();
      try {
        store.dispatch(
          restore(event.newValue ? JSON.parse(event.newValue) : null),
        );
      } catch {
        store.dispatch(restore(null));
      }
    };
    window.addEventListener("sociality:session-expired", expire);
    window.addEventListener("storage", sync);
    return () => {
      unsubscribe();
      window.removeEventListener("sociality:session-expired", expire);
      window.removeEventListener("storage", sync);
    };
  }, [client, store]);
  return (
    <Provider store={store}>
      <QueryClientProvider client={client}>
        {children}
        <Toaster theme="dark" position="top-right" richColors closeButton />
      </QueryClientProvider>
    </Provider>
  );
}
