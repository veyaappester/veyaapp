import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import jpeg from 'jpeg-js';
import { createWorker, OEM, type PSM } from 'tesseract.js';
import { jpegOrientation } from '../../src/ocr/exif';
import { applyOrientation, rgbaToGray, type GrayImage } from '../../src/ocr/image';
import { linesFromBlocks, type OcrEngine } from '../../src/ocr/pipeline';

const root = join(import.meta.dirname, '..', '..');

/** Decodes a JPEG into grey pixels with its EXIF rotation applied (what the browser does for us). */
export function loadJpegGray(path: string): GrayImage {
  const bytes = readFileSync(path);
  const { width, height, data } = jpeg.decode(bytes, { useTArray: true, maxMemoryUsageInMB: 1024 });
  return applyOrientation(rgbaToGray(data, width, height), jpegOrientation(bytes));
}

/** 8-bit greyscale BMP, which Tesseract's image loader reads directly. */
export function encodeBmp(img: GrayImage): Buffer {
  const rowSize = (img.width + 3) & ~3;
  const pixelOffset = 14 + 40 + 256 * 4;
  const size = pixelOffset + rowSize * img.height;
  const buf = Buffer.alloc(size);
  buf.write('BM', 0);
  buf.writeUInt32LE(size, 2);
  buf.writeUInt32LE(pixelOffset, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(img.width, 18);
  buf.writeInt32LE(img.height, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(8, 28);
  buf.writeUInt32LE(rowSize * img.height, 34);
  buf.writeUInt32LE(256, 46);
  for (let i = 0; i < 256; i++) buf.writeUInt32LE((i << 16) | (i << 8) | i, 54 + i * 4);
  for (let y = 0; y < img.height; y++) {
    const dest = pixelOffset + (img.height - 1 - y) * rowSize; // BMP rows are stored bottom-up
    buf.set(img.data.subarray(y * img.width, (y + 1) * img.width), dest);
  }
  return buf;
}

/** Same language data the app serves from public/ocr (Danish + English, "best" models). */
function langDir(): string {
  const dir = join(tmpdir(), 'veya-tesseract-lang');
  mkdirSync(dir, { recursive: true });
  for (const lang of ['dan', 'eng']) {
    const dest = join(dir, `${lang}.traineddata.gz`);
    if (!existsSync(dest)) copyFileSync(join(root, 'node_modules', '@tesseract.js-data', lang, '4.0.0_best_int', `${lang}.traineddata.gz`), dest);
  }
  return dir;
}

export async function createNodeOcr(psm: string): Promise<{ ocr: OcrEngine; terminate: () => Promise<unknown> }> {
  const worker = await createWorker(['dan', 'eng'], OEM.LSTM_ONLY, {
    langPath: langDir(),
    cachePath: join(tmpdir(), 'veya-tesseract-cache'),
    gzip: true,
  });
  await worker.setParameters({ tessedit_pageseg_mode: psm as PSM, preserve_interword_spaces: '1', user_defined_dpi: '300' });
  return {
    ocr: async (img) => {
      const { data } = await worker.recognize(encodeBmp(img), {}, { text: true, blocks: true });
      return { text: data.text, confidence: data.confidence, lines: linesFromBlocks(data.blocks) };
    },
    terminate: () => worker.terminate(),
  };
}

/** "ØKO. LØG" → "OKO. LOG", so item names compare the same whether OCR keeps ø or not. */
export function fold(s: string): string {
  return s.normalize('NFKD').replace(/ø/gi, (c) => (c === 'Ø' ? 'O' : 'o')).replace(/æ/gi, (c) => (c === 'Æ' ? 'AE' : 'ae')).replace(/[̀-ͯ]/g, '');
}
