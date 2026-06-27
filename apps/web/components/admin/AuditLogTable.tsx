'use client';
import { useApp } from '@/hooks/useAppStore';

export default function AuditLogTable() {
  const { auditLogs } = useApp();

  return (
    <div className="lg:col-span-8 bg-surface-container border border-border-whisper rounded-xl shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)] flex flex-col overflow-hidden h-[540px]">
      <div className="p-4 border-b border-border-whisper bg-surface-container-low/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="font-headline-sm text-headline-sm text-text-primary">Live Audit Trail</h3>
          <div className="w-2 h-2 rounded-full bg-destructive-alt animate-pulse"></div>
        </div>
        <button onClick={() => alert('CSV Export complete (Mock)')}
          className="px-3 py-1.5 border border-border-whisper rounded text-text-secondary font-label-mono-sm text-label-mono-sm hover:bg-surface-container-high transition-colors">
          Export .CSV
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-surface-container-low border-b border-border-whisper">
              <th className="p-3 font-body-sm text-body-sm font-semibold text-text-secondary w-32">Timestamp</th>
              <th className="p-3 font-body-sm text-body-sm font-semibold text-text-secondary w-32">User ID</th>
              <th className="p-3 font-body-sm text-body-sm font-semibold text-text-secondary">Action</th>
              <th className="p-3 font-body-sm text-body-sm font-semibold text-text-secondary w-32 text-right">IP Address</th>
            </tr>
          </thead>
          <tbody className="font-label-mono text-label-mono text-text-primary">
            {auditLogs.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-text-secondary italic">No audit trail records found.</td></tr>
            ) : (
              auditLogs.map((log, idx) => (
                <tr key={log.id || idx} className="border-b border-border-whisper/50 hover:bg-surface-bright transition-colors">
                  <td className="p-3 text-text-secondary">{new Date(log.time).toLocaleTimeString()}</td>
                  <td className="p-3">{log.action.includes('POLICY') || log.action.includes('CLEAR') ? 'ADM-9021' : 'USR-4412'}</td>
                  <td className={`p-3 ${log.action.includes('CLEAR') ? 'text-destructive-alt font-medium' : 'text-primary-container'}`}>{log.action}: {log.details}</td>
                  <td className="p-3 text-right text-text-secondary">192.168.1.{40 + (idx % 10)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
