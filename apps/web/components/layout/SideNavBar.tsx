'use client';
import { useApp } from '@/hooks/useAppStore';

export default function SideNavBar() {
  const {
    role, switchRole, logout, user, isOffline,
    sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen,
  } = useApp();

  const navItems = [
    { label: 'Overview', icon: 'dashboard', href: '#', active: role === 'rider' },
    { label: 'Book Trip', icon: 'directions_bus', href: '#', active: role === 'rider' },
    { label: 'Live Tracking', icon: 'location_on', href: '#', active: false },
    { label: 'History', icon: 'history', href: '#', active: false },
    { label: 'Support', icon: 'help_outline', href: '#', active: false },
  ];

  const sidebar = (
    <nav className={`flex flex-col h-full bg-surface-container border-r border-border-whisper transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex items-center justify-between px-3 h-14 shrink-0 border-b border-border-whisper">
        {!sidebarCollapsed && (
          <img
            alt="Galala University"
            className="h-8 w-auto object-contain"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCoHBjjSLliXZorNzuNacznSYPSlke7EFUBucfJkmg2uDQDZ3sF2XWeXMaKA9sA-4rD1xfx64BedbovaOk-O_tW4xxIw-nFrI59drJwLc517uAALJcVh3pyB41jKdcv1YPCmuoQzLfrGiT5ElGSFOsJ8wRMKF4pJri9I81KtHV93P4bQ_wIOiS4NCFnfCBCS1gZ3iqIgIvPSIpcC4rpp_RaFnUZ4hjrtWGvaNbKmWF-axilZNWfsRq-b-oy-IDkzANAdBkRkjkDDMOG"
          />
        )}
        <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-surface-container-high text-text-secondary transition-colors hidden md:block" title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <span className="material-symbols-outlined">{sidebarCollapsed ? 'menu_open' : 'chevron_left'}</span>
        </button>
        <button onClick={() => setMobileSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-surface-container-high text-text-secondary transition-colors md:hidden">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 scrollbar-thin">
        {!sidebarCollapsed && (
          <button className="bg-primary-container text-on-primary-container font-headline-sm py-3 rounded-lg w-full flex justify-center items-center gap-2 hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined icon-fill text-[20px]">add</span>
            New Booking
          </button>
        )}

        {user && (
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
                  {user.role}
                </div>
              </>
            )}
          </div>
        )}

        <div>
          <div className={`text-[10px] uppercase font-bold text-text-secondary tracking-wider mb-2 ${sidebarCollapsed ? 'text-center' : 'px-3'}`}>
            {sidebarCollapsed ? '..' : 'Dashboard View'}
          </div>
          {role === 'rider' && (
            <a className={`bg-primary-container text-on-primary-container rounded-xl font-bold flex items-center gap-3 px-3 py-2.5 ${sidebarCollapsed ? 'justify-center' : ''}`} href="#">
              <span className="material-symbols-outlined icon-fill">dashboard</span>
              {!sidebarCollapsed && <span className="font-body-md font-semibold">Overview</span>}
            </a>
          )}
          {role === 'supervisor' && (
            <a className={`bg-primary-container text-on-primary-container rounded-xl font-bold flex items-center gap-3 px-3 py-2.5 ${sidebarCollapsed ? 'justify-center' : ''}`} href="#">
              <span className="material-symbols-outlined icon-fill">qr_code_scanner</span>
              {!sidebarCollapsed && <span className="font-body-md font-semibold">Gate Scanner</span>}
            </a>
          )}
          {role === 'admin' && (
            <a className={`bg-primary-container text-on-primary-container rounded-xl font-bold flex items-center gap-3 px-3 py-2.5 ${sidebarCollapsed ? 'justify-center' : ''}`} href="#">
              <span className="material-symbols-outlined icon-fill">admin_panel_settings</span>
              {!sidebarCollapsed && <span className="font-body-md font-semibold">Admin Controls</span>}
            </a>
          )}

          {navItems.filter(n => n.label !== 'Overview').map(item => (
            <a key={item.label} className={`text-on-surface-variant hover:bg-surface-container-high transition-all flex items-center gap-3 px-3 py-2.5 rounded-xl ${sidebarCollapsed ? 'justify-center' : ''}`} href={item.href} title={sidebarCollapsed ? item.label : undefined}>
              <span className="material-symbols-outlined">{item.icon}</span>
              {!sidebarCollapsed && <span className="font-body-md">{item.label}</span>}
            </a>
          ))}
        </div>

        <div className="pt-4 border-t border-border-whisper flex flex-col gap-3">
          <div className={`px-3 py-2 rounded-lg text-[10px] font-semibold flex items-center gap-2 ${isOffline ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${isOffline ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
            {!sidebarCollapsed && (isOffline ? 'Offline Simulation' : 'Connected to API')}
          </div>
          <button onClick={logout} className={`text-on-surface-variant hover:bg-surface-container-high transition-all flex items-center gap-3 px-3 py-2.5 rounded-xl w-full ${sidebarCollapsed ? 'justify-center' : ''}`} title="Logout">
            <span className="material-symbols-outlined">logout</span>
            {!sidebarCollapsed && <span className="font-body-md">Logout</span>}
          </button>
        </div>

        <div className="pt-4 border-t border-border-whisper">
          <div className={`text-[10px] uppercase font-bold text-text-secondary mb-2 tracking-wider ${sidebarCollapsed ? 'text-center' : 'px-3'}`}>
            {sidebarCollapsed ? '..' : 'Role Swapping'}
          </div>
          <div className="flex flex-col gap-1 p-1 bg-surface-container-low rounded-xl border border-border-whisper">
            <button onClick={() => switchRole('rider')} className={`text-left px-3 py-1.5 rounded-lg text-xs font-semibold ${role === 'rider' ? 'bg-primary-container/10 text-primary-container' : 'text-text-secondary hover:text-text-primary'}`}>{sidebarCollapsed ? 'R' : 'Rider Mode'}</button>
            <button onClick={() => switchRole('supervisor')} className={`text-left px-3 py-1.5 rounded-lg text-xs font-semibold ${role === 'supervisor' ? 'bg-primary-container/10 text-primary-container' : 'text-text-secondary hover:text-text-primary'}`}>{sidebarCollapsed ? 'S' : 'Supervisor Mode'}</button>
            <button onClick={() => switchRole('admin')} className={`text-left px-3 py-1.5 rounded-lg text-xs font-semibold ${role === 'admin' ? 'bg-primary-container/10 text-primary-container' : 'text-text-secondary hover:text-text-primary'}`}>{sidebarCollapsed ? 'A' : 'Admin Mode'}</button>
          </div>
        </div>
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
