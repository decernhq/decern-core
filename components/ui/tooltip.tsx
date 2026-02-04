"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  children: React.ReactNode;
  label: string;
  /** Optional delay in ms before showing (default 0) */
  delay?: number;
}

export function Tooltip({ children, label, delay = 0 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const show = () => {
    if (delay > 0) {
      const id = setTimeout(() => setVisible(true), delay);
      setTimeoutId(id);
    } else {
      setVisible(true);
    }
  };

  const hide = () => {
    if (timeoutId != null) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setVisible(false);
  };

  useEffect(() => {
    if (!visible || typeof document === "undefined") return;
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    });
  }, [visible]);

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            className="fixed z-[9999] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
            style={{ top: position.top, left: position.left }}
            role="tooltip"
          >
            {label}
          </span>,
          document.body
        )}
    </span>
  );
}
