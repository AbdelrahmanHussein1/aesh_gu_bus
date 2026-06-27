'use client';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ManifestTable from '@/components/supervisor/ManifestTable';
import QRScanner from '@/components/supervisor/QRScanner';
import SwapModal from '@/components/supervisor/SwapModal';

export default function SupervisorDashboardPage() {
  const { user } = useAuth();
  useEffect(() => { document.title = 'Supervisor Panel — Bus Aesh'; }, []);

  if (!user || user.role !== 'supervisor') {
    return (
      <div className="flex items-center justify-center h-full p-8 text-text-secondary">
        <span className="material-symbols-outlined mr-2">error</span>
        Insufficient permissions — Supervisor access required.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Supervisor Operations</h1>
        <p className="text-sm text-text-secondary mt-1">Manage live rosters, verify boarding passes, and reassign seats.</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ManifestTable />
        <QRScanner />
      </div>
      <SwapModal />
    </div>
  );
}
