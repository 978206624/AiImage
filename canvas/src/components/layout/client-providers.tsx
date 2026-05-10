"use client";

import { ToastProvider } from "@/components/ui/toast";
import { CurrentUserProvider } from "@/hooks/use-current-user";
import { Navbar } from "./navbar";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <CurrentUserProvider>
      <ToastProvider>
        <Navbar />
        {children}
      </ToastProvider>
    </CurrentUserProvider>
  );
}
