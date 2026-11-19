'use client';

// Exportaciones reales a archivo: PDF (jsPDF + autotable) y Excel .xlsx (write-excel-file).
// Se cargan solo al tocar el botón para no hacer pesado el panel.

export type Cell = string | number | null;

export interface PdfSection {
  heading?: string;
  pairs?: [string, string][];
  head?: string[];
  rows?: Cell[][];
  // Columnas alineadas a la derecha (importes).
  right?: number[];
}

function fileSafe(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
}

export async function exportPdf(opts: { fileName: string; title: string; subtitle?: string; business: string; sections: PdfSection[] }) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const M = 40;
  let y = M;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(124, 106, 156);
  doc.text(opts.business.toUpperCase(), M, y);
  y += 20;
  doc.setFontSize(18);
  doc.setTextColor(41, 28, 71);
  doc.text(opts.title, M, y);
  y += 16;
  if (opts.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(124, 106, 156);
    doc.text(opts.subtitle, M, y);
    y += 10;
  }
  y += 10;

  for (const s of opts.sections) {
    if (s.heading) {
      if (y > doc.internal.pageSize.getHeight() - 80) {
        doc.addPage();
        y = M;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(41, 28, 71);
      doc.text(s.heading, M, y + 8);
      y += 16;
    }
    if (s.pairs) {
      autoTable(doc, {
        startY: y,
        body: s.pairs,
        theme: 'plain',
        margin: { left: M, right: M },
        styles: { fontSize: 10, cellPadding: 4, textColor: [41, 28, 71] },
        columnStyles: { 0: { textColor: [124, 106, 156], cellWidth: 200 }, 1: { fontStyle: 'bold' } },
      });
    }
    if (s.rows) {
      const right = Object.fromEntries((s.right ?? []).map((i) => [i, { halign: 'right' as const }]));
      autoTable(doc, {
        startY: y,
        head: s.head ? [s.head] : undefined,
        body: s.rows.map((r) => r.map((c) => (c == null ? '' : String(c)))),
        theme: 'striped',
        margin: { left: M, right: M },
        styles: { fontSize: 8.5, cellPadding: 4, textColor: [41, 28, 71] },
        headStyles: { fillColor: [36, 23, 72], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247, 243, 252] },
        columnStyles: right,
      });
    }
    // lastAutoTable lo agrega el plugin al documento.
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 18;
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 140, 170);
    doc.text(`Generado el ${new Date().toLocaleString('es-BO')} · Página ${i} de ${pages}`, M, doc.internal.pageSize.getHeight() - 20);
  }
  doc.save(`${fileSafe(opts.fileName)}.pdf`);
}

export async function exportXlsx(fileName: string, sheets: { name: string; head: string[]; rows: Cell[][] }[]) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const data = sheets.map((s) => ({
    sheet: s.name.slice(0, 31),
    data: [
      s.head.map((h) => ({ value: h, fontWeight: 'bold' as const })),
      ...s.rows.map((r) => r.map((c) => (c == null || c === '' ? null : { value: c }))),
    ],
    columns: s.head.map((h, i) => ({
      width: Math.min(40, Math.max(10, h.length + 2, ...s.rows.slice(0, 200).map((r) => String(r[i] ?? '').length + 2))),
    })),
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await writeExcelFile(data as any).toFile(`${fileSafe(fileName)}.xlsx`);
}

export function downloadJson(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${fileSafe(fileName)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
