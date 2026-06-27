import { useState, useRef, useCallback } from 'react';

export interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

export function useToast(autoDismissMs = 4000) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), autoDismissMs);
  }, [autoDismissMs]);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}
