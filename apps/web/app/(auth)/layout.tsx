import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bus Aesh — Official Galala University Smart Transit & Seat Booking Portal',
  description:
    'Book, reserve, and manage official Galala University bus transportation. Safe, synchronized daily transit across 29 routes connecting Cairo and Suez with Galala Campus.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Bus Aesh — Official Galala University Transit Platform',
    description:
      'Official seat reservation and smart transit platform for Galala University students and faculty across 29 routes.',
    url: 'https://bus.gu.edu.eg',
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
