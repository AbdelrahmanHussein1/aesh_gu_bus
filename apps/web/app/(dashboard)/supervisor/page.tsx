'use client';
import { useEffect } from 'react';
import { useApp } from '@/hooks/useAppStore';
import TripSelector from '@/components/supervisor/TripSelector';
import ManifestTable from '@/components/supervisor/ManifestTable';
import QRScanner from '@/components/supervisor/QRScanner';
import SwapModal from '@/components/supervisor/SwapModal';

export default function SupervisorDashboardPage() {
  const { user, role, switchRole } = useApp();
  useEffect(() => { document.title = 'Supervisor Operations — Bus Aesh'; }, []);

  const isDev = user?.email?.toLowerCase().includes('abdulrahman.ehab') || user?.email === process.env.NEXT_PUBLIC_DEV_EMAIL;

  if (role !== 'supervisor' && role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-8 text-center space-y-3">
        <span className="material-symbols-outlined text-4xl text-text-secondary">badge</span>
        <h3 className="font-bold text-base text-text-primary">Supervisor Access Restricted</h3>
        <p className="text-xs text-text-secondary max-w-sm">This section is reserved for Galala University bus line supervisors and administrators.</p>
        <a href="/rider" className="px-4 py-2 bg-primary-container text-on-primary-container rounded-lg text-xs font-bold hover:opacity-90">
          Return to Rider Portal
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Supervisor Operations</h1>
        <p className="text-sm text-text-secondary mt-1">Select a bus trip to scan boarding passes, monitor rosters, and handle seat reassignments.</p>
      </div>
      <TripSelector />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ManifestTable />
        <QRScanner />
      </div>
      <SwapModal />
    </div>
  );
}
