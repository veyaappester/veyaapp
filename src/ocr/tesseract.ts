import { createWorker, OEM } from 'tesseract.js';

const base = `${import.meta.env.BASE_URL}ocr/`;

export interface OcrProgress {
  /** 0–1 */
  progress: number;
  label: string;
}

/**
 * Reads the text on a receipt image in the browser with Tesseract (Danish + English).
 * Worker, WASM core and language data are served from the app itself (public/ocr),
 * and are only downloaded when the user scans for the first time.
 */
export async function readReceiptText(image: HTMLCanvasElement | Blob, onProgress?: (p: OcrProgress) => void): Promise<string> {
  const worker = await createWorker(['dan', 'eng'], OEM.LSTM_ONLY, {
    workerPath: `${base}worker.min.js`,
    corePath: `${base}core`,
    langPath: `${base}lang`,
    gzip: true,
    workerBlobURL: false,
    logger: (m: { status: string; progress: number }) => {
      if (!onProgress) return;
      const loading = m.status !== 'recognizing text';
      onProgress({
        // Loading counts as the first 30 %, recognising as the rest.
        progress: loading ? Math.min(0.3, m.progress * 0.3) : 0.3 + m.progress * 0.7,
        label: loading ? 'Gør Veya klar til at læse…' : 'Veya læser din kvittering…',
      });
    },
  });
  try {
    const { data } = await worker.recognize(image);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
