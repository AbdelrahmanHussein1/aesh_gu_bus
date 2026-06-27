'use client';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import RouteSelector from '@/components/booking/RouteSelector';
import TripList from '@/components/booking/TripList';
import SeatGrid from '@/components/booking/SeatGrid';
import CheckoutModal from '@/components/booking/CheckoutModal';
import BookingPassCard from '@/components/booking/BookingPassCard';

export default function RiderDashboardPage() {
  const { user } = useAuth();
  useEffect(() => { document.title = 'Rider Dashboard — Bus Aesh'; }, []);

  if (!user || user.role !== 'rider') {
    return (
      <div className="flex items-center justify-center h-full p-8 text-text-secondary">
        <span className="material-symbols-outlined mr-2">error</span>
        Insufficient permissions — Rider access required.
      </div>
    );
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
