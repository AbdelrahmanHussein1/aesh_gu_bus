import Link from 'next/link';
import { useApp } from '@/hooks/useAppStore';

export default function SideNavBar() {
  const {
    role, switchRole, logout, user, isOffline, setIsOffline,
    sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen,
  } = useApp();

  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
  const isDev = isLocalhost || Boolean(process.env.NEXT_PUBLIC_DEV_EMAIL && user?.email === process.env.NEXT_PUBLIC_DEV_EMAIL);

  const allNavItems = [
    { label: 'Book Trip (Rider)', icon: 'directions_bus', href: '/rider', active: role === 'rider', roles: ['rider', 'admin'] },
    { label: 'Gate Scanner (Supervisor)', icon: 'qr_code_scanner', href: '/supervisor', active: role === 'supervisor', roles: ['supervisor', 'admin'] },
    { label: 'Fleet & Policy (Admin)', icon: 'admin_panel_settings', href: '/admin', active: role === 'admin', roles: ['admin'] },
  ];

  const navItems = allNavItems.filter(item => isDev || item.roles.includes(role));

  const sidebar = (
    <nav className={`flex flex-col h-full bg-surface-container border-r border-border-whisper transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex items-center justify-between px-3 h-14 shrink-0 border-b border-border-whisper">
        {!sidebarCollapsed && (
          <Link href={user ? (user.role === 'admin' ? '/admin' : user.role === 'supervisor' ? '/supervisor' : '/rider') : '/'}>
            <img
              alt="Galala University"
              className="h-9 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
              src="/gu-logo-colored.png"
            />
          </Link>
        )}
        <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-surface-container-high text-text-secondary transition-colors hidden md:block" title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <span className="material-symbols-outlined">{sidebarCollapsed ? 'menu_open' : 'chevron_left'}</span>
        </button>
        <button onClick={() => setMobileSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-surface-container-high text-text-secondary transition-colors md:hidden">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 scrollbar-thin">
        {!sidebarCollapsed && role === 'rider' && (
          <Link href="/rider" className="bg-primary-container text-on-primary-container font-headline-sm py-3 rounded-lg w-full flex justify-center items-center gap-2 hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined icon-fill text-[20px]">add</span>
            New Booking
          </Link>
        )}

        {user ? (
          <div className={`${sidebarCollapsed ? 'px-0' : 'px-3'} py-2.5 bg-surface-container-low rounded-xl border border-border-whisper flex flex-col items-center gap-1`}>
            {sidebarCollapsed ? (
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
          !sidebarCollapsed && (
            <div className="p-3 bg-surface-container-low rounded-xl border border-border-whisper text-center">
              <p className="text-xs text-text-secondary mb-2">Guest Passenger</p>
              <Link href="/" className="block py-2 px-3 bg-primary-container text-on-primary-container rounded-lg text-xs font-bold hover:opacity-90 transition-opacity shadow-sm">
                Sign In / دخول
              </Link>
            </div>
          )
        )}

        <div>
          <div className={`text-[10px] uppercase font-bold text-text-secondary tracking-wider mb-2 ${sidebarCollapsed ? 'text-center' : 'px-3'}`}>
            {sidebarCollapsed ? '..' : 'Navigation Tabs'}
          </div>

          <div className="space-y-1">
            {navItems.map(item => (
              <Link
                key={item.label}
                href={item.href}
                className={`transition-all flex items-center gap-3 px-3 py-2.5 rounded-xl ${item.active ? 'bg-primary-container text-on-primary-container font-bold shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high font-medium'} ${sidebarCollapsed ? 'justify-center' : ''}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {!sidebarCollapsed && <span className="font-body-md text-sm">{item.label}</span>}
              </Link>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-border-whisper flex flex-col gap-3">
          <button onClick={logout} className={`text-on-surface-variant hover:bg-surface-container-high transition-all flex items-center gap-3 px-3 py-2.5 rounded-xl w-full ${sidebarCollapsed ? 'justify-center' : ''}`} title="Logout">
            <span className="material-symbols-outlined">logout</span>
            {!sidebarCollapsed && <span className="font-body-md">Logout</span>}
          </button>
        </div>

        {isDev && (
          <div className="pt-4 border-t border-border-whisper">
            <div className={`text-[10px] uppercase font-bold text-cyan-400 mb-2 tracking-wider ${sidebarCollapsed ? 'text-center' : 'px-3'}`}>
              {sidebarCollapsed ? 'DEV' : 'Switch Role (Dev)'}
            </div>
            <div className="flex flex-col gap-1 p-1 bg-surface-container-low rounded-xl border border-cyan-500/20">
              <button onClick={() => switchRole('rider')} className={`text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${role === 'rider' ? 'bg-primary-container text-on-primary-container font-bold shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>{sidebarCollapsed ? 'R' : 'Rider Mode'}</button>
              <button onClick={() => switchRole('supervisor')} className={`text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${role === 'supervisor' ? 'bg-primary-container text-on-primary-container font-bold shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>{sidebarCollapsed ? 'S' : 'Supervisor Mode'}</button>
              <button onClick={() => switchRole('admin')} className={`text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${role === 'admin' ? 'bg-primary-container text-on-primary-container font-bold shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>{sidebarCollapsed ? 'A' : 'Admin Mode'}</button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block h-screen fixed left-0 top-0 z-50">
        {sidebar}
      </aside>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative h-full w-72 max-w-[85vw] shadow-xl">
            {sidebar}
          </aside>
        </div>
      )}
    </>
  );
}
