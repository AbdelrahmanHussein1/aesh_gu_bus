import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Transit Dispatch & Administrative Hub | Bus Aesh GU',
  description:
    'Master transport control: manage bus shifts, dual-shift scheduling, monitor fleet occupancy, and review security audit trails.',
  alternates: {
    canonical: '/admin',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
