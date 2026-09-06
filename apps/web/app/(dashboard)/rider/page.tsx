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
  const { user, role, isAuthLoading } = useApp();
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
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Book a Trip</h1>
        <p className="text-sm text-text-secondary mt-1">Find, reserve, and manage your university bus seats.</p>
      </div>
      <RouteSelector />
      <TripList />
      <SeatGrid />
      <BookingPassCard />
      <CheckoutModal />
    </div>
  );
}
