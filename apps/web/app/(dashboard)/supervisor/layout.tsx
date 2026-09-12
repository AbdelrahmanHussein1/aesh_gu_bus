import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Line Supervisor On-Board Operations | Bus Aesh GU',
  description:
    'Real-time passenger manifest, anti-passback QR verification, manual boarding check-in, and on-the-fly seat swaps.',
  alternates: {
    canonical: '/supervisor',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
