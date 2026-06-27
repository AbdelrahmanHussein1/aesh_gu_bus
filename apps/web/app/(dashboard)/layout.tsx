'use client';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useAppStore';
import SideNavBar from '@/components/layout/SideNavBar';
import TopBar, { MobileTopBar } from '@/components/layout/TopBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { sidebarCollapsed } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-bright flex items-center justify-center">
        <span className="material-symbols-outlined text-primary-container animate-spin text-4xl">sync</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface-bright flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-outline text-6xl">directions_bus</span>
          <h2 className="text-xl font-bold text-text-primary">Please log in</h2>
          <p className="text-sm text-text-secondary">Redirecting to login page...</p>
          <a href="/" className="inline-block px-6 py-2.5 bg-primary-container text-on-primary-container rounded-xl text-sm font-semibold hover:opacity-90">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-bright">
      <MobileTopBar />
      <SideNavBar />
      <div className={`flex flex-col min-w-0 transition-all duration-300 pt-16 md:pt-0 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <TopBar />
        <main className="flex-1 overflow-auto px-margin-mobile md:px-margin-desktop py-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
