"use client";

import { createContext, useContext, useState } from "react";

interface AuthModalContextType {
  open: boolean;
  tab: "login" | "register";
  openModal: (tab?: "login" | "register") => void;
  closeModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"login" | "register">("login");

  return (
    <AuthModalContext.Provider
      value={{
        open,
        tab,
        openModal: (t) => {
          setTab(t ?? "login");
          setOpen(true);
        },
        closeModal: () => setOpen(false),
      }}
    >
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}