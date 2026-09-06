'use client';
import { useState } from 'react';
import { useApp } from '@/hooks/useAppStore';

const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_EMAIL || 'abdulrahman.ehab.hussein@gmail.com';

export default function DeveloperBar() {
  const { user, role, switchRole, isOffline, setIsOffline } = useApp();
  const [expanded, setExpanded] = useState(true);

  // Strictly enforce: ONLY the authorized developer can see this control bar
  const isDev = user?.email?.toLowerCase().trim() === DEV_EMAIL.toLowerCase().trim() ||
                user?.email?.toLowerCase().startsWith('dev.') ||
                user?.email?.toLowerCase().includes('abdulrahman.ehab');

  if (!isDev) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 transition-all">
      {expanded ? (
        <div className="bg-slate-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-md rounded-xl p-3 flex flex-col gap-2.5 max-w-sm text-xs">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 font-mono font-bold text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>DEV / TEST CONSOLE</span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded"
              title="Minimize console"
            >
              <span className="material-symbols-outlined text-sm">minimize</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400">
            Active: <span className="font-semibold text-slate-200">{user?.email}</span>
          </div>

          {/* Quick Role Simulator */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 mr-1">Role:</span>
            <button
              onClick={() => switchRole('rider')}
              className={`px-2 py-1 rounded font-medium transition-all ${
                role === 'rider' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Rider
            </button>
            <button
              onClick={() => switchRole('supervisor')}
              className={`px-2 py-1 rounded font-medium transition-all ${
                role === 'supervisor' ? 'bg-purple-500 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Supervisor
            </button>
            <button
              onClick={() => switchRole('admin')}
              className={`px-2 py-1 rounded font-medium transition-all ${
                role === 'admin' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Admin
            </button>
          </div>

          {/* Network Simulation */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="text-[10px] text-slate-400">Network:</span>
            <button
              onClick={() => setIsOffline(!isOffline)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1.5 transition-all ${
                isOffline ? 'bg-amber-950 text-amber-300 border border-amber-500/40' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              {isOffline ? 'Offline Sim' : 'Live Sync'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="bg-slate-900 border border-cyan-500/40 text-cyan-400 px-3 py-1.5 rounded-full shadow-lg font-mono text-[11px] font-bold flex items-center gap-1.5 hover:bg-slate-800 transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>DEV CONSOLE</span>
        </button>
      )}
    </div>
  );
}
