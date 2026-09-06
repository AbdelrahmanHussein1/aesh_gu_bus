'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '@/hooks/useAppStore';

export default function SingleTabGuard() {
  const { user } = useApp();
  const [isBlocked, setIsBlocked] = useState(false);
  const tabIdRef = useRef<string>('');

  useEffect(() => {
    if (!tabIdRef.current) {
      tabIdRef.current = 'tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    }
  }, []);

  const claimActiveTab = () => {
    if (!user?.id || !tabIdRef.current) return;
    try {
      const storageKey = 'gu_bus_active_tab_' + user.id;
      localStorage.setItem(storageKey, tabIdRef.current);
      
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('gu_bus_tabs_' + user.id);
        bc.postMessage({ type: 'CLAIM_TAB', tabId: tabIdRef.current, time: Date.now() });
        bc.close();
      }
      setIsBlocked(false);
    } catch (e) {
      console.warn('[SingleTabGuard] Error claiming tab:', e);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setIsBlocked(false);
      return;
    }

    const myTabId = tabIdRef.current;
    const storageKey = 'gu_bus_active_tab_' + user.id;
    let bc: BroadcastChannel | null = null;

    // 1. Initial Check / Claim
    const currentActiveTab = localStorage.getItem(storageKey);
    if (!currentActiveTab) {
      // First tab takes the lock
      localStorage.setItem(storageKey, myTabId);
      setIsBlocked(false);
    } else if (currentActiveTab !== myTabId) {
      // Another tab was already active! Block this secondary tab
      setIsBlocked(true);
    }

    // 2. BroadcastChannel for zero-latency cross-tab signaling
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('gu_bus_tabs_' + user.id);
        bc.onmessage = (event) => {
          if (event.data?.type === 'CLAIM_TAB') {
            if (event.data.tabId !== myTabId) {
              // Another tab has taken active status
              setIsBlocked(true);
            }
          }
        };
      } catch (e) {
        console.warn('[SingleTabGuard] BroadcastChannel unsupported/failed:', e);
      }
    }

    // 3. Storage event listener (fallback for browsers or cross-window updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey) {
        if (e.newValue && e.newValue !== myTabId) {
          setIsBlocked(true);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // 4. Clean up on unload if this tab is the active one
    const handleUnload = () => {
      if (localStorage.getItem(storageKey) === myTabId) {
        localStorage.removeItem(storageKey);
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beforeunload', handleUnload);
      if (bc) bc.close();
    };
  }, [user?.id]);

  if (!isBlocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-surface-container border border-primary-container/40 max-w-md w-full rounded-2xl p-6 shadow-2xl text-center flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-200">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <span className="material-symbols-outlined text-4xl">tab_duplicate</span>
        </div>

        <div>
          <h3 className="text-lg font-bold text-text-primary mb-1.5">
            علامة تبويب أخرى نشطة (Tab Active Elsewhere)
          </h3>
          <p className="text-xs leading-relaxed text-text-secondary">
            حسابك (<strong className="text-text-primary">{user?.email}</strong>) مفتوح حالياً في علامة تبويب أخرى.
            <br />
            للحفاظ على أمان المقاعد ومنع التعارض، يُسمح بفتح <strong>نافذة واحدة فقط</strong> لكل حساب.
          </p>
        </div>

        <div className="w-full pt-2 flex flex-col gap-2">
          <button
            onClick={claimActiveTab}
            className="w-full py-3 px-4 bg-primary-container text-on-primary-container rounded-xl font-bold text-sm hover:opacity-95 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">touch_app</span>
            <span>استخدام الحساب في هذه النافذة (Use Here)</span>
          </button>
          <p className="text-[11px] text-text-secondary/60">
            سيؤدي الضغط هنا إلى جعل هذه النافذة هي النشطة وإيقاف النوافذ الأخرى.
          </p>
        </div>
      </div>
    </div>
  );
}
