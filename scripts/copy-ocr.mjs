// Copies the Tesseract worker, WASM core and Danish/English language data into
// public/ocr so OCR is served from the app itself (no CDN, works offline once cached).
// Runs before `dev` and `build`; public/ocr is git-ignored.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = join(root, 'node_modules');
const out = join(root, 'public', 'ocr');

const files = [
  ['tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['tesseract.js-core/tesseract-core-lstm.wasm.js', 'core/tesseract-core-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'core/tesseract-core-simd-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'core/tesseract-core-relaxedsimd-lstm.wasm.js'],
  ['@tesseract.js-data/dan/4.0.0_best_int/dan.traineddata.gz', 'lang/dan.traineddata.gz'],
  ['@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'lang/eng.traineddata.gz'],
];

for (const [from, to] of files) {
  const src = join(nm, from);
  const dest = join(out, to);
  if (!existsSync(src)) {
    console.error(`copy-ocr: missing ${from} — run npm install`);
    process.exit(1);
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
}
console.log(`copy-ocr: ${files.length} OCR files copied to public/ocr`);
