'use client';

import { useEffect, useRef, useState } from 'react';

// Ventana para acomodar la foto antes de subirla: se arrastra para moverla y se usa la barra (o la rueda) para acercar.
// Devuelve la foto ya recortada al marco; si no se confirma, no se sube nada.
export function CropDialog({
  file,
  aspect,
  round,
  max,
  title,
  onCancel,
  onDone,
}: {
  file: File;
  aspect: number; // ancho / alto
  round?: boolean;
  max: number; // lado mayor final en px
  title: string;
  onCancel: () => void;
  onDone: (cropped: File) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // desplazamiento del centro de la foto respecto al marco (px de pantalla)
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const [vw, setVw] = useState(360);

  useEffect(() => {
    setVw(Math.min(360, window.innerWidth - 64));
  }, []);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const i = new window.Image();
    i.onload = () => setImg(i);
    i.onerror = () => setFailed(true);
    i.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const fw = round || aspect <= 1 ? Math.min(vw, 300) : vw;
  const fh = fw / aspect;
  const base = img ? Math.max(fw / img.naturalWidth, fh / img.naturalHeight) : 1;
  const s = base * zoom;
  const dw = img ? img.naturalWidth * s : 0;
  const dh = img ? img.naturalHeight * s : 0;
  const limX = Math.max(0, (dw - fw) / 2);
  const limY = Math.max(0, (dh - fh) / 2);
  const x = Math.min(limX, Math.max(-limX, pos.x));
  const y = Math.min(limY, Math.max(-limY, pos.y));

  function confirm() {
    if (!img) return;
    const cw = Math.min(img.naturalWidth, fw / s);
    const ch = Math.min(img.naturalHeight, fh / s);
    const sx = Math.min(img.naturalWidth - cw, Math.max(0, img.naturalWidth / 2 - x / s - cw / 2));
    const sy = Math.min(img.naturalHeight - ch, Math.max(0, img.naturalHeight / 2 - y / s - ch / 2));
    const k = Math.min(1, max / Math.max(cw, ch));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(cw * k);
    canvas.height = Math.round(ch * k);
    const png = file.type === 'image/png';
    canvas.getContext('2d')!.drawImage(img, sx, sy, cw, ch, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return onDone(file);
        const name = file.name.replace(/\.[^.]+$/, '') + (png ? '.png' : '.jpg');
        onDone(new File([blob], name, { type: blob.type }));
      },
      png ? 'image/png' : 'image/jpeg',
      0.88
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-[420px] shadow-xl">
        <h3 className="text-[16px] font-bold">{title}</h3>
        <p className="text-[12.5px] text-muted mt-0.5 mb-3">Arrastra la foto para moverla y usa la barra para acercar.</p>
        {failed ? (
          <p className="text-warn text-[13px] py-6 text-center">No pudimos abrir esa foto. Elige otra.</p>
        ) : (
          <div
            className="relative mx-auto overflow-hidden bg-black touch-none select-none cursor-grab active:cursor-grabbing"
            style={{ width: fw, height: fh, borderRadius: round ? '9999px' : 12 }}
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              drag.current = { px: e.clientX, py: e.clientY, x, y };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (d) setPos({ x: d.x + e.clientX - d.px, y: d.y + e.clientY - d.py });
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onWheel={(e) => setZoom((z) => Math.min(5, Math.max(1, z - e.deltaY / 400)))}
          >
            {img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img.src}
                alt=""
                draggable={false}
                style={{ position: 'absolute', width: dw, height: dh, left: (fw - dw) / 2 + x, top: (fh - dh) / 2 + y, maxWidth: 'none' }}
              />
            )}
          </div>
        )}
        <input
          type="range"
          min={1}
          max={5}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Acercar"
          className="w-full mt-4 accent-[#1F7A66]"
        />
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-line py-2.5 text-[14px] font-semibold">
            Cancelar
          </button>
          <button type="button" onClick={confirm} disabled={!img} className="flex-1 rounded-xl bg-[#1F7A66] text-white py-2.5 text-[14px] font-semibold disabled:opacity-50">
            Usar foto
          </button>
        </div>
      </div>
    </div>
  );
}
