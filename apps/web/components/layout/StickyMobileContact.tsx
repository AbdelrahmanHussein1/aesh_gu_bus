'use client';
import { useState } from 'react';

export default function StickyMobileContact() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden fixed bottom-5 right-5 z-40">
      {/* Expanded Quick Contact Drawer */}
      {isOpen && (
        <div className="mb-2 p-4 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-lg shadow-2xl w-72 text-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-amber-400 text-base">support_agent</span>
              Transit Support Desk
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors"
              aria-label="Close Contact Menu"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <a
              href="mailto:transport@gu.edu.eg"
              className="flex items-center gap-2 p-2 bg-slate-800/80 hover:bg-slate-800 rounded-lg text-slate-200 transition-colors"
            >
              <span className="material-symbols-outlined text-blue-400 text-base">mail</span>
              <div>
                <div className="font-semibold">transport@gu.edu.eg</div>
                <div className="text-[10px] text-slate-400">Response within 2 hours</div>
              </div>
            </a>

            <a
              href="tel:+201000000000"
              className="flex items-center gap-2 p-2 bg-slate-800/80 hover:bg-slate-800 rounded-lg text-slate-200 transition-colors"
            >
              <span className="material-symbols-outlined text-emerald-400 text-base">phone_in_talk</span>
              <div>
                <div className="font-semibold">+20 100 000 0000 (Ext: 4410)</div>
                <div className="text-[10px] text-slate-400">Operating 06:00 - 20:00 Daily</div>
              </div>
            </a>

            <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-800">
              Galala University Plateau • Building B Desk
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
