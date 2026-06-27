'use client';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import FleetStatus from '@/components/admin/FleetStatus';
import AuditLogTable from '@/components/admin/AuditLogTable';
import PolicySettings from '@/components/admin/PolicySettings';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  useEffect(() => { document.title = 'Admin Console — Bus Aesh'; }, []);

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full p-8 text-text-secondary">
        <span className="material-symbols-outlined mr-2">error</span>
        Insufficient permissions — Admin access required.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Admin Console</h1>
        <p className="text-sm text-text-secondary mt-1">Oversee fleet status, audit system activity, and manage booking policies.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-8 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <FleetStatus />
        </div>
        <div className="lg:col-span-4 space-y-6">
          <PolicySettings />
        </div>
      </div>
      <AuditLogTable />
    </div>
  );
}
