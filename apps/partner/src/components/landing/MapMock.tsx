// Ilustración del mapa de la app (el mapa real es nativo y no se puede capturar en la web).
export default function MapMock({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`mapmock${compact ? ' compact' : ''}`}>
      <svg viewBox="0 0 300 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="300" height="560" fill="#ece6f7" />
        <path d="M-10 120 L310 80 M-10 300 L310 260 M-10 470 L310 430 M60 -10 L90 570 M190 -10 L210 570" stroke="#fff" strokeWidth="14" fill="none" />
        <path d="M-10 200 L310 170 M130 -10 L150 570 M-10 380 L310 350" stroke="#fff" strokeWidth="7" fill="none" />
        <rect x="215" y="300" width="70" height="52" rx="14" fill="#d3efe5" />
        <rect x="8" y="215" width="44" height="70" rx="12" fill="#d3efe5" />
        <path d="M30 520 C90 470 120 430 150 360 S 220 230 260 150" stroke="#8b4fd1" strokeWidth="4" strokeDasharray="2 9" strokeLinecap="round" fill="none" />
      </svg>
      <div className="pin gold" style={{ left: '66%', top: '24%' }}><i />Bloom</div>
      <div className="pin" style={{ left: '30%', top: '40%' }}><i />Fripap&apos;s</div>
      <div className="pin" style={{ left: '58%', top: '58%' }}><i />Coco Barber</div>
      <div className="you" style={{ left: '14%', top: '80%' }}><span /></div>
      {!compact && <div className="map-chip">Explorar el mapa</div>}
    </div>
  );
}
