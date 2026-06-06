import { useState, useEffect } from 'react';

export const useViewMode = () => {
  const [currentViewMode, setCurrentViewMode] = useState<'desktop' | 'mobile'>(() => {
    try {
      return (localStorage.getItem('nine-view-mode') as 'desktop' | 'mobile') || 'desktop';
    } catch {
      return 'desktop';
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const mode = localStorage.getItem('nine-view-mode') as 'desktop' | 'mobile';
        if (mode) setCurrentViewMode(mode);
      } catch {}
    };

    const handleCustomEvent = (e: Event) => {
      const mode = (e as CustomEvent).detail?.mode;
      if (mode) setCurrentViewMode(mode);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('view-mode-changed', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('view-mode-changed', handleCustomEvent);
    };
  }, []);

  const setViewMode = (mode: 'desktop' | 'mobile') => {
    try {
      localStorage.setItem('nine-view-mode', mode);
      window.dispatchEvent(new CustomEvent('view-mode-changed', { detail: { mode } }));
      setCurrentViewMode(mode);
    } catch {}
  };

  return { currentViewMode, setViewMode };
};
