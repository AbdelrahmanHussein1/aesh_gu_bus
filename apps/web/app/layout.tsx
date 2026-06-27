import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/hooks/useAppStore';

export const metadata: Metadata = {
  title: 'Bus Aesh — Galala University Booking',
  description: 'Premium real-time bus booking platform for Galala University students and supervisors.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&amp;family=Outfit:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
      </head>
      <body>
        <AppProvider>
          {children as any}
        </AppProvider>
      </body>
    </html>
  );
}
