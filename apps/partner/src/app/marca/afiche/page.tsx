// Afiche A4 para pegar en el local. De aquí sale el PDF del kit de marca.
export default function AfichePage() {
  return (
    <div style={{ width: '210mm', height: '297mm', background: '#200a52', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20mm', boxSizing: 'border-box', margin: '0 auto' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/marca/logo-solo-transparente.png" alt="" style={{ width: '62mm', height: '62mm' }} />
      <p style={{ color: '#62F0B6', fontWeight: 900, fontSize: '22mm', letterSpacing: '-1mm', margin: '4mm 0 0', lineHeight: 1 }}>CAMINA</p>
      <p style={{ fontWeight: 800, fontSize: '13mm', margin: '10mm 0 4mm', lineHeight: 1.1 }}>Aquí canjeas<br />tus pasos</p>
      <p style={{ fontSize: '6.5mm', color: '#cfc4ee', margin: 0 }}>Pide el código de este local y escríbelo en la app</p>
      {/* QR a caminaapp.com/descargar: quien ve el afiche en el local baja la app en el momento. */}
      <div style={{ marginTop: '10mm', display: 'flex', alignItems: 'center', gap: '7mm', background: '#fff', borderRadius: '8mm', padding: '5mm 8mm 5mm 5mm' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/qr-descargar.svg" alt="QR para descargar Camina" style={{ width: '46mm', height: '46mm' }} />
        <div style={{ textAlign: 'left', color: '#200a52' }}>
          <p style={{ fontWeight: 800, fontSize: '8mm', margin: 0, lineHeight: 1.1 }}>Escanea<br />y descarga<br />la app</p>
          <p style={{ fontSize: '4.6mm', margin: '3mm 0 0', color: '#5b4a86' }}>Es gratis</p>
        </div>
      </div>
      <p style={{ marginTop: '8mm', fontWeight: 800, fontSize: '7mm', color: '#62F0B6' }}>caminaapp.com</p>
    </div>
  );
}
