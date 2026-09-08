'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/hooks/useAppStore';
import RouteSelector from '@/components/booking/RouteSelector';
import TripList from '@/components/booking/TripList';
import SeatGrid from '@/components/booking/SeatGrid';
import CheckoutModal from '@/components/booking/CheckoutModal';
import BookingPassCard from '@/components/booking/BookingPassCard';

export default function RiderDashboardPage() {
  const { user, role, isAuthLoading, refreshTrips, isTripsLoading } = useApp();
  const router = useRouter();
  useEffect(() => { document.title = 'Rider Dashboard — Bus Aesh'; }, []);

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary gap-2">
        <span className="material-symbols-outlined animate-spin text-primary-container">sync</span>
        <span>Loading rider portal...</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-surface border border-border-whisper shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
              Galala Transit Platform
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              المنظومة متصلة • Live
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-text-primary mt-1">
            حجز مقعد الحافلة • Book a Seat
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            مرحباً بك، <strong className="text-text-primary">{user.fullName || 'عزيزي الطالب'}</strong> • تصفح الحافلات المتاحة واحجز مقعدك المفضل.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refreshTrips()}
          disabled={isTripsLoading}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-surface-container hover:bg-surface-container/80 text-text-primary border border-border-whisper hover:border-blue-400 transition flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
          title="مزامنة وتحديث جدول الحافلات"
        >
          <span className={`material-symbols-outlined text-base ${isTripsLoading ? 'animate-spin text-blue-600' : 'text-blue-600'}`}>
            sync
          </span>
          <span>{isTripsLoading ? 'جاري التحديث...' : 'تحديث الحافلات'}</span>
        </button>
      </div>
      <RouteSelector />
      <TripList />
      <SeatGrid />
      <BookingPassCard />
      <CheckoutModal />
    </div>
  );
}
