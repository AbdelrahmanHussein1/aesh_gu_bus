'use client';

const fleetItems = [
  { name: 'GZ-101 Northbound', status: 'On Schedule', badge: 'Active', badgeStyle: 'bg-success-galala/20 text-[#3f6412]' },
  { name: 'GZ-102 Southbound', status: 'Delayed 5m', badge: 'Warning', badgeStyle: 'bg-secondary-fixed/50 text-[#8a6800]' },
  { name: 'EXP-05 Express', status: 'Maintenance', badge: 'Offline', badgeStyle: 'bg-surface-variant text-on-surface-variant', dim: true },
  { name: 'GZ-103 Eastbound', status: 'On Schedule', badge: 'Active', badgeStyle: 'bg-success-galala/20 text-[#3f6412]' },
];

export default function FleetStatus() {
  return (
    <div className="bg-surface-container border border-border-whisper rounded-xl shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border-whisper bg-surface-container-low/50 flex justify-between items-center">
        <h3 className="font-headline-sm text-headline-sm text-text-primary">Fleet Status</h3>
        <span className="material-symbols-outlined text-outline cursor-pointer hover:text-primary-container transition-colors">more_vert</span>
      </div>
      <div className="p-3 space-y-1">
        {fleetItems.map((item, i) => (
          <div key={i} className={`flex items-center justify-between p-3 rounded-lg hover:bg-surface-container-low transition-colors border border-transparent hover:border-border-whisper cursor-pointer ${item.dim ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded ${item.dim ? 'bg-surface-variant' : 'bg-primary-fixed'} flex items-center justify-center ${item.dim ? 'text-outline' : 'text-primary-container'}`}>
                <span className="material-symbols-outlined">directions_bus</span>
              </div>
              <div>
                <div className="font-body-sm text-body-sm font-semibold text-text-primary">{item.name}</div>
                <div className={`font-label-mono-sm text-label-mono-sm ${item.status === 'On Schedule' ? 'text-text-secondary' : 'text-destructive-asu'}`}>{item.status}</div>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded font-label-mono-sm text-label-mono-sm ${item.badgeStyle}`}>{item.badge}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
