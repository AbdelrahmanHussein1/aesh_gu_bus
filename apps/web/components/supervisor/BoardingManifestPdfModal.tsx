'use client';
import { useState, useMemo, useRef } from 'react';
import type { Trip, ManifestItem } from '@/lib/types';
import { checkManifestUnlock } from '@/lib/manifest-unlock';

interface Props {
  trip: Trip | null;
  manifest: ManifestItem[];
  onClose: () => void;
  supervisorName?: string;
  supervisorEmail?: string;
}

export default function BoardingManifestPdfModal({
  trip,
  manifest,
  onClose,
  supervisorName,
  supervisorEmail,
}: Props) {
  const [devOverride, setDevOverride] = useState(false);
  const [filterMode, setFilterMode] = useState<'boarded_only' | 'all'>('boarded_only');
  const printRef = useRef<HTMLDivElement>(null);

  // Filter only passengers who actually boarded (or all passengers if selected)
  const boardedPassengers = useMemo(() => {
    return manifest.filter(m => m.isBoarded);
  }, [manifest]);

  const displayedList = filterMode === 'boarded_only' ? boardedPassengers : manifest;

  const unlockStatus = useMemo(() => {
    return checkManifestUnlock(trip, boardedPassengers.length, devOverride);
  }, [trip, boardedPassengers.length, devOverride]);

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = trip?.tripDate || new Date().toISOString().split('T')[0];
  const departureTime = trip?.departureTime || '09:00 AM';
  const busName = trip?.bus?.name || 'Bus Aesh';
  const busPlate = trip?.bus?.licensePlate || 'ق هـ ر ٤٩٢١';
  const routeName = trip?.route ? `${trip.route.nameAr} (${trip.route.nameEn})` : 'Galala Route';
  const supervisorDisplay = supervisorName || trip?.supervisors?.[0]?.nameEn || trip?.supervisors?.[0]?.nameAr || 'Galala Transport Supervisor';
  const driverDisplay = trip?.driver?.nameAr || trip?.driver?.nameEn || 'Mohamed Sobhi (محمد صبحي)';

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static print:h-auto">
      {/* Container Card */}
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Screen Header (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Official Boarding Manifest PDF</h3>
              <p className="text-xs text-slate-500">كشف صعود ركاب الرحلة الرسمي المعتمد</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Toggle */}
            <div className="flex bg-slate-200 p-1 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterMode('boarded_only')}
                className={`px-3 py-1 rounded-md transition ${filterMode === 'boarded_only' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`}
              >
                Boarded Only ({boardedPassengers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded-md transition ${filterMode === 'all' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`}
              >
                All Confirmed ({manifest.length})
              </button>
            </div>

            {/* Dev Force Unlock Toggle */}
            <button
              type="button"
              onClick={() => setDevOverride(p => !p)}
              className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition ${
                devOverride ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold' : 'bg-slate-100 text-slate-600 border-slate-300'
              }`}
              title="Toggle Dev Unlock Override"
            >
              {devOverride ? '⚡ Dev Override: ON' : '⚡ Dev Override'}
            </button>

            {/* Print / Save PDF Button */}
            <button
              type="button"
              disabled={!unlockStatus.isUnlocked}
              onClick={handlePrint}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm ${
                unlockStatus.isUnlocked
                  ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-base">print</span>
              Print / Save as PDF
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              title="Close Modal"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Lock Warning Notice if locked */}
        {!unlockStatus.isUnlocked && (
          <div className="bg-amber-50 border-b border-amber-200 p-3 px-6 text-xs text-amber-900 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2 font-medium">
              <span className="material-symbols-outlined text-amber-600 text-base">lock</span>
              <span>
                <strong>الكشف مغلق حالياً:</strong> {unlockStatus.reasonAr}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDevOverride(true)}
              className="text-amber-800 underline hover:text-amber-950 font-bold text-[11px]"
            >
              تجاوز القفل للتجربة (Unlock for Testing)
            </button>
          </div>
        )}

        {/* Scrollable Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-6 print:p-0 print:overflow-visible font-sans" id="printable-boarding-manifest" ref={printRef}>
          
          {/* 1. Official Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            {/* Galala Logo Top Left */}
            <div className="flex items-center gap-4">
              <img
                src="/gu-logo-colored.png"
                alt="Galala University"
                className="h-16 w-auto object-contain"
              />
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">جامعة الجلالة • Galala University</h1>
                <p className="text-xs font-bold text-blue-700 tracking-wide">منظومة النقل الذكي وإدارة أسطول الحافلات (Bus Aesh)</p>
                <p className="text-[10px] text-slate-500">Smart Transit Platform & Fleet Operations Center</p>
              </div>
            </div>

            {/* Official Seal / Ministry Header (Right) */}
            <div className="text-right text-xs space-y-0.5">
              <p className="font-bold text-slate-900">جمهورية مصر العربية</p>
              <p className="font-semibold text-slate-700">وزارة التعليم العالي والبحث العلمي</p>
              <p className="text-[11px] text-slate-600 font-mono">كشف رسمي معتمد • Official Report</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded bg-blue-100 text-blue-900 font-mono font-bold text-[10px] border border-blue-200">
                TRIP #{trip?.id || '4899'}
              </span>
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center my-2">
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">
              Official Passenger Boarding Manifest & Dispatch Report
            </h2>
            <p className="text-sm font-bold text-slate-700 font-serif">
              كشف صعود ركاب الرحلة الرسمي والتوزيع الداخلي للحافلة
            </p>
          </div>

          {/* 2. Trip Metadata Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-300 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Trip Date & Shift / التاريخ والشفت</span>
              <span className="font-black text-slate-900 font-mono text-xs">{formattedDate} • {departureTime}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Transit Route / خط السير</span>
              <span className="font-bold text-slate-900 truncate block">{routeName}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Bus Name & Plate / الحافلة واللوحة</span>
              <span className="font-bold text-slate-900 font-mono">{busName} ({busPlate})</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Boarded / إجمالي الصعود</span>
              <span className="font-black text-blue-700 font-mono text-sm">
                {boardedPassengers.length} / {trip?.bus?.totalSeats || 50} Seats
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Supervisor In Charge / مشرف الرحلة</span>
              <span className="font-bold text-slate-900">{supervisorDisplay}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Assigned Driver / سائق الحافلة</span>
              <span className="font-bold text-slate-900">{driverDisplay}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Direction / الاتجاه</span>
              <span className="font-bold text-slate-900">
                {trip?.direction === 'to_campus' ? 'To Campus (ذهاب للجامعة)' : 'From Campus (عودة من الجامعة)'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Report Generated / وقت الاستخراج</span>
              <span className="font-mono text-slate-700 text-[11px]">
                {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* 3. Passenger Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-[11px]">
                  <th className="py-2.5 px-3 border-r border-slate-700 text-center w-12">#</th>
                  <th className="py-2.5 px-3 border-r border-slate-700 text-center w-16">Seat</th>
                  <th className="py-2.5 px-3 border-r border-slate-700">Student Full Name (اسم الطالب)</th>
                  <th className="py-2.5 px-3 border-r border-slate-700 font-mono">Academic ID</th>
                  <th className="py-2.5 px-3 border-r border-slate-700">University Email</th>
                  <th className="py-2.5 px-3 border-r border-slate-700 text-center font-mono">Code</th>
                  <th className="py-2.5 px-3 border-r border-slate-700 text-center">Boarding Time</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayedList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 font-medium italic">
                      No boarded passengers recorded for this shift yet.
                    </td>
                  </tr>
                ) : (
                  displayedList.map((passenger, idx) => {
                    const boardTimeStr = passenger.boardedAt
                      ? new Date(passenger.boardedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : '—';

                    return (
                      <tr key={passenger.bookingId || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-mono text-slate-500 text-[10px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-black font-mono text-blue-700">
                          {passenger.seatNumber}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-900">
                          {passenger.riderName}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 font-mono text-slate-700 text-[11px]">
                          {passenger.academicId || '—'}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 font-mono text-slate-600 text-[11px] truncate max-w-[180px]">
                          {passenger.riderEmail}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-mono font-bold text-slate-800 text-[10px]">
                          {passenger.boardingCode || 'GU-SCAN'}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-mono font-semibold text-slate-700 text-[11px]">
                          {boardTimeStr}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {passenger.isBoarded ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ✓ Boarded
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 4. Formal Verification & Signatures Box */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t-2 border-slate-300 text-xs">
            <div className="border border-slate-300 p-4 rounded-xl bg-slate-50 space-y-2">
              <span className="font-bold text-slate-900 block text-xs">
                توقيع مشرف الرحلة المعتمد (Line Supervisor Approval)
              </span>
              <p className="text-[11px] text-slate-600">
                أقر أنا المشرف المذكور أعلاه بصعود الطلاب الموضحة أسماؤهم وتطابق أرقام المقاعد وكود الصعود.
              </p>
              <div className="pt-8 flex justify-between items-end border-b border-dashed border-slate-400">
                <span className="text-slate-500 text-[10px]">التوقيع: .......................................</span>
                <span className="font-mono text-slate-500 text-[10px]">التاريخ: {formattedDate}</span>
              </div>
            </div>

            <div className="border border-slate-300 p-4 rounded-xl bg-slate-50 space-y-2">
              <span className="font-bold text-slate-900 block text-xs">
                اعتماد إدارة الحركة والنقل (Transport Operations Seal)
              </span>
              <p className="text-[11px] text-slate-600">
                تم اعتماد كشف الركاب ومطابقته لمنظومة الحجز الإلكتروني لجامعة الجلالة (Bus Aesh).
              </p>
              <div className="pt-8 flex justify-between items-end border-b border-dashed border-slate-400">
                <span className="text-slate-500 text-[10px]">خاتم الاعتماد: .......................................</span>
                <span className="font-mono text-slate-500 text-[10px]">المسؤول: إدارة النقل</span>
              </div>
            </div>
          </div>

          {/* Footer Directives */}
          <div className="text-center text-[10px] text-slate-400 border-t border-slate-200 pt-2 font-mono">
            Galala University Transit Platform • Confidential Operational Record • Produced by Bus Aesh System
          </div>
        </div>
      </div>

      {/* Print CSS Specific Rules */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          nav, aside, header, footer, .print\\:hidden {
            display: none !important;
          }
          #printable-boarding-manifest {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
