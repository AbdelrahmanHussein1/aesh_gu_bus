import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bus Aesh — Galala University Booking',
  description: 'Premium real-time bus booking platform for Galala University students and supervisors.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main className="min-height-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
