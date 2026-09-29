// Afiche A4 para pegar en el local. De acá sale el PDF del kit de marca.
export default function AfichePage() {
  return (
    <div style={{ width: '210mm', height: '297mm', background: '#200a52', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20mm', boxSizing: 'border-box', margin: '0 auto' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/marca/logo-solo-transparente.png" alt="" style={{ width: '90mm', height: '90mm' }} />
      <p style={{ color: '#62F0B6', fontWeight: 900, fontSize: '26mm', letterSpacing: '-1mm', margin: '6mm 0 0', lineHeight: 1 }}>CAMINA</p>
      <p style={{ fontWeight: 800, fontSize: '13mm', margin: '16mm 0 4mm', lineHeight: 1.1 }}>Aquí canjeás<br />tus pasos</p>
      <p style={{ fontSize: '6.5mm', color: '#cfc4ee', margin: 0 }}>Mostrá tu código de Camina en la caja</p>
      <div style={{ marginTop: '18mm', background: '#62F0B6', color: '#200a52', borderRadius: '99px', padding: '4mm 12mm', fontWeight: 800, fontSize: '7mm' }}>
        Descargá la app · caminaapp.com
      </div>
    </div>
  );
}
