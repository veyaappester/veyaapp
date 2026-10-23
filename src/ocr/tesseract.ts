import { createWorker, OEM, PSM } from 'tesseract.js';
import { rgbaToGray, type GrayImage } from './image';
import { linesFromBlocks, RECEIPT_PSM, scanReceipt, type ScanResult } from './pipeline';

const base = `${import.meta.env.BASE_URL}ocr/`;

/** Largest side we decode the photo at before clean-up (keeps memory sane on phones). */
const DECODE_MAX = 2600;

export interface OcrProgress {
  /** 0–1 */
  progress: number;
  label: string;
}

/** Decodes a photo (EXIF rotation applied by the browser) into grey pixels. */
async function decodeToGray(source: Blob): Promise<GrayImage> {
  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
  } catch {
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.src = url;
    await img.decode();
    URL.revokeObjectURL(url);
    bitmap = img;
  }
  const w0 = 'naturalWidth' in bitmap ? bitmap.naturalWidth : bitmap.width;
  const h0 = 'naturalHeight' in bitmap ? bitmap.naturalHeight : bitmap.height;
  const scale = Math.min(1, DECODE_MAX / Math.max(w0, h0));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w0 * scale);
  canvas.height = Math.round(h0 * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if ('close' in bitmap) bitmap.close();
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return rgbaToGray(data, canvas.width, canvas.height);
}

function grayToCanvas(img: GrayImage): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  const rgba = ctx.createImageData(img.width, img.height);
  for (let i = 0, p = 0; p < img.data.length; i += 4, p++) {
    rgba.data[i] = rgba.data[i + 1] = rgba.data[i + 2] = img.data[p];
    rgba.data[i + 3] = 255;
  }
  ctx.putImageData(rgba, 0, 0);
  return canvas;
}

/**
 * Reads a receipt photo in the browser: clean-up (crop, scale, grey, contrast),
 * Tesseract with Danish + English "best" models and PSM 6, then the Danish
 * receipt parser. Worker, WASM core and language data are served from the app
 * itself (public/ocr) and downloaded only the first time someone scans.
 */
export async function readReceipt(source: Blob, onProgress?: (p: OcrProgress) => void, today?: string): Promise<ScanResult> {
  let pass = 0; // 0 = loading, 1 = first read, 2 = second read
  const report = (p: number) => {
    if (!onProgress) return;
    if (pass === 0) onProgress({ progress: Math.min(0.25, p * 0.25), label: 'Gør Veya klar til at læse…' });
    else if (pass === 1) onProgress({ progress: 0.25 + p * 0.55, label: 'Veya læser din kvittering…' });
    else onProgress({ progress: 0.8 + p * 0.2, label: 'Veya læser den en gang til for en sikkerheds skyld…' });
  };

  const worker = await createWorker(['dan', 'eng'], OEM.LSTM_ONLY, {
    workerPath: `${base}worker.min.js`,
    corePath: `${base}core`,
    langPath: `${base}lang`,
    gzip: true,
    workerBlobURL: false,
    logger: (m: { status: string; progress: number }) => report(m.status === 'recognizing text' ? m.progress : pass === 0 ? m.progress : 0),
  });
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: RECEIPT_PSM as PSM,
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
    });
    onProgress?.({ progress: 0.25, label: 'Gør billedet klar…' });
    const gray = await decodeToGray(source);
    return await scanReceipt(
      gray,
      async (img) => {
        pass++;
        const { data } = await worker.recognize(grayToCanvas(img), {}, { text: true, blocks: true });
        return { text: data.text, confidence: data.confidence, lines: linesFromBlocks(data.blocks) };
      },
      { today },
    );
  } finally {
    await worker.terminate();
  }
}
