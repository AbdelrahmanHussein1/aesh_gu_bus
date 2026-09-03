'use client';
import { useApp } from '@/hooks/useAppStore';
import SideNavBar from '@/components/layout/SideNavBar';
import TopBar, { MobileTopBar } from '@/components/layout/TopBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, sidebarCollapsed } = useApp();

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
