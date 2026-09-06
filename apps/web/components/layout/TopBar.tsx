'use client';
import { useApp } from '@/hooks/useAppStore';

export default function TopBar() {
  const { role, switchRole, logout, user, isOffline, setIsOffline } = useApp();

  return (
    <header className="sticky top-0 bg-canvas-bg/90 backdrop-blur-md z-40 px-margin-desktop py-5 border-b border-border-whisper justify-between items-end hidden md:flex">
      <div>
        <h2 className="font-display-lg text-display-lg text-text-primary mb-1">
          {role === 'rider' ? 'Book Trip' : role === 'supervisor' ? 'Control Hub' : 'Admin Panel'}
        </h2>
        <p className="font-body-sm text-body-sm text-text-secondary">
          {role === 'rider' ? 'Select your route and seat' : role === 'supervisor' ? 'System operations and live audit tracking' : 'System configuration and monitoring'}
        </p>
      </div>

      <div className="flex items-center gap-3">

        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-border-whisper">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-text-primary">{user.fullName}</p>
              <p className="text-[10px] text-text-secondary truncate max-w-[100px]">{user.email}</p>
            </div>
            <button onClick={logout} className="w-8 h-8 rounded-lg border border-border-whisper bg-surface-container text-text-secondary hover:text-destructive-alt hover:border-destructive-alt/30 flex items-center justify-center transition-all" title="Logout">
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export function MobileTopBar() {
  const { user, logout, isOffline, setIsOffline, setMobileSidebarOpen } = useApp();

  return (
    <nav className="md:hidden bg-surface-container flex justify-between items-center w-full px-margin-mobile h-16 border-b border-border-whisper fixed top-0 z-40">
      <div className="flex items-center gap-2">
        <button onClick={() => setMobileSidebarOpen(true)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-surface-container-high text-text-primary transition-colors">
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>
        <span className="material-symbols-outlined text-primary-container">directions_bus</span>
        <span className="font-headline-md text-headline-md text-primary-container">Galala Transit</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={logout} className="p-2 text-text-secondary hover:text-destructive-alt">
          <span className="material-symbols-outlined text-xl">logout</span>
        </button>
      </div>
    </nav>
  );
}
