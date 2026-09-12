import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Dashboard & Seat Reservations | Bus Aesh GU',
  description:
    'Browse 29 official Galala transit routes, select and lock your 50-seat cabin seat in real-time, view active boarding passes with encrypted QR.',
  alternates: {
    canonical: '/rider',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
