import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/hooks/useAppStore';
import CookieConsentBanner from '@/components/layout/CookieConsentBanner';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bus.gu.edu.eg';

export const viewport: Viewport = {
  themeColor: '#000f74',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Bus Aesh — Official Galala University Smart Transit & Seat Booking Portal',
    template: '%s | Bus Aesh GU',
  },
  description:
    'Official seat reservation, live boarding synchronization, and fleet management platform for Galala University students, supervisors, and administration.',
  applicationName: 'Bus Aesh GU',
  authors: [{ name: 'Galala University Transport Department', url: 'https://gu.edu.eg' }],
  generator: 'Next.js',
  keywords: [
    'Galala University',
    'Bus Aesh',
    'جامعة الجلالة',
    'حجز باص الجلالة',
    'Galala Transit',
    'GU Transport',
    'Student Bus Reservation',
    'Galala Campus Bus',
  ],
  referrer: 'origin-when-cross-origin',
  creator: 'Galala University Transport Department',
  publisher: 'Galala University',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Bus Aesh — Official Galala University Transit Platform',
    description:
      'Official seat reservation and smart bus transit platform for Galala University students and staff across 29 lines.',
    url: siteUrl,
    siteName: 'Bus Aesh GU',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Bus Aesh — Galala University Smart Transit & Seat Booking Portal',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bus Aesh — Official Galala University Transit Platform',
    description:
      'Official seat reservation and smart bus transit platform for Galala University students and staff.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'EducationalOrganization',
        '@id': `${siteUrl}/#organization`,
        name: 'Galala University',
        alternateName: 'جامعة الجلالة',
        url: 'https://gu.edu.eg',
        logo: {
          '@type': 'ImageObject',
          url: `${siteUrl}/app-logo.png`,
          width: 256,
          height: 256,
        },
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Galala Plateau, Attaka',
          addressLocality: 'Suez',
          addressRegion: 'Suez Governorate',
          addressCountry: 'EG',
        },
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+20-100-000-0000',
          contactType: 'transport customer service',
          email: 'transport@gu.edu.eg',
          availableLanguage: ['Arabic', 'English'],
        },
      },
      {
        '@type': 'TransportationService',
        '@id': `${siteUrl}/#service`,
        name: 'Bus Aesh Transit Service',
        provider: { '@id': `${siteUrl}/#organization` },
        serviceType: 'University Campus Transit',
        areaServed: {
          '@type': 'AdministrativeArea',
          name: 'Greater Cairo and Suez',
        },
        offers: {
          '@type': 'Offer',
          price: '160',
          priceCurrency: 'EGP',
          availability: 'https://schema.org/InStock',
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: 'Bus Aesh — Galala University Transit',
        publisher: { '@id': `${siteUrl}/#organization` },
      },
    ],
  };

  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased bg-surface-bright text-text-primary selection:bg-blue-600 selection:text-white">
        <AppProvider>
          {children as any}
          <CookieConsentBanner />
        </AppProvider>
      </body>
    </html>
  );
}
