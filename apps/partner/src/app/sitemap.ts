import type { MetadataRoute } from 'next';

// Solo las páginas públicas. El panel, el admin y la zona de partners no se publican.
const BASE = 'https://caminaapp.com';
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${BASE}/comercios`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/guia`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/terminos`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/privacidad`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
