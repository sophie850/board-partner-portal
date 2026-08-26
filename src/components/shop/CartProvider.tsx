'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

/* ============================================================
   The cart

   Held per browser rather than in the database. A cart is a
   half-formed intention, not a record — nothing is owed to anybody
   until checkout, and an abandoned one should leave no trace for an
   organiser to puzzle over.

   Keyed by partner so previewing one partner cannot pick up another
   partner's cart.
   ============================================================ */

export interface CartLine {
  productId: string;
  qty: number;
  options: Record<string, string>;
  answers: Record<string, string>;
}

interface CartApi {
  lines: CartLine[];
  add: (line: CartLine) => void;
  updateQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: number;
  ready: boolean;
}

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({
  partnerId,
  children,
}: {
  partnerId: string;
  children: React.ReactNode;
}) {
  const key = `board-cart-${partnerId}`;
  const [lines, setLines] = useState<CartLine[]>([]);
  // Nothing is rendered from the cart until storage has been read,
  // so the server and first client render agree.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setLines(raw ? JSON.parse(raw) : []);
    } catch {
      // Private browsing can refuse storage. The cart still works
      // for this visit, it just will not survive a reload.
      setLines([]);
    }
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(key, JSON.stringify(lines));
    } catch {
      // As above — losing persistence must not break the checkout.
    }
  }, [key, lines, ready]);

  const add = useCallback((line: CartLine) => {
    setLines((current) => {
      // Same product with different options is a different line in
      // spirit, but the order model keys on product — so adding an
      // existing product replaces its configuration rather than
      // silently keeping the first one.
      const existing = current.findIndex((l) => l.productId === line.productId);
      if (existing === -1) return [...current, line];
      const next = [...current];
      next[existing] = { ...line, qty: next[existing].qty + line.qty };
      return next;
    });
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    setLines((current) =>
      qty <= 0
        ? current.filter((l) => l.productId !== productId)
        : current.map((l) => (l.productId === productId ? { ...l, qty } : l)),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((current) => current.filter((l) => l.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartApi>(
    () => ({
      lines,
      add,
      updateQty,
      remove,
      clear,
      count: lines.reduce((sum, l) => sum + l.qty, 0),
      ready,
    }),
    [lines, add, updateQty, remove, clear, ready],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside a CartProvider');
  return context;
}
