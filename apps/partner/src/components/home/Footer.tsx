import Image from 'next/image';
import Link from 'next/link';
import { CONTACTO, RUTAS } from './data';

// Pie común. En la portada los enlaces de Camina van a sus secciones; en otras páginas, a la portada.
export default function Footer({ base = '' }: { base?: string }) {
  const cols: [string, [string, string][]][] = [
    ['Camina', [['Cómo funciona', `${base}#como-funciona`], ['Premios', `${base}#premios`], ['Comunidad', `${base}#comunidad`], ['Ruta del mes', `${base}#ruta`], ['Preguntas', `${base}#dudas`]]],
    ['Comercios', [['Para comercios', RUTAS.comercios], ['Registrar mi comercio', RUTAS.registro], ['Ingresar al panel', RUTAS.login], ['Guía para comercios', RUTAS.guia]]],
    ['Legal', [['Términos', RUTAS.terminos], ['Privacidad', RUTAS.privacidad], ['Eliminar mi cuenta', RUTAS.eliminar]]],
  ];
  return (
    <footer className="hm-footer" data-theme="dark">
      <div className="hm-wrap">
        <div className="hm-footer-top">
          <div className="hm-footer-brand">
            <span className="hm-brand">
              <Image src="/marca/logo-solo-transparente.png" alt="" width={32} height={32} />
              <span>CAMINA</span>
            </span>
            <p>Caminas, sumas Puntos y canjeas premios en comercios de tu ciudad.</p>
          </div>
          {cols.map(([t, links]) => (
            <nav key={t} aria-label={t}>
              <h2>{t}</h2>
              <ul>
                {links.map(([l, h]) => (
                  <li key={h}>{h.includes('#') ? <a href={h}>{l}</a> : <Link href={h}>{l}</Link>}</li>
                ))}
              </ul>
            </nav>
          ))}
          <div>
            <h2>Contacto</h2>
            <ul>
              <li>
                <a href={CONTACTO.whatsapp}>WhatsApp {CONTACTO.whatsappTexto}</a>
              </li>
              <li>
                <a href={`mailto:${CONTACTO.email}`}>{CONTACTO.email}</a>
              </li>
              <li>
                <a href={CONTACTO.instagram} target="_blank" rel="noopener noreferrer">
                  Instagram {CONTACTO.instagramTexto}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="hm-footer-bottom">
          <span>© {new Date().getFullYear()} Camina. Hecha en Tarija, Bolivia.</span>
          <span>Pronto en App Store y Google Play</span>
        </div>
      </div>
    </footer>
  );
}
