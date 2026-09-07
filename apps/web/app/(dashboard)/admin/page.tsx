'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/hooks/useAppStore';
import ScheduleManager from '@/components/admin/ScheduleManager';
import FleetStatus from '@/components/admin/FleetStatus';
import AuditLogTable from '@/components/admin/AuditLogTable';
import PolicySettings from '@/components/admin/PolicySettings';
import DatabaseViewer from '@/components/admin/DatabaseViewer';

type AdminTab = 'schedules' | 'fleet' | 'policies' | 'database';

export default function AdminDashboardPage() {
  const { user, role, switchRole, isAuthLoading } = useApp();
  const [activeTab, setActiveTab] = useState<AdminTab>('schedules');

  useEffect(() => { document.title = 'Admin Console — Bus Aesh'; }, []);

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary gap-2">
        <span className="material-symbols-outlined animate-spin text-primary-container">sync</span>
        <span>Loading admin console...</span>
      </div>
    );
  }

  if (!user) return null;

  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
  const isDev = isLocalhost || Boolean(process.env.NEXT_PUBLIC_DEV_EMAIL && user?.email === process.env.NEXT_PUBLIC_DEV_EMAIL);

  if (!isDev && role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-8 text-center space-y-3">
        <span className="material-symbols-outlined text-4xl text-text-secondary">admin_panel_settings</span>
        <h3 className="font-bold text-base text-text-primary">Administrator Access Restricted</h3>
        <p className="text-xs text-text-secondary max-w-sm">This section is reserved for Galala University transport administrators.</p>
        <a href="/rider" className="px-4 py-2 bg-primary-container text-on-primary-container rounded-lg text-xs font-bold hover:opacity-90">
          Return to Rider Portal
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Admin Operations Console</h1>
        <p className="text-sm text-text-secondary mt-1">
          Master transport control: manage bus shifts, duplicate operational schedules, monitor fleet occupancy, and review audit trails.
        </p>
      </div>

      {/* Admin Tab Switcher */}
      <div className="flex gap-2 border-b border-border-whisper pb-3">
        <button
          onClick={() => setActiveTab('schedules')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'schedules' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'bg-surface-container text-text-secondary hover:text-text-primary border border-border-whisper'}`}
        >
          <span className="material-symbols-outlined text-base">calendar_view_week</span>
          <span>Shift & Schedule Hub</span>
        </button>

        <button
          onClick={() => setActiveTab('fleet')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'fleet' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'bg-surface-container text-text-secondary hover:text-text-primary border border-border-whisper'}`}
        >
          <span className="material-symbols-outlined text-base">directions_bus</span>
          <span>Fleet Live Status</span>
        </button>

        <button
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'policies' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'bg-surface-container text-text-secondary hover:text-text-primary border border-border-whisper'}`}
        >
          <span className="material-symbols-outlined text-base">tune</span>
          <span>Policies & Security Logs</span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'database' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'bg-surface-container text-text-secondary hover:text-text-primary border border-border-whisper'}`}
        >
          <span className="material-symbols-outlined text-base">dataset</span>
          <span>Dataset & Database Explorer</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'schedules' && (
        <ScheduleManager />
      )}

      {activeTab === 'fleet' && (
        <div className="space-y-6">
          <FleetStatus />
        </div>
      )}

      {activeTab === 'policies' && (
        <div className="space-y-6">
          <PolicySettings />
          <AuditLogTable />
        </div>
      )}

      {activeTab === 'database' && (
        <DatabaseViewer />
      )}
    </div>
  );
}
