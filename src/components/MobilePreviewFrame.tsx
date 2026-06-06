import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export const MobilePreviewFrame = ({ 
  children, 
  isMobileView, 
  onClose 
}: { 
  children: React.ReactNode; 
  isMobileView: boolean;
  onClose: () => void;
}) => {
  const [contentRef, setContentRef] = useState<HTMLIFrameElement | null>(null);
  const mountNode = contentRef?.contentWindow?.document?.body;

  useEffect(() => {
    if (!contentRef) return;
    const doc = contentRef.contentWindow?.document;
    if (!doc) return;

    // Copy styles from parent document
    const copyStyles = () => {
      const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
      styles.forEach(style => {
        const id = style.getAttribute('data-vite-dev-id') || style.getAttribute('href') || 'inline';
        if (!doc.head.querySelector(`[data-copied-from="${id}"]`)) {
          const clone = style.cloneNode(true) as HTMLElement;
          clone.setAttribute('data-copied-from', id);
          doc.head.appendChild(clone);
        }
      });
    };

    copyStyles();
    
    // Also observe for new styles (e.g. dynamic imports)
    const observer = new MutationObserver((mutations) => {
      let shouldCopy = false;
      mutations.forEach(m => {
        m.addedNodes.forEach(n => {
          if (n.nodeName === 'STYLE' || n.nodeName === 'LINK') shouldCopy = true;
        });
      });
      if (shouldCopy) copyStyles();
    });
    observer.observe(document.head, { childList: true, subtree: true });

    // Set body classes to match parent
    doc.body.className = document.body.className || "bg-[#0A0A0F] text-[#F0EFE8]";
    doc.body.style.margin = '0';
    doc.body.style.height = '100dvh';
    doc.body.style.overflow = 'hidden';

    // Inject a script to prevent scrolling on body
    const script = doc.createElement('script');
    script.textContent = `
      document.addEventListener('touchmove', function(e) {
        if(e.target === document.documentElement || e.target === document.body) {
          e.preventDefault();
        }
      }, {passive: false});
    `;
    doc.head.appendChild(script);

    return () => observer.disconnect();
  }, [contentRef]);

  if (!isMobileView) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[999999] bg-[#050508]/90 backdrop-blur-sm flex flex-col items-center justify-center sm:p-4">
      {/* "Close" area to click outside */}
      <div className="absolute inset-0 z-0" onClick={onClose} />
      
      {/* Mobile Device Mockup (Now Fluid & Borderless) */}
      <div className="w-full max-w-[100vw] h-full sm:h-[90vh] sm:max-w-[480px] sm:rounded-3xl sm:border sm:border-white/10 bg-[#0A0A0F] overflow-hidden shadow-[0_0_80px_rgba(212,175,55,0.15)] relative z-10 flex flex-col">
        {/* Iframe for actual content */}
        <iframe
          ref={setContentRef}
          className="w-full flex-1 border-0 bg-[#0A0A0F]"
          title="Mobile View Preview"
        />
        {mountNode && createPortal(children, mountNode)}
      </div>
      
      <p className="mt-6 text-[#A09E9A] text-[10px] font-black uppercase tracking-[0.2em] z-10 bg-black/50 px-4 py-2 rounded-full border border-white/5 backdrop-blur-md hidden sm:block">
        Mobile Layout Preview
      </p>
    </div>
  );
};
