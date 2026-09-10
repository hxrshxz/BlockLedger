"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type StorageState = {
  lastCid: string | null;
  lastSignature: string | null;
  lastUpdated: number | null;
};

type StorageActions = {
  setLastCid: (cid: string) => void;
  setLastSignature: (sig: string) => void;
  clear: () => void;
};

type StorageContextValue = StorageState & StorageActions;

const StorageContext = createContext<StorageContextValue | undefined>(
  undefined
);

const STORAGE_KEY = "blockledger.storage.latest";

export function StorageProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StorageState>({
    lastCid: null,
    lastSignature: null,
    lastUpdated: null,
  });

  // hydrate
  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY)
          : null;
      if (raw) {
        const parsed = JSON.parse(raw) as StorageState;
        setState({
          lastCid: parsed.lastCid || null,
          lastSignature: parsed.lastSignature || null,
          lastUpdated: parsed.lastUpdated || null,
        });
      }
    } catch (e) {
      console.warn("Failed to hydrate storage state", e);
    }
  }, []);

  // persist
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch (e) {
      console.warn("Failed to persist storage state", e);
    }
  }, [state]);

  const actions = useMemo<StorageActions>(
    () => ({
      setLastCid: (cid: string) =>
        setState((s) => ({ ...s, lastCid: cid, lastUpdated: Date.now() })),
      setLastSignature: (sig: string) =>
        setState((s) => ({
          ...s,
          lastSignature: sig,
          lastUpdated: Date.now(),
        })),
      clear: () =>
        setState({
          lastCid: null,
          lastSignature: null,
          lastUpdated: Date.now(),
        }),
    }),
    []
  );

  const value = useMemo<StorageContextValue>(
    () => ({ ...state, ...actions }),
    [state, actions]
  );

  return (
    <StorageContext.Provider value={value}>{children}</StorageContext.Provider>
  );
}

export function useStorage(): StorageContextValue {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error("useStorage must be used within StorageProvider");
  return ctx;
}
