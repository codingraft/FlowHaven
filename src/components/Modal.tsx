"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  title?: string;
}

export default function Modal({ open, onClose, children, className = "", title }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(open);

  // Handle animation state
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setIsVisible(true), 0);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Focus trap & Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => {
      clearTimeout(timer);
      setMounted(false);
    };
  }, []);

  if (!mounted || !isVisible) return null;

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={`fixed inset-0 z-9999 flex items-end sm:items-center justify-center sm:p-4 transition-all duration-300 ${open ? "bg-black/80 backdrop-blur-sm opacity-100" : "bg-black/0 backdrop-blur-none opacity-0 pointer-events-none"
        }`}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={contentRef}
        onClick={(e) => e.stopPropagation()}
        className={`
            w-full border-t sm:border shadow-2xl overflow-hidden flex flex-col
            h-auto max-h-[90vh] rounded-t-3xl sm:rounded-2xl sm:max-w-lg sm:max-h-[85vh]
            transition-all duration-300 ease-out transform
            ${open ? "translate-y-0 opacity-100 scale-100" : "translate-y-full sm:translate-y-8 opacity-0 sm:scale-95"}
            ${className}
        `}
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-bold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
