"use client";

import { ToastProvider } from "@/components/ui/toast";
import { Navbar } from "./navbar";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <Navbar />
      {children}
    </ToastProvider>
  );
}
