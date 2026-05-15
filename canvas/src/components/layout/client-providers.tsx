"use client";

import { ToastProvider } from "@/components/ui/toast";
import { CurrentUserProvider } from "@/hooks/use-current-user";
import { ThemeProvider } from "./theme-provider";
import { Navbar } from "./navbar";
import { AuthModal } from "./auth-modal";
import { AuthModalProvider, useAuthModal } from "./auth-modal-context";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CurrentUserProvider>
        <AuthModalProvider>
          <ToastProvider>
            <NavbarWithAuth />
            {children}
            <AuthModalConsumer />
          </ToastProvider>
        </AuthModalProvider>
      </CurrentUserProvider>
    </ThemeProvider>
  );
}

function NavbarWithAuth() {
  const { openModal } = useAuthModal();
  return <Navbar onOpenAuthModal={(tab) => openModal(tab)} />;
}

function AuthModalConsumer() {
  const { open, tab, closeModal } = useAuthModal();
  return open ? (
    <AuthModal
      key={`${tab}-${open}`}
      open={open}
      onClose={closeModal}
      defaultTab={tab}
    />
  ) : null;
}
