'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/hooks/useAppStore';
import SideNavBar from '@/components/layout/SideNavBar';
import TopBar, { MobileTopBar } from '@/components/layout/TopBar';
import DeveloperBar from '@/components/layout/DeveloperBar';
import SupervisorCancellationModal from '@/components/booking/SupervisorCancellationModal';
import SingleTabGuard from '@/components/auth/SingleTabGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role, logout, sidebarCollapsed, isAuthLoading, supervisorCancelAlert, dismissSupervisorCancelAlert } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [sessionDisplacedNotice, setSessionDisplacedNotice] = useState<string | null>(null);

  // 1. Session displacement listener
  useEffect(() => {
    const handleDisplaced = (e: any) => {
      const msg = e?.detail?.messageAr || 'تم تسجيل الدخول من جهاز آخر. تم إنهاء جلستك على هذا الجهاز.';
      setSessionDisplacedNotice(msg);
      setTimeout(() => {
        logout();
        router.push('/');
      }, 3500);
    };

    window.addEventListener('session_displaced', handleDisplaced);
    return () => window.removeEventListener('session_displaced', handleDisplaced);
  }, [logout, router]);

  // 2. Strict Role-Based Route Protection & Auth Guard
  useEffect(() => {
    if (isAuthLoading) return;

    // If not logged in, redirect straight to the Portal login & registration page
    if (!user) {
      router.replace('/');
      return;
    }

    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
    const isDev = isLocalhost || (Boolean(process.env.NEXT_PUBLIC_DEV_EMAIL) && user.email === process.env.NEXT_PUBLIC_DEV_EMAIL);

    if (isDev) return;

    if (user.role === 'rider' && (pathname.startsWith('/supervisor') || pathname.startsWith('/admin'))) {
      router.replace('/rider');
    } else if (user.role === 'supervisor' && pathname.startsWith('/admin')) {
      router.replace('/supervisor');
    }
  }, [isAuthLoading, user, pathname, router]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-surface-bright flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <img
            src="/gu-logo-colored.png"
            alt="Galala University"
            className="h-12 w-auto object-contain"
          />
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <span className="material-symbols-outlined animate-spin text-primary-container">sync</span>
            <span>جاري التحقق من الجلسة... (Verifying Session)</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface-bright flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-container border border-border-whisper rounded-2xl p-6 shadow-xl text-center flex flex-col items-center gap-4">
          <img
            src="/gu-logo-colored.png"
            alt="Galala University"
            className="h-12 w-auto object-contain"
          />
          <div className="w-14 h-14 rounded-full bg-primary-container/20 flex items-center justify-center text-primary-container">
            <span className="material-symbols-outlined text-3xl">login</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary mb-1">تسجيل الدخول مطلوب</h3>
            <p className="text-sm text-text-secondary">يرجى تسجيل الدخول أو إنشاء حساب طالب للوصول إلى نظام حجز الباصات.</p>
          </div>
          <button
            onClick={() => router.replace('/')}
            className="w-full py-3 px-4 bg-primary-container text-on-primary-container rounded-xl font-bold text-sm hover:opacity-95 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
            <span>الانتقال لبوابة التسجيل والدخول</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-bright relative">
      {/* Session Displacement Banner */}
      {sessionDisplacedNotice && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface-container border border-error-container/50 max-w-md w-full rounded-2xl p-6 shadow-2xl text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-error-container/20 flex items-center justify-center text-error-container">
              <span className="material-symbols-outlined text-3xl">devices</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-1">جلسة متزامنة (Concurrent Session)</h3>
              <p className="text-sm text-text-secondary">{sessionDisplacedNotice}</p>
            </div>
            <p className="text-xs text-text-secondary/70">جاري توجيهك لصفحة تسجيل الدخول...</p>
          </div>
        </div>
      )}

      <MobileTopBar />
      <SideNavBar />
      <div className={`flex flex-col min-w-0 transition-all duration-300 pt-16 md:pt-0 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <TopBar />
        <main className="flex-1 overflow-auto px-margin-mobile md:px-margin-desktop py-6 md:py-8">
          {children}
        </main>
      </div>

      {/* Strict Developer/Simulation Bar: Rendered ONLY for developer email */}
      <DeveloperBar />

      {/* Real-time Supervisor Cancellation Warning Modal with Refund notice */}
      <SupervisorCancellationModal 
        alertData={supervisorCancelAlert} 
        onDismiss={dismissSupervisorCancelAlert} 
      />

      {/* Single-Tab Lock: Strictly prevents multiple tabs for the same student/user */}
      <SingleTabGuard />
    </div>
  );
}
