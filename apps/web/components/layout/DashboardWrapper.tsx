'use client';
import SideNavBar from './SideNavBar';
import TopBar, { MobileTopBar } from './TopBar';
import { useApp } from '@/hooks/useAppStore';

export default function DashboardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas-bg">
      <SideNavBar />
      <MobileTopBar />
      <main className="flex-1 md:ml-64 h-full overflow-y-auto">
        <TopBar />
        <div className="p-margin-desktop space-y-gutter pb-20">
          {children}
        </div>
      </main>
    </div>
  );
}
