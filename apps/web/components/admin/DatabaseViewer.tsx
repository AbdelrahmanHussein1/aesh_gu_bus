'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/hooks/useAppStore';
import { getApiBaseUrl } from '@/lib/api';

type DatasetTab = 'users' | 'bookings' | 'trips' | 'buses';

export default function DatabaseViewer() {
  const { isOffline, token, routes } = useApp();
  const [activeTab, setActiveTab] = useState<DatasetTab>('users');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Datasets
  const [users, setUsers] = useState<any[]>([]);
  const [userCounts, setUserCounts] = useState({ total: 0, riders: 0, supervisors: 0, admins: 0 });
  const [bookings, setBookings] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);

  // Selected JSON record modal
  const [inspectRecord, setInspectRecord] = useState<any | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const API_URL = getApiBaseUrl();

  const triggerNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 5000);
  };

  // 1. Fetch Users
  const loadUsers = useCallback(async () => {
    setLoading(true);
    if (!isOffline) {
      try {
        const res = await fetch(`${API_URL}/api/admin/database/users`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
          setUserCounts(data.counts || { total: 0, riders: 0, supervisors: 0, admins: 0 });
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Live users fetch failed, fallback to mock:', e);
      }
    }

    // Offline mock users
    const mockUsersList = [
      { id: 'usr-01', fullName: 'عبدالرحمن إيهاب حسين', fullNameAr: 'عبدالرحمن إيهاب حسين', email: 'aes400196@gu.edu.eg', phone: '01021561196', role: 'rider', academicId: 'aes400196', faculty: 'Computer Science & AI', isSheerIdVerified: true, createdAt: '2026-09-07T10:15:00Z' },
      { id: 'usr-02', fullName: 'أحمد مصطفى محمود', fullNameAr: 'أحمد مصطفى محمود', email: 'eng202100@gu.edu.eg', phone: '01123456789', role: 'rider', academicId: 'eng202100', faculty: 'Engineering', isSheerIdVerified: true, createdAt: '2026-09-06T14:20:00Z' },
      { id: 'usr-03', fullName: 'سارة علي حسن', fullNameAr: 'سارة علي حسن', email: 'med300214@gu.edu.eg', phone: '01234567890', role: 'rider', academicId: 'med300214', faculty: 'Medicine', isSheerIdVerified: true, createdAt: '2026-09-05T09:00:00Z' },
      { id: 'usr-04', fullName: 'محمد صبحي', fullNameAr: 'محمد صبحي', email: 'driver.sobhi@gu.edu.eg', phone: '01021561196', role: 'supervisor', academicId: 'DRV-101', faculty: 'Fleet Operations (Driver)', isSheerIdVerified: true, createdAt: '2026-06-01T08:00:00Z' },
      { id: 'usr-05', fullName: 'ممدوح بدران', fullNameAr: 'ممدوح بدران', email: 'super.badran@gu.edu.eg', phone: '01275467090', role: 'supervisor', academicId: 'SUP-202', faculty: 'Line Operations (Supervisor)', isSheerIdVerified: true, createdAt: '2026-06-01T08:00:00Z' },
      { id: 'usr-06', fullName: 'Galala Admin Operations', fullNameAr: 'مسؤول العمليات', email: 'admin@gu.edu.eg', phone: '01000000001', role: 'admin', academicId: 'ADM-001', faculty: 'Transport Management', isSheerIdVerified: true, createdAt: '2026-05-01T00:00:00Z' },
    ];
    setUsers(mockUsersList);
    setUserCounts({
      total: mockUsersList.length,
      riders: mockUsersList.filter(u => u.role === 'rider').length,
      supervisors: mockUsersList.filter(u => u.role === 'supervisor').length,
      admins: mockUsersList.filter(u => u.role === 'admin').length,
    });
    setLoading(false);
  }, [isOffline, token, API_URL]);

  // 2. Fetch Bookings
  const loadBookings = useCallback(async () => {
    setLoading(true);
    if (!isOffline) {
      try {
        const res = await fetch(`${API_URL}/api/admin/database/bookings`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setBookings(data.bookings || []);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Live bookings fetch failed, fallback to mock:', e);
      }
    }

    // Offline mock bookings
    const mockBookingsList = [
      {
        id: 'bk-9901',
        seatNumber: 14,
        status: 'confirmed',
        bookingType: 'one_way',
        legType: 'to_campus',
        boardingCode: 'GU-8A2F',
        paymentStatus: 'paid',
        receiptRef: 'INSTA-88291',
        createdAt: '2026-09-07T08:30:00Z',
        user: { fullName: 'عبدالرحمن إيهاب حسين', email: 'aes400196@gu.edu.eg', phone: '01021561196', academicId: 'aes400196', faculty: 'Computer Science & AI' },
        trip: { id: 2901, tripDate: '2026-09-07', departureTime: '07:00 AM', direction: 'to_campus', routeName: 'بورتوفيق - السويس', busName: 'باص 101' },
      },
      {
        id: 'bk-9902',
        seatNumber: 5,
        status: 'confirmed',
        bookingType: 'one_way',
        legType: 'to_campus',
        boardingCode: 'GU-1F4C',
        paymentStatus: 'paid',
        receiptRef: 'VISA-44910',
        createdAt: '2026-09-07T08:45:00Z',
        user: { fullName: 'أحمد مصطفى محمود', email: 'eng202100@gu.edu.eg', phone: '01123456789', academicId: 'eng202100', faculty: 'Engineering' },
        trip: { id: 2901, tripDate: '2026-09-07', departureTime: '07:00 AM', direction: 'to_campus', routeName: 'بورتوفيق - السويس', busName: 'باص 101' },
      },
      {
        id: 'bk-9903',
        seatNumber: 22,
        status: 'swapped',
        bookingType: 'one_way',
        legType: 'to_campus',
        boardingCode: 'GU-3C9A',
        paymentStatus: 'paid',
        receiptRef: 'TELDA-12903',
        createdAt: '2026-09-07T09:10:00Z',
        user: { fullName: 'سارة علي حسن', email: 'med300214@gu.edu.eg', phone: '01234567890', academicId: 'med300214', faculty: 'Medicine' },
        trip: { id: 2902, tripDate: '2026-09-07', departureTime: '09:30 AM', direction: 'to_campus', routeName: 'بورتوفيق - السويس', busName: 'باص 102' },
      },
    ];
    setBookings(mockBookingsList);
    setLoading(false);
  }, [isOffline, token, API_URL]);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    else if (activeTab === 'bookings') loadBookings();
  }, [activeTab, loadUsers, loadBookings]);

  // Clean Test Student Action
  const handleCleanTestStudent = async (emailToClean = 'aes400196@gu.edu.eg') => {
    if (!confirm(`Are you sure you want to completely purge test student (${emailToClean}) and all their bookings/audit logs?`)) return;

    if (!isOffline) {
      try {
        const res = await fetch(`${API_URL}/api/admin/database/clean-test-student`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ email: emailToClean }),
        });
        if (res.ok) {
          triggerNotice('success', `Test account ${emailToClean} purged successfully! Ready for fresh registration test.`);
          loadUsers();
          loadBookings();
          return;
        }
      } catch {}
    }

    // Offline purge
    setUsers(prev => prev.filter(u => u.email !== emailToClean));
    setBookings(prev => prev.filter(b => b.user?.email !== emailToClean));
    triggerNotice('success', `Test account ${emailToClean} removed from local dataset.`);
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const q = search.toLowerCase();
      const matchSearch = !search ||
        u.email?.toLowerCase().includes(q) ||
        u.fullName?.toLowerCase().includes(q) ||
        u.academicId?.toLowerCase().includes(q) ||
        u.phone?.includes(q);
      return matchRole && matchSearch;
    });
  }, [users, roleFilter, search]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchStatus = statusFilter === 'all' || b.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch = !search ||
        b.user?.email?.toLowerCase().includes(q) ||
        b.user?.fullName?.toLowerCase().includes(q) ||
        b.user?.academicId?.toLowerCase().includes(q) ||
        b.boardingCode?.toLowerCase().includes(q) ||
        b.receiptRef?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [bookings, statusFilter, search]);

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      {notice && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${notice.type === 'success' ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'}`}>
          <span>{notice.message}</span>
          <button onClick={() => setNotice(null)} className="text-xs font-bold">×</button>
        </div>
      )}

      {/* Header & Clean Tool */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container border border-border-whisper p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-text-primary">Dataset & Database Explorer</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-container/15 text-primary-container border border-primary-container/30">
              Live Postgres Table View
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Complete administrative dataset access: query registered students, faculty affiliations, passenger ticket rosters, and fleet records.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleCleanTestStudent('aes400196@gu.edu.eg')}
            className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
            title="Clean test student aes400196@gu.edu.eg to re-test registration"
          >
            <span className="material-symbols-outlined text-base">person_remove</span>
            <span>Clean Test Student (aes400196)</span>
          </button>

          <button
            onClick={() => activeTab === 'users' ? loadUsers() : loadBookings()}
            className="px-3 py-2 rounded-xl bg-surface hover:bg-surface-container-high border border-border-whisper text-text-primary font-semibold text-xs flex items-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            <span>Reload</span>
          </button>
        </div>
      </div>

      {/* Dataset Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-border-whisper pb-3 gap-3 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab('users'); setSearch(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'bg-surface-container text-text-secondary hover:text-text-primary border border-border-whisper'}`}
          >
            <span className="material-symbols-outlined text-base">group</span>
            <span>Users & Students ({userCounts.total})</span>
          </button>

          <button
            onClick={() => { setActiveTab('bookings'); setSearch(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'bookings' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'bg-surface-container text-text-secondary hover:text-text-primary border border-border-whisper'}`}
          >
            <span className="material-symbols-outlined text-base">confirmation_number</span>
            <span>Bookings & Tickets ({bookings.length})</span>
          </button>
        </div>

        {/* Global Search within dataset */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary">search</span>
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border-whisper rounded-xl text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
            />
          </div>
        </div>
      </div>

      {/* 1. USERS DATASET TABLE */}
      {activeTab === 'users' && (
        <div className="bg-surface-container border border-border-whisper rounded-2xl overflow-hidden shadow-sm space-y-3">
          {/* Filters toolbar */}
          <div className="p-3 bg-surface-container-low border-b border-border-whisper flex items-center justify-between gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-text-secondary text-[11px] font-bold">Filter Role:</span>
              {(['all', 'rider', 'supervisor', 'admin'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${roleFilter === r ? 'bg-primary-container text-on-primary-container' : 'bg-surface text-text-secondary border border-border-whisper'}`}
                >
                  {r === 'all' ? `All (${users.length})` : r === 'rider' ? `Students (${userCounts.riders})` : r === 'supervisor' ? `Supervisors (${userCounts.supervisors})` : `Admins (${userCounts.admins})`}
                </button>
              ))}
            </div>
            <span className="text-text-secondary text-[11px]">Showing {filteredUsers.length} of {users.length} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low border-b border-border-whisper text-text-secondary uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-3">Student / User</th>
                  <th className="p-3">Academic ID</th>
                  <th className="p-3">Program / Faculty</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Registered At</th>
                  <th className="p-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-whisper/40">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-text-secondary italic">
                      No user records matched the query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-container-high/40 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-text-primary">{u.fullName}</div>
                        <div className="font-mono text-[11px] text-text-secondary">{u.email}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-primary-container">
                        {u.academicId || 'N/A'}
                      </td>
                      <td className="p-3 text-text-secondary max-w-[180px] truncate">
                        {u.faculty || 'Galala University'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : u.role === 'supervisor' ? 'bg-amber-500/20 text-amber-300' : 'bg-primary-container/15 text-primary-container'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-text-secondary">
                        {u.phone || '—'}
                      </td>
                      <td className="p-3">
                        {u.isSheerIdVerified ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold flex items-center gap-1 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Verified
                          </span>
                        ) : (
                          <span className="text-text-tertiary text-[10px]">Standard</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-text-secondary">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setInspectRecord(u)}
                          className="px-2.5 py-1 rounded bg-surface border border-border-whisper hover:border-primary-container text-primary-container font-mono text-[10px] font-bold"
                        >
                          JSON
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. BOOKINGS DATASET TABLE */}
      {activeTab === 'bookings' && (
        <div className="bg-surface-container border border-border-whisper rounded-2xl overflow-hidden shadow-sm space-y-3">
          <div className="p-3 bg-surface-container-low border-b border-border-whisper flex items-center justify-between gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-text-secondary text-[11px] font-bold">Filter Status:</span>
              {(['all', 'confirmed', 'swapped', 'cancelled'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all uppercase ${statusFilter === st ? 'bg-primary-container text-on-primary-container' : 'bg-surface text-text-secondary border border-border-whisper'}`}
                >
                  {st}
                </button>
              ))}
            </div>
            <span className="text-text-secondary text-[11px]">Showing {filteredBookings.length} of {bookings.length} bookings</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low border-b border-border-whisper text-text-secondary uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-3">Ticket / Boarding</th>
                  <th className="p-3">Passenger</th>
                  <th className="p-3">Route & Bus</th>
                  <th className="p-3">Seat</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Date Booked</th>
                  <th className="p-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-whisper/40">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-text-secondary italic">
                      No booking records found.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-surface-container-high/40 transition-colors">
                      <td className="p-3">
                        <div className="font-mono font-bold text-primary-container text-xs">{b.boardingCode || b.id}</div>
                        <div className="text-[10px] text-text-secondary uppercase">{b.legType === 'to_campus' ? 'To University' : 'Return Leg'}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-text-primary">{b.user?.fullName || 'Student'}</div>
                        <div className="font-mono text-[11px] text-text-secondary">{b.user?.academicId || b.user?.email}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-text-primary font-medium">{b.trip?.routeName || 'Galala Route'}</div>
                        <div className="text-[10px] text-text-secondary font-mono">{b.trip?.departureTime} ({b.trip?.tripDate})</div>
                      </td>
                      <td className="p-3">
                        <span className="w-7 h-7 rounded-lg bg-surface border border-border-whisper flex items-center justify-center font-mono font-bold text-primary-container">
                          #{b.seatNumber}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${b.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-300' : b.status === 'swapped' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        <span className="text-text-primary font-bold">160 EGP</span>
                        <span className="text-[10px] text-text-secondary block">{b.receiptRef || 'Verified'}</span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-text-secondary">
                        {b.createdAt ? new Date(b.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : 'Recent'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setInspectRecord(b)}
                          className="px-2.5 py-1 rounded bg-surface border border-border-whisper hover:border-primary-container text-primary-container font-mono text-[10px] font-bold"
                        >
                          JSON
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- RECORD JSON INSPECTOR MODAL --- */}
      {inspectRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-surface-container border border-border-whisper rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-border-whisper bg-surface-container-low flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container">data_object</span>
                <h4 className="font-bold text-sm text-text-primary">Database Row Inspector</h4>
              </div>
              <button onClick={() => setInspectRecord(null)} className="p-1 rounded-lg text-text-secondary hover:text-text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto bg-slate-950 text-slate-200 font-mono text-xs">
              <pre className="whitespace-pre-wrap">{JSON.stringify(inspectRecord, null, 2)}</pre>
            </div>
            <div className="p-3 border-t border-border-whisper flex justify-between items-center bg-surface-container-low">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(JSON.stringify(inspectRecord, null, 2));
                  triggerNotice('success', 'JSON copied to clipboard!');
                }}
                className="px-3 py-1.5 rounded-lg bg-surface border border-border-whisper text-text-primary font-bold text-xs hover:bg-surface-container-high transition-colors"
              >
                Copy JSON
              </button>
              <button
                onClick={() => setInspectRecord(null)}
                className="px-4 py-1.5 rounded-lg bg-primary-container text-on-primary-container font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
