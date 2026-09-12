'use client';

import React, { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

export function showToast(message: string, type: ToastType = 'info') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aesh-toast', { detail: { message, type } }));
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    let count = 0;
    const handleToast = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail;
      const id = ++count;
      setToasts(prev => [...prev, { id, message, type: type || 'info' }]);

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3500);
    };

    window.addEventListener('aesh-toast', handleToast);
    return () => window.removeEventListener('aesh-toast', handleToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map(toast => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        let borderColor = 'border-blue-500/30';
        let bgStyle = 'bg-surface-container';
        let icon = 'info';
        let iconColor = 'text-blue-500';

        if (isSuccess) {
          borderColor = 'border-emerald-500/30';
          icon = 'check_circle';
          iconColor = 'text-emerald-500';
        } else if (isError) {
          borderColor = 'border-rose-500/30';
          icon = 'error';
          iconColor = 'text-rose-500';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border ${borderColor} ${bgStyle} shadow-lg backdrop-blur-md transition-all animate-badge-pop text-sm`}
          >
            <span className={`material-symbols-outlined text-lg shrink-0 mt-0.5 ${iconColor}`}>
              {icon}
            </span>
            <div className="flex-1 text-xs font-semibold text-text-primary leading-relaxed">
              {toast.message}
            </div>
            <button
              type="button"
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-text-secondary hover:text-text-primary p-0.5 rounded transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
