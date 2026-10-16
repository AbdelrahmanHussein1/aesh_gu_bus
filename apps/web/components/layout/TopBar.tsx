'use client';
import { useApp } from '@/hooks/useAppStore';
import ThemeToggle from '@/components/layout/ThemeToggle';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function TopBar() {
  const { role, logout, user } = useApp();
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 bg-canvas-bg/90 backdrop-blur-md z-40 px-6 lg:px-8 py-5 border-b border-border-whisper justify-between items-end gap-4 hidden md:flex">
      <div>
        <h2 className="font-display-lg text-display-lg text-text-primary mb-1">
          {role === 'rider' ? t('bookTrip') : role === 'supervisor' ? t('controlHub') : t('adminPanel')}
        </h2>
        <p className="font-body-sm text-body-sm text-text-secondary">
          {role === 'rider' ? t('bookTripSubtitle') : role === 'supervisor' ? t('supervisorSubtitle') : t('adminSubtitle')}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <ThemeToggle />

        {user && (
          <div className="flex items-center gap-3 ps-3 border-s border-border-whisper">
            <div className="text-end hidden sm:block">
              <p className="text-xs font-semibold text-text-primary">{user.fullName}</p>
              <p className="text-[10px] text-text-secondary truncate max-w-[100px]">{user.email}</p>
            </div>
            <button onClick={logout} className="w-11 h-11 rounded-lg border border-border-whisper bg-surface-container text-text-secondary hover:text-destructive-alt hover:border-destructive-alt/30 flex items-center justify-center transition-colors" title="Logout" aria-label="Sign out / تسجيل الخروج">
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export function MobileTopBar() {
  const { logout, mobileSidebarOpen, setMobileSidebarOpen } = useApp();

  return (
    <nav aria-label="Mobile toolbar" className="mobile-dashboard-bar md:hidden bg-surface-container flex justify-between items-center gap-1 w-full px-3 border-b border-border-whisper fixed top-0 z-40">
      <div className="flex items-center gap-2">
        <button onClick={() => setMobileSidebarOpen(true)} aria-label="Open navigation / فتح القائمة" aria-expanded={mobileSidebarOpen} aria-controls="mobile-navigation" className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-text-primary transition-colors">
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>
        <span className="material-symbols-outlined text-primary-container">directions_bus</span>
        <span className="font-headline-md text-sm sm:text-headline-md text-primary-container">Galala Transit</span>
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
        <button onClick={logout} aria-label="Sign out / تسجيل الخروج" className="w-11 h-11 flex items-center justify-center text-text-secondary hover:text-destructive-alt">
          <span className="material-symbols-outlined text-xl">logout</span>
        </button>
      </div>
    </nav>
  );
}
