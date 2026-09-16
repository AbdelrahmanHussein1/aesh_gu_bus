import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bus.gu.edu.eg';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/rider', '/pass', '/privacy', '/terms'],
        disallow: ['/admin', '/supervisor', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
