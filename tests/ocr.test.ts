import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { applyOrientation, cropToReceipt, type GrayImage } from '../src/ocr/image';
import { RECEIPT_PSM, scanReceipt, type ScanResult } from '../src/ocr/pipeline';
import { createNodeOcr, fold, loadJpegGray } from './helpers/nodeOcr';

const fixtures = join(import.meta.dirname, 'fixtures');
const REAL = join(fixtures, 'rema1000.jpg');
const SYNTHETIC = join(fixtures, 'synthetic-rema.jpg');
const today = '2026-10-23';

/** The bon from the brief: REMA 1000, 18.10.26 17.39, AT BETALE 20,00, two items, Mastercard, KS 2 / BON 20220107. */
function expectRema(r: ScanResult) {
  const p = r.parsed;
  expect(p.store).toBe('Rema 1000');
  expect(p.category).toBe('mad');
  expect(p.date).toBe('2026-10-18');
  expect(p.time).toBe('17.39');
  expect(p.total).toBe(20);
  expect(p.items.map((i) => ({ name: fold(i.name), amount: i.amount }))).toEqual([
    { name: 'OKO. LOG', amount: 14 },
    { name: 'HVIDLOG', amount: 6 },
  ]);
  expect(p.paymentMethod).toBe('Mastercard');
  expect(p.receiptNumber).toBe('20220107');
  expect(p.register).toBe('2');
}

let engine: Awaited<ReturnType<typeof createNodeOcr>>;
beforeAll(async () => {
  engine = await createNodeOcr(RECEIPT_PSM);
}, 120_000);
afterAll(() => engine?.terminate());

describe('OCR pipeline', () => {
  it('crops a light receipt off a dark background', () => {
    const img = loadJpegGray(SYNTHETIC);
    const { image, cropped } = cropToReceipt(img);
    expect(cropped).toBe(true);
    expect(image.width).toBeLessThan(img.width * 0.7);
    expect(image.height).toBeLessThan(img.height * 0.75);
  });

  it('applies EXIF rotation', () => {
    const img: GrayImage = { width: 3, height: 2, data: new Uint8ClampedArray([1, 2, 3, 4, 5, 6]) };
    const r = applyOrientation(img, 6); // rotate 90° clockwise
    expect([r.width, r.height]).toEqual([2, 3]);
    expect([...r.data]).toEqual([4, 1, 5, 2, 6, 3]);
  });

  it('reads the synthetic REMA 1000 photo', async () => {
    const result = await scanReceipt(loadJpegGray(SYNTHETIC), engine.ocr, { today });
    expectRema(result);
  }, 120_000);
});

// The real photo from the brief. Put it at tests/fixtures/rema1000.jpg to run this.
describe.skipIf(!existsSync(REAL))('OCR on the real REMA 1000 bon (tests/fixtures/rema1000.jpg)', () => {
  it('reads all fields', async () => {
    const result = await scanReceipt(loadJpegGray(REAL), engine.ocr, { today });
    if (process.env.OCR_DEBUG) console.log(result.variant, result.confidence, '\n' + result.text);
    expectRema(result);
  }, 180_000);
});
