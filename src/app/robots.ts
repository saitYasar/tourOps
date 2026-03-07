import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/agency/', '/restaurant/', '/customer/', '/admin/', '/api/'],
      },
    ],
    sitemap: 'https://tourops.app/sitemap.xml',
  };
}
