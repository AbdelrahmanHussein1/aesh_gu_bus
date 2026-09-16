'use client';
import { useState } from 'react';
import { TRANSIT_CONFIG } from '@/lib/config';

export default function StickyMobileContact() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden fixed bottom-5 right-5 z-40">
      {/* Expanded Quick Contact Drawer */}
      {isOpen && (
        <div className="mb-2 p-4 bg-surface-container/95 backdrop-blur-md border border-border-whisper rounded-xl shadow-2xl w-72 text-text-primary animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between border-b border-border-whisper pb-2 mb-3">
            <span className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-amber-500 text-base">support_agent</span>
              Transit Support Desk
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-text-secondary hover:text-text-primary p-1 rounded transition-colors"
              aria-label="Close Contact Menu"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <a
              href={`mailto:${TRANSIT_CONFIG.SUPPORT_EMAIL}`}
              className="flex items-center gap-2 p-2 bg-surface-container-low hover:bg-surface-variant rounded-lg text-text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-blue-500 text-base">mail</span>
              <div>
                <div className="font-semibold">{TRANSIT_CONFIG.SUPPORT_EMAIL}</div>
                <div className="text-[10px] text-text-secondary">Response within 2 hours</div>
              </div>
            </a>

            <a
              href={`tel:${TRANSIT_CONFIG.SUPPORT_PHONE.replace(/\s+/g, '')}`}
              className="flex items-center gap-2 p-2 bg-surface-container-low hover:bg-surface-variant rounded-lg text-text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-emerald-500 text-base">phone_in_talk</span>
              <div>
                <div className="font-semibold">{TRANSIT_CONFIG.SUPPORT_PHONE} (Ext: {TRANSIT_CONFIG.SUPPORT_PHONE_EXT})</div>
                <div className="text-[10px] text-text-secondary">Operating {TRANSIT_CONFIG.SUPPORT_HOURS}</div>
              </div>
            </a>

            <div className="pt-1 text-[10px] text-text-secondary border-t border-border-whisper">
              {TRANSIT_CONFIG.SUPPORT_LOCATION_EN}
            </div>
          </div>
        </div>
      )}

      {/* Floating Trigger Button (Clean rounded-lg, NOT pill) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Transit Support Help"
        className="w-12 h-12 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 rounded-lg shadow-xl flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
      >
        <span className="material-symbols-outlined text-2xl">
          {isOpen ? 'close' : 'support_agent'}
        </span>
      </button>
    </div>
  );
}
