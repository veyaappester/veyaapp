/** Client-side image helpers: receipts are stored as ~1200px JPEGs plus a small thumbnail. */

const MAX_SIZE = 1200;
const THUMB_SIZE = 240;
const QUALITY = 0.7;

async function loadBitmap(source: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(source, { imageOrientation: 'from-image' });
    } catch {
      // Fall through to <img> decoding (older Safari, SVG blobs).
    }
  }
  const url = URL.createObjectURL(source);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawScaled(img: ImageBitmap | HTMLImageElement, maxSize: number): HTMLCanvasElement {
  const w = 'naturalWidth' in img ? img.naturalWidth : img.width;
  const h = 'naturalHeight' in img ? img.naturalHeight : img.height;
  const scale = Math.min(1, maxSize / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function toJpeg(canvas: HTMLCanvasElement, quality = QUALITY): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Kunne ikke gemme billedet'))), 'image/jpeg', quality),
  );
}

export interface CompressedImage {
  blob: Blob;
  thumb: Blob;
  /** Full-size canvas, handy as OCR input without decoding the image twice. */
  canvas: HTMLCanvasElement;
}

export async function compressImage(source: Blob): Promise<CompressedImage> {
  const img = await loadBitmap(source);
  const canvas = drawScaled(img, MAX_SIZE);
  const thumbCanvas = drawScaled(img, THUMB_SIZE);
  if ('close' in img) img.close();
  const [blob, thumb] = await Promise.all([toJpeg(canvas), toJpeg(thumbCanvas, 0.6)]);
  return { blob, thumb, canvas };
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function dataURLToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
