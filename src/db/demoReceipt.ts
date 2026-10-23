import type { ISODate } from '../logic/dates';
import { compressImage } from './images';

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Draws the clearly fictional demo receipt as SVG and turns it into a JPEG in the
 * browser, so no real receipt photo ever lives in the repository.
 */
export async function makeDemoReceipt(purchaseDate: ISODate): Promise<{ blob: Blob; thumb: Blob }> {
  const date = purchaseDate.split('-').reverse().join('-');
  const lines: [string, 'c' | 'l' | 'r' | 'lr', string?, boolean?][] = [
    ['ELGIGANTEN', 'c', undefined, true],
    ['Frederiksberg Centeret', 'c'],
    ['Falkoner Allé 21, 2000 Frederiksberg', 'c'],
    ['DEMO · FIKTIV KVITTERING', 'c'],
    ['', 'c'],
    [`${date}  14:32`, 'lr', 'Kasse 04'],
    ['Kassebon 3493829', 'l'],
    ['--------------------------------', 'c'],
    ['AirPods Pro (2nd gen)', 'l'],
    ['  1 x 1.899,00', 'lr', '1.899,00'],
    ['--------------------------------', 'c'],
    ['TOTAL', 'lr', '1.899,00', true],
    ['Heraf moms', 'lr', '379,80'],
    ['', 'c'],
    ['Betalt med Visa **** 4251', 'l'],
    ['Auth. kode 829104', 'l'],
    ['', 'c'],
    ['30 dages åbent køb', 'c'],
    ['Tak for dit køb!', 'c', undefined, true],
  ];
  const width = 560;
  const lineH = 40;
  const top = 70;
  const height = top + lines.length * lineH + 70;
  const text = lines
    .map(([t, align, right, bold], i) => {
      const y = top + i * lineH;
      const weight = bold ? 700 : 400;
      const size = i === 0 ? 34 : 22;
      if (align === 'c') {
        return `<text x="${width / 2}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="${weight}">${escapeXml(t)}</text>`;
      }
      const left = `<text x="40" y="${y}" font-size="${size}" font-weight="${weight}">${escapeXml(t)}</text>`;
      const r = right
        ? `<text x="${width - 40}" y="${y}" text-anchor="end" font-size="${size}" font-weight="${weight}">${escapeXml(right)}</text>`
        : '';
      return left + r;
    })
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#fffdf8"/>
    <g font-family="Courier New, Consolas, monospace" fill="#1d1d1d">${text}</g>
    <path d="M0 ${height} ${Array.from({ length: 29 }, (_, i) => `L${(i + 0.5) * 20} ${height - 10} L${(i + 1) * 20} ${height}`).join(' ')}" fill="#e9e4ef"/>
  </svg>`;
  const { blob, thumb } = await compressImage(new Blob([svg], { type: 'image/svg+xml' }));
  return { blob, thumb };
}
