import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/partners', '/admin', '/api/', '/inicio', '/perfil', '/canjes', '/cuenta', '/equipo', '/estadisticas', '/plan', '/catalogo', '/avisos', '/eventos', '/login', '/r/', '/join-group/'],
      },
    ],
    sitemap: 'https://caminaapp.com/sitemap.xml',
    host: 'https://caminaapp.com',
  };
}
