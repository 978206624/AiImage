"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "cans_api_key";

export function useApiKey() {
  const [key, setKeyState] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setKeyState(stored);
    setIsLoaded(true);
  }, []);

  const setKey = useCallback((newKey: string) => {
    const trimmed = newKey.trim();
    setKeyState(trimmed);
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearKey = useCallback(() => {
    setKeyState("");
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    key,
    isLoaded,
    isConfigured: key.length > 0,
    setKey,
    clearKey,
  };
}
