import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type ModalLayer = {
  id: string;
  title: string;
  subtitle?: string;
  width?: "md" | "lg" | "xl";
  content: ReactNode;
};

type ModalContextValue = {
  stack: ModalLayer[];
  pushModal: (layer: Omit<ModalLayer, "id"> & { id?: string }) => string;
  popModal: (id?: string) => void;
  replaceModal: (id: string, layer: Omit<ModalLayer, "id">) => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<ModalLayer[]>([]);

  const pushModal = useCallback((layer: Omit<ModalLayer, "id"> & { id?: string }) => {
    const id = layer.id ?? crypto.randomUUID();
    setStack((s) => [...s, { ...layer, id }]);
    return id;
  }, []);

  const popModal = useCallback((id?: string) => {
    setStack((s) => {
      if (!id) return s.slice(0, -1);
      return s.filter((m) => m.id !== id);
    });
  }, []);

  const replaceModal = useCallback((id: string, layer: Omit<ModalLayer, "id">) => {
    setStack((s) => s.map((m) => (m.id === id ? { ...layer, id } : m)));
  }, []);

  const value = useMemo(
    () => ({ stack, pushModal, popModal, replaceModal }),
    [stack, pushModal, popModal, replaceModal],
  );

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}
