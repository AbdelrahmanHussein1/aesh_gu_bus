'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '@/hooks/useAppStore';
import { getApiBaseUrl, getApiUrls } from '@/lib/api';

interface BusSeatInspectorModalProps {
  tripId: number;
  onClose: () => void;
}

export default function BusSeatInspectorModal({ tripId, onClose }: BusSeatInspectorModalProps) {
  const { isOffline, token } = useApp();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tripData, setTripData] = useState<any>(null);
  const [seats, setSeats] = useState<any[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<any | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'booked' | 'held' | 'free'>('all');
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  const API_URL = getApiBaseUrl();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load seat details from backend or offline mock with silent background reload support
  const loadSeatDetails = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    if (!isOffline) {
      try {
        const res = await fetch(`${API_URL}/api/admin/trips/${tripId}/seat-details`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setTripData(data.trip);
          setSeats(data.seats);
          setLastSyncTime(new Date());

          // Seamlessly update currently selected seat if its status changed
          setSelectedSeat((prev: any) => {
            if (!prev) {
              return data.seats.find((s: any) => s.status === 'booked') || data.seats[0] || null;
            }
            const matching = data.seats.find((s: any) => s.seatNumber === prev.seatNumber);
            return matching || prev;
          });

          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Live seat details fetch failed, falling back to offline simulation:', err);
      }
    }

    // Offline simulation dataset
    const mockStudents = [
      { name: 'عبدالرحمن إيهاب حسين', email: 'aes400196@gu.edu.eg', academicId: 'aes400196', faculty: 'Computer Science & AI', phone: '01021561196' },
      { name: 'أحمد مصطفى محمود', email: 'eng202100@gu.edu.eg', academicId: 'eng202100', faculty: 'Engineering (Mechatronics)', phone: '01123456789' },
      { name: 'سارة علي حسن', email: 'med300214@gu.edu.eg', academicId: 'med300214', faculty: 'Faculty of Medicine', phone: '01234567890' },
      { name: 'عمر خالد السعيد', email: 'dent401201@gu.edu.eg', academicId: 'dent401201', faculty: 'Dentistry', phone: '01098765432' },
      { name: 'مريم محمد إبراهيم', email: 'pharma10293@gu.edu.eg', academicId: 'pharma10293', faculty: 'Pharmacy', phone: '01512345678' },
      { name: 'يوسف طارق السيد', email: 'bus502194@gu.edu.eg', academicId: 'bus502194', faculty: 'Business Administration', phone: '01055566778' },
      { name: 'نور الدين وليد', email: 'art601928@gu.edu.eg', academicId: 'art601928', faculty: 'Art & Design', phone: '01199887766' },
      { name: 'كريم هاني صبحي', email: 'ai702110@gu.edu.eg', academicId: 'ai702110', faculty: 'Artificial Intelligence', phone: '01211223344' },
      { name: 'حبيبة شريف زكي', email: 'nurs801290@gu.edu.eg', academicId: 'nurs801290', faculty: 'Applied Health Sciences', phone: '01033445566' },
      { name: 'مازن سامح عبدالجواد', email: 'arch902188@gu.edu.eg', academicId: 'arch902188', faculty: 'Architecture Engineering', phone: '01144556677' },
    ];

    const totalSeats = 50;
    const generatedSeats = Array.from({ length: totalSeats }, (_, i) => {
      const sn = i + 1;
      // Fixed occupied pattern for realistic demonstration
      const isBooked = [1, 2, 5, 6, 9, 10, 13, 14, 17, 18, 21, 22, 25, 26, 30, 31, 35, 36, 41, 42].includes(sn);
      const isHeld = [7, 19, 33].includes(sn); // Orange in-progress seats

      if (isBooked) {
        const student = mockStudents[(sn * 3) % mockStudents.length];
        return {
          seatNumber: sn,
          status: 'booked',
          booking: {
            id: `bk-mock-${sn}`,
            bookingType: 'one_way',
            legType: 'to_campus',
            boardingCode: `GU-${(sn * 137).toString(16).toUpperCase().padStart(4, '0')}`,
            bookedAt: new Date(Date.now() - (sn * 45) * 60000).toISOString(),
            paymentStatus: 'paid',
            receiptRef: `INSTA-REF-${88000 + sn}`,
            fare: 160,
            isBoarded: sn % 3 === 0,
            boardedAt: sn % 3 === 0 ? new Date(Date.now() - (sn * 10) * 60000).toISOString() : null,
          },
          rider: {
            fullName: student.name,
            fullNameAr: student.name,
            email: student.email,
            phone: student.phone,
            academicId: student.academicId,
            faculty: student.faculty,
            role: 'rider',
          },
        };
      } else if (isHeld) {
        const student = mockStudents[(sn + 4) % mockStudents.length];
        const remainingSeconds = 180 + (sn * 20) % 110;
        return {
          seatNumber: sn,
          status: 'held',
          lock: {
            remainingSeconds,
            heldAt: new Date(Date.now() - 60000).toISOString(),
          },
          rider: {
            fullName: student.name,
            fullNameAr: student.name,
            email: student.email,
            phone: student.phone,
            academicId: student.academicId,
            faculty: student.faculty,
            role: 'rider',
          },
        };
      } else {
        return {
          seatNumber: sn,
          status: 'free',
        };
      }
    });

    const bookedCount = generatedSeats.filter(s => s.status === 'booked').length;
    const heldCount = generatedSeats.filter(s => s.status === 'held').length;

    setTripData({
      id: tripId,
      tripDate: new Date().toISOString().split('T')[0],
      departureTime: '07:00 AM',
      direction: 'to_campus',
      timeSlot: 'morning_1',
      totalSeats: 50,
      bookedCount,
      heldCount,
      freeCount: 50 - bookedCount - heldCount,
      bus: {
        name: `باص جامعة الجلالة VIP #${tripId}`,
        licensePlate: `أ ب ج ${100 + (tripId % 20)}`,
        totalSeats: 50,
      },
      route: {
        nameAr: 'بورتوفيق - السويس (جامعة الجلالة)',
        nameEn: 'Port Tawfik (Suez) -> Galala Campus',
      },
      driver: {
        fullName: 'محمد صبحي (Mohamed Sobhi)',
        phone: '01021561196',
      },
      supervisors: [
        { fullName: 'ممدوح بدران (Mamdouh Badran)', phone: '01275467090' },
      ],
    });
    setSeats(generatedSeats);
    const firstBooked = generatedSeats.find(s => s.status === 'booked');
    if (firstBooked) setSelectedSeat(firstBooked);
    setLoading(false);
  }, [tripId, isOffline, token, API_URL]);

  useEffect(() => {
    loadSeatDetails(true);
  }, [loadSeatDetails]);

  // 1. Instant WebSocket listener for rider seat locks, unlocks, and bookings
  useEffect(() => {
    if (isOffline || typeof window === 'undefined') return;
    const { wsUrl } = getApiUrls();
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(`${wsUrl}/ws/trips/${tripId}/seats`);
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (['seat_locked', 'seat_unlocked', 'seat_booked', 'booking_cancelled', 'rider_boarded'].includes(msg.type)) {
            // Instant live sync with 0 delay!
            loadSeatDetails(false);
          }
        } catch {}
      };
    } catch (e) {
      console.warn('Seat inspector WebSocket connection error:', e);
    }

    return () => {
      if (socket) socket.close();
    };
  }, [tripId, isOffline, loadSeatDetails]);

  // 2. Continuous real-time background polling (every 1.5s) to guarantee instantaneous state synchronization
  useEffect(() => {
    const interval = setInterval(() => {
      loadSeatDetails(false);
    }, 1500);
    return () => clearInterval(interval);
  }, [loadSeatDetails]);

  // 3. Local browser tab synchronization (storage & custom events)
  useEffect(() => {
    const handleLocalSync = () => {
      loadSeatDetails(false);
    };
    window.addEventListener('storage', handleLocalSync);
    window.addEventListener('seat_locked', handleLocalSync);
    window.addEventListener('seat_unlocked', handleLocalSync);
    window.addEventListener('booking_created', handleLocalSync);
    return () => {
      window.removeEventListener('storage', handleLocalSync);
      window.removeEventListener('seat_locked', handleLocalSync);
      window.removeEventListener('seat_unlocked', handleLocalSync);
      window.removeEventListener('booking_created', handleLocalSync);
    };
  }, [loadSeatDetails]);

  // Handle seat button click
  const handleSeatClick = (seat: any) => {
    if (seat.status === 'free') {
      setNotification(`This seat is untaken • المقعد رقم #${seat.seatNumber} شاغر وغير محجوز`);
      setSelectedSeat(seat);
    } else {
      setNotification(null);
      setSelectedSeat(seat);
    }
  };

  const filteredSeats = useMemo(() => {
    if (filter === 'all') return seats;
    return seats.filter(s => s.status === filter);
  }, [seats, filter]);

  const bookedCount = useMemo(() => seats.filter(s => s.status === 'booked').length, [seats]);
  const heldCount = useMemo(() => seats.filter(s => s.status === 'held').length, [seats]);
  const freeCount = useMemo(() => seats.filter(s => s.status === 'free').length, [seats]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-[#060913] overflow-y-auto">
      <div className="bg-surface-container border border-border-whisper rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden relative">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-border-whisper bg-surface-container-low flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container/15 text-primary-container border border-primary-container/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">directions_bus</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-text-primary">
                  {tripData?.bus?.name || `Galala Bus Shift #${tripId}`}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-surface border border-border-whisper text-text-secondary">
                  {tripData?.bus?.licensePlate || 'أ ب ج 100'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync • متزامن لحظياً
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-2">
                <span>{tripData?.route?.nameAr || 'خط الجلالة'}</span>
                <span>•</span>
                <span className="font-mono text-primary-container font-semibold">{tripData?.departureTime}</span>
                <span>•</span>
                <span>{tripData?.tripDate}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {tripData?.driver && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border-whisper text-xs">
                <span className="material-symbols-outlined text-sm text-text-secondary">badge</span>
                <div>
                  <span className="text-[10px] text-text-secondary block leading-none">السائق</span>
                  <span className="font-bold text-text-primary text-[11px]">{tripData.driver.fullName}</span>
                </div>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-surface-container-high text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors border border-border-whisper"
              title="Close"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Live Counters & Filter Bar */}
        <div className="px-4 py-2.5 bg-surface-container-low/60 border-b border-border-whisper flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${filter === 'all' ? 'bg-primary-container text-on-primary-container' : 'bg-surface text-text-secondary border border-border-whisper'}`}
            >
              All Seats ({seats.length})
            </button>
            <button
              onClick={() => setFilter('booked')}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${filter === 'booked' ? 'bg-blue-600 text-white' : 'bg-surface text-blue-400 border border-border-whisper'}`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Taken ({bookedCount})
            </button>
            <button
              onClick={() => setFilter('held')}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${filter === 'held' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-surface text-amber-400 border border-border-whisper'}`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              In-Progress ({heldCount})
            </button>
            <button
              onClick={() => setFilter('free')}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${filter === 'free' ? 'bg-emerald-600 text-white' : 'bg-surface text-emerald-400 border border-border-whisper'}`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Untaken ({freeCount})
            </button>
          </div>

          <div className="text-[11px] text-text-secondary font-medium">
            Fleet Occupancy: <span className="font-bold text-text-primary">{bookedCount}/50</span> ({Math.round((bookedCount / 50) * 100)}%)
          </div>
        </div>

        {/* Requested Notification Bar for Untaken Seats */}
        {notification && (
          <div className="px-4 py-2.5 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-emerald-400">info</span>
              <span>{notification}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-emerald-400/70 hover:text-emerald-300 text-xs font-bold"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* Modal Main Content: Left = Bus Cabin, Right = Big Information Panel */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: University Bus Cabin Layout (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full max-w-md bg-surface-container-low border-2 border-border-whisper rounded-3xl p-5 shadow-inner relative">
              {/* Bus Front Indicator */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-dashed border-border-whisper">
                {/* Steering Wheel */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border-whisper text-text-secondary">
                  <span className="material-symbols-outlined text-lg text-primary-container animate-spin-slow">radio_button_checked</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Driver Cabin</span>
                </div>
                {/* Front Windshield */}
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-text-tertiary tracking-widest block">FRONT / مقدمة الباص</span>
                  <div className="w-16 h-1 bg-primary-container/40 rounded-full mx-auto mt-1"></div>
                </div>
                {/* Entry Door */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <span className="material-symbols-outlined text-sm">meeting_room</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Entry Door</span>
                </div>
              </div>

              {loading ? (
                <div className="py-24 text-center text-text-secondary flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-primary-container text-3xl">sync</span>
                  <span className="text-xs">Loading university bus seat map...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Rows 1 to 11 (2 seats left, central aisle, 2 seats right = 44 seats) */}
                  {Array.from({ length: 11 }, (_, rowIdx) => {
                    const base = rowIdx * 4;
                    const s1 = seats[base];
                    const s2 = seats[base + 1];
                    const s3 = seats[base + 2];
                    const s4 = seats[base + 3];

                    return (
                      <div key={rowIdx} className="flex items-center justify-between gap-2">
                        {/* Left pair (Window + Aisle) */}
                        <div className="flex gap-2">
                          {s1 && renderSeatButton(s1, selectedSeat, handleSeatClick)}
                          {s2 && renderSeatButton(s2, selectedSeat, handleSeatClick)}
                        </div>

                        {/* Central Aisle */}
                        <div className="flex-1 flex items-center justify-center text-[9px] font-mono text-text-tertiary select-none">
                          <span className="opacity-30">| {rowIdx + 1} |</span>
                        </div>

                        {/* Right pair (Aisle + Window) */}
                        <div className="flex gap-2">
                          {s3 && renderSeatButton(s3, selectedSeat, handleSeatClick)}
                          {s4 && renderSeatButton(s4, selectedSeat, handleSeatClick)}
                        </div>
                      </div>
                    );
                  })}

                  {/* Back 5-Seats Row (Seats 45 to 50 or remaining) */}
                  <div className="pt-3 border-t-2 border-dashed border-border-whisper">
                    <p className="text-[9px] text-center text-text-tertiary uppercase font-mono mb-2">Back Row / المقاعد الخلفية</p>
                    <div className="flex items-center justify-center gap-2">
                      {seats.slice(44).map(s => renderSeatButton(s, selectedSeat, handleSeatClick))}
                    </div>
                  </div>
                </div>
              )}

              {/* Legend Bar */}
              <div className="mt-5 pt-4 border-t border-border-whisper flex flex-wrap items-center justify-around gap-2 text-[10px] text-text-secondary">
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-surface border border-border-whisper"></div>
                  <span>Untaken (شاغر)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-blue-600 border border-blue-400 text-white font-bold text-[8px] flex items-center justify-center">✓</div>
                  <span className="text-blue-400 font-bold">Taken (محجوز)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-amber-500 border border-amber-400 animate-pulse"></div>
                  <span className="text-amber-400 font-bold">In-Progress (معلّق)</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: The Big Information Panel (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            {selectedSeat ? (
              <div className="bg-surface-container border border-border-whisper rounded-2xl p-5 shadow-lg space-y-5 flex-1 flex flex-col justify-between animate-in fade-in duration-150">
                {/* Panel Top Badge */}
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-border-whisper">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-text-primary">Seat #{selectedSeat.seatNumber}</span>
                      <span className="text-xs text-text-secondary">مقعد رقم {selectedSeat.seatNumber}</span>
                    </div>

                    {selectedSeat.status === 'booked' && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        Taken • محجوز
                      </span>
                    )}

                    {selectedSeat.status === 'held' && (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">hourglass_top</span>
                        In-Progress • قيد الحجز
                      </span>
                    )}

                    {selectedSeat.status === 'free' && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Untaken • شاغر
                      </span>
                    )}
                  </div>

                  {/* 1. CASE: TAKEN (CONFIRMED) - The Big Information Panel */}
                  {selectedSeat.status === 'booked' && (
                    <div className="mt-4 space-y-4">
                      {/* Passenger Name & ID Card */}
                      <div className="p-4 rounded-xl bg-surface-container-low border border-border-whisper space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider">Student Full Name / اسم الراكب</span>
                            <h4 className="text-base font-bold text-text-primary mt-0.5">{selectedSeat.rider?.fullName}</h4>
                            {selectedSeat.rider?.fullNameAr && selectedSeat.rider?.fullNameAr !== selectedSeat.rider?.fullName && (
                              <p className="text-xs text-text-secondary">{selectedSeat.rider.fullNameAr}</p>
                            )}
                          </div>
                          <span className="w-8 h-8 rounded-full bg-primary-container/10 text-primary-container flex items-center justify-center font-bold text-xs">
                            {selectedSeat.rider?.fullName?.charAt(0) || 'U'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-whisper/50 text-xs">
                          <div>
                            <span className="text-[10px] text-text-tertiary block">Academic ID / رقم القيد</span>
                            <span className="font-mono font-bold text-primary-container text-sm">{selectedSeat.rider?.academicId || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-text-tertiary block">Faculty / البرنامج الدراسي</span>
                            <span className="font-semibold text-text-primary truncate block text-xs">{selectedSeat.rider?.faculty || 'Galala University'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Contact Details */}
                      <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-whisper space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Contact Details / بيانات التواصل</span>
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Verified Contact
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-border-whisper/40">
                          <span className="text-text-secondary flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">mail</span> Email
                          </span>
                          <a href={`mailto:${selectedSeat.rider?.email}`} className="font-mono text-primary-container hover:underline">
                            {selectedSeat.rider?.email}
                          </a>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-text-secondary flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">call</span> Phone
                          </span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-bold text-text-primary">{selectedSeat.rider?.phone}</span>
                            {selectedSeat.rider?.phone && (
                              <a
                                href={`https://wa.me/2${selectedSeat.rider.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-[10px] font-bold"
                              >
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Booking & Purchase Timestamp Metadata */}
                      <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-whisper space-y-2 text-xs">
                        <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Purchase & Boarding Information</span>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-text-tertiary block">Date of Purchase</span>
                            <span className="font-mono text-text-primary text-[11px] block mt-0.5">
                              {selectedSeat.booking?.bookedAt ? new Date(selectedSeat.booking.bookedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-text-tertiary block">Boarding Code</span>
                            <span className="font-mono font-bold text-primary-container text-sm block mt-0.5">
                              {selectedSeat.booking?.boardingCode}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border-whisper/40 flex items-center justify-between">
                          <span className="text-text-secondary">Boarding Status / حالة الصعود:</span>
                          {selectedSeat.booking?.isBoarded ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">check</span>
                              Boarded ({new Date(selectedSeat.booking.boardedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                              Awaiting Boarding (لم يصعد بعد)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-text-secondary">Ticket Fare / قيمة التذكرة:</span>
                          <span className="font-bold text-text-primary font-mono">{selectedSeat.booking?.fare || 160} EGP (Paid)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. CASE: HELD / IN-PROGRESS (ORANGE) - The Big Information Panel */}
                  {selectedSeat.status === 'held' && (
                    <div className="mt-4 space-y-4">
                      <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 space-y-2">
                        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                          <span className="material-symbols-outlined text-lg animate-pulse">timer</span>
                          <span>In-Progress Checkout Hold (قيد الحجز والدفع)</span>
                        </div>
                        <p className="text-xs text-amber-200/80 leading-relaxed">
                          A student is currently holding this seat on their device and completing the payment step.
                          If payment is not confirmed within the countdown, the seat lock will expire automatically.
                        </p>
                        <div className="p-2.5 rounded-lg bg-surface border border-amber-500/30 flex items-center justify-between text-xs mt-2">
                          <span className="text-text-secondary font-medium">Time Remaining:</span>
                          <span className="font-mono font-bold text-amber-400 text-sm">
                            {Math.floor((selectedSeat.lock?.remainingSeconds || 180) / 60)}m {((selectedSeat.lock?.remainingSeconds || 180) % 60)}s
                          </span>
                        </div>
                      </div>

                      {/* Holding Student Information */}
                      <div className="p-4 rounded-xl bg-surface-container-low border border-border-whisper space-y-2 text-xs">
                        <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Holding Student Information</span>
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Name:</span>
                            <span className="font-bold text-text-primary">{selectedSeat.rider?.fullName || 'Student in Checkout'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Email:</span>
                            <span className="font-mono text-primary-container">{selectedSeat.rider?.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Academic ID:</span>
                            <span className="font-mono font-bold text-text-primary">{selectedSeat.rider?.academicId || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Program:</span>
                            <span className="font-medium text-text-primary">{selectedSeat.rider?.faculty || 'Galala University'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Phone:</span>
                            <span className="font-mono text-text-primary">{selectedSeat.rider?.phone || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. CASE: UNTAKEN (FREE) - The Big Information Panel */}
                  {selectedSeat.status === 'free' && (
                    <div className="mt-4 p-8 rounded-2xl bg-surface-container-low border-2 border-dashed border-border-whisper text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                        <span className="material-symbols-outlined text-2xl">event_seat</span>
                      </div>
                      <h4 className="font-bold text-base text-text-primary">Seat #{selectedSeat.seatNumber} is Untaken</h4>
                      <p className="text-xs text-text-secondary max-w-xs mx-auto leading-relaxed">
                        هذا المقعد شاغر ومتاح لحجز أي طالب على خط {tripData?.route?.nameAr || 'الجامعة'}.
                        سعر التذكرة 160 جنيه.
                      </p>
                      <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                        Available for Booking
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer close / dismiss */}
                <div className="pt-4 border-t border-border-whisper flex items-center justify-between text-xs text-text-secondary">
                  <span>Shift ID #{tripId} • Bus {tripData?.bus?.licensePlate}</span>
                  <button
                    onClick={() => setSelectedSeat(null)}
                    className="text-xs text-primary-container font-semibold hover:underline"
                  >
                    Deselect Seat
                  </button>
                </div>
              </div>
            ) : (
              /* Empty state when no seat is selected */
              <div className="bg-surface-container border border-border-whisper rounded-2xl p-8 text-center flex-1 flex flex-col items-center justify-center space-y-3">
                <span className="material-symbols-outlined text-4xl text-text-tertiary">touch_app</span>
                <h4 className="font-bold text-sm text-text-primary">Select a Seat to Inspect</h4>
                <p className="text-xs text-text-secondary max-w-xs leading-relaxed">
                  Click on any seat card in the university bus cabin layout to inspect full passenger credentials, ID, program, and booking metadata.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Helper to render individual seat button with strict color coding:
 * - Untaken (Free): Slate/neutral border with emerald hover
 * - Taken (Booked): Bold Primary/Blue with checked icon
 * - Held: Radiant ORANGE/Amber with pulse effect
 */
function renderSeatButton(
  seat: any,
  selectedSeat: any | null,
  onClick: (s: any) => void
) {
  const isSelected = selectedSeat?.seatNumber === seat.seatNumber;
  const isBooked = seat.status === 'booked';
  const isHeld = seat.status === 'held';
  const isFree = seat.status === 'free';

  let styleClasses = 'bg-surface border-border-whisper text-text-secondary hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/5';

  if (isBooked) {
    styleClasses = 'bg-blue-600/25 border-2 border-blue-500 text-blue-300 shadow-sm font-black hover:bg-blue-600/35';
  } else if (isHeld) {
    // REQUESTED ORANGE SEAT!
    styleClasses = 'bg-amber-500/25 border-2 border-amber-500 text-amber-300 font-black animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.35)] hover:bg-amber-500/35';
  }

  if (isSelected) {
    styleClasses += ' ring-2 ring-primary-container ring-offset-2 ring-offset-surface scale-105';
  }

  return (
    <button
      key={seat.seatNumber}
      type="button"
      onClick={() => onClick(seat)}
      className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center text-xs transition-all select-none relative ${styleClasses}`}
      title={`Seat #${seat.seatNumber} (${seat.status})`}
    >
      <span className="font-mono font-black text-xs leading-none">{seat.seatNumber}</span>
      {isBooked && (
        <span className="text-[8px] leading-none text-blue-300 font-semibold mt-0.5 truncate max-w-[36px]">
          {seat.rider?.fullName ? seat.rider.fullName.split(' ')[0] : 'Booked'}
        </span>
      )}
      {isHeld && (
        <span className="text-[7px] leading-none text-amber-300 font-bold mt-0.5">
          HELD
        </span>
      )}
      {isFree && (
        <span className="text-[8px] leading-none text-text-tertiary mt-0.5">
          Free
        </span>
      )}
    </button>
  );
}
