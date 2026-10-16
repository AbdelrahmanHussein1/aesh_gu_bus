import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/hooks/useAppStore';
import ThemeToggle from '@/components/layout/ThemeToggle';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';

export default function SideNavBar() {
  const {
    role, switchRole, logout, user, isOffline, setIsOffline,
    sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen,
  } = useApp();
  const pathname = usePathname();
  const drawerRef = useRef<HTMLElement>(null);
  const isCollapsed = sidebarCollapsed && !mobileSidebarOpen;

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawerRef.current?.querySelector<HTMLElement>('button, a')?.focus();
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => { if (desktop.matches) setMobileSidebarOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener('change', closeOnDesktop);
      previousFocus?.focus();
    };
  }, [mobileSidebarOpen, setMobileSidebarOpen]);

  const trapDrawerFocus = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') { setMobileSidebarOpen(false); return; }
    if (event.key !== 'Tab') return;
    const controls = drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, [tabindex="0"]');
    const visible = Array.from(controls || []).filter(control => control.getClientRects().length > 0);
    const first = visible[0];
    const last = visible[visible.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
  const isDev = isLocalhost || Boolean(process.env.NEXT_PUBLIC_DEV_EMAIL && user?.email === process.env.NEXT_PUBLIC_DEV_EMAIL);

  const allNavItems = [
    { label: 'Book Trip (Rider)', icon: 'directions_bus', href: '/rider', active: pathname === '/rider', roles: ['rider', 'admin'] },
    { label: 'Gate Scanner (Supervisor)', icon: 'qr_code_scanner', href: '/supervisor', active: pathname === '/supervisor', roles: ['supervisor', 'admin'] },
    { label: 'Fleet & Policy (Admin)', icon: 'admin_panel_settings', href: '/admin', active: pathname === '/admin', roles: ['admin'] },
  ];

  const navItems = allNavItems.filter(item => isDev || item.roles.includes(role));

  const sidebar = (
    <nav aria-label="Dashboard navigation" className={`flex flex-col h-full bg-surface-container border-e border-border-whisper w-full ${isCollapsed ? 'md:w-16' : 'md:w-64'}`}>
      <div className="flex items-center justify-between px-3 h-14 shrink-0 border-b border-border-whisper">
        {!isCollapsed && (
          <Link href={user ? (user.role === 'admin' ? '/admin' : user.role === 'supervisor' ? '/supervisor' : '/rider') : '/'}>
            <img
              alt="Galala University"
              className="h-9 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity dark:hidden"
              src="/gu-logo-colored.png"
            />
            <img
              alt="Galala University"
              className="h-9 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity hidden dark:block"
              src="/gu-logo-white.png"
            />
          </Link>
        )}
        <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-surface-container-high text-text-secondary transition-colors hidden md:block" title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <span className="material-symbols-outlined">{isCollapsed ? 'menu_open' : 'chevron_left'}</span>
        </button>
        <button aria-label="Close navigation / إغلاق القائمة" onClick={() => setMobileSidebarOpen(false)} className="min-w-11 min-h-11 rounded-lg hover:bg-surface-container-high text-text-secondary transition-colors md:hidden">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 scrollbar-thin">
        {!isCollapsed && role === 'rider' && (
          <Link href="/rider" className="bg-primary-container text-on-primary-container font-headline-sm py-3 rounded-lg w-full flex justify-center items-center gap-2 hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined icon-fill text-[20px]">add</span>
            New Booking
          </Link>
        )}

        {user ? (
          <div className={`${isCollapsed ? 'px-0' : 'px-3'} py-2.5 bg-surface-container-low rounded-xl border border-border-whisper flex flex-col items-center gap-1`}>
            {isCollapsed ? (
              <div className="w-8 h-8 rounded-full bg-primary-container/20 flex items-center justify-center text-primary-container font-bold text-sm">
                {user.fullName.charAt(0)}
              </div>
            ) : (
              <>
                <p className="font-semibold text-text-primary truncate text-sm w-full">{user.fullName}</p>
                <p className="text-text-secondary truncate text-xs w-full">{user.email}</p>
                <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] uppercase tracking-wider text-primary-container font-bold w-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container shrink-0"></span>
                  {role}
                </div>
              </>
            )}
          </div>
        ) : (
          !isCollapsed && (
            <div className="p-3 bg-surface-container-low rounded-xl border border-border-whisper text-center">
              <p className="text-xs text-text-secondary mb-2">Guest Passenger</p>
              <Link href="/" className="block py-2 px-3 bg-primary-container text-on-primary-container rounded-lg text-xs font-bold hover:opacity-90 transition-opacity shadow-sm">
                Sign In / دخول
              </Link>
            </div>
          )
        )}

        <div>
          <div className={`text-[10px] uppercase font-bold text-text-secondary tracking-wider mb-2 ${isCollapsed ? 'text-center' : 'px-3'}`}>
            {isCollapsed ? '..' : 'Navigation Tabs'}
          </div>

          <div className="space-y-1">
            {navItems.map(item => (
              <Link
                key={item.label}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                onClick={() => setMobileSidebarOpen(false)}
                className={`transition-all flex items-center gap-3 px-3 py-2.5 rounded-xl ${item.active ? 'bg-primary-container text-on-primary-container font-bold shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high font-medium'} ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {!isCollapsed && <span className="font-body-md text-sm">{item.label}</span>}
              </Link>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-border-whisper flex flex-col gap-2.5">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-3'}`}>
            {!isCollapsed && <span className="text-xs font-semibold text-text-secondary">Language / اللغة</span>}
            <LanguageSwitcher />
          </div>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-3'}`}>
            {!isCollapsed && <span className="text-xs font-semibold text-text-secondary">Theme / المظهر</span>}
            <ThemeToggle />
          </div>
          <button onClick={logout} className={`text-on-surface-variant hover:bg-surface-container-high transition-all flex items-center gap-3 px-3 py-2.5 rounded-xl w-full ${isCollapsed ? 'justify-center' : ''}`} title="Logout">
            <span className="material-symbols-outlined">logout</span>
            {!isCollapsed && <span className="font-body-md">Logout</span>}
          </button>
        </div>

        {isDev && (
          <div className="pt-4 border-t border-border-whisper">
            <div className={`text-[10px] uppercase font-bold text-cyan-400 mb-2 tracking-wider ${isCollapsed ? 'text-center' : 'px-3'}`}>
              {isCollapsed ? 'DEV' : 'Switch Role (Dev)'}
            </div>
            <div className="flex flex-col gap-1 p-1 bg-surface-container-low rounded-xl border border-cyan-500/20">
              <button onClick={() => switchRole('rider')} className={`text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${role === 'rider' ? 'bg-primary-container text-on-primary-container font-bold shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>{isCollapsed ? 'R' : 'Rider Mode'}</button>
              <button onClick={() => switchRole('supervisor')} className={`text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${role === 'supervisor' ? 'bg-primary-container text-on-primary-container font-bold shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>{isCollapsed ? 'S' : 'Supervisor Mode'}</button>
              <button onClick={() => switchRole('admin')} className={`text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${role === 'admin' ? 'bg-primary-container text-on-primary-container font-bold shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>{isCollapsed ? 'A' : 'Admin Mode'}</button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block h-screen fixed start-0 top-0 z-50">
        {sidebar}
      </aside>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div aria-hidden="true" className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <aside id="mobile-navigation" ref={drawerRef} role="dialog" aria-modal="true" aria-label="Navigation / القائمة" onKeyDown={trapDrawerFocus} className="relative h-full w-64 max-w-[85vw] shadow-xl">
            {sidebar}
          </aside>
        </div>
      )}
    </>
  );
}
