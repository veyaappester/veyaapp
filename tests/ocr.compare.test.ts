/**
 * Compares OCR settings on the receipt fixtures. Not part of the normal run:
 *   OCR_COMPARE=1 npx vitest run tests/ocr.compare.test.ts
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'vitest';
import { parseReceipt, parseScore } from '../src/logic/receiptParser';
import { normalize, prepareForOcr, resizeLong } from '../src/ocr/image';
import { createNodeOcr, fold, loadJpegGray } from './helpers/nodeOcr';

const fixtures = join(import.meta.dirname, 'fixtures');
const files = ['rema1000.jpg', 'synthetic-rema.jpg', 'synthetic-rema-hard.jpg'].filter((f) => existsSync(join(fixtures, f)));

/** How many of the 8 expected REMA fields were read right. */
function hits(text: string): number {
  const p = parseReceipt(text, { today: '2026-10-23' });
  const items = p.items.map((i) => `${fold(i.name)}=${i.amount}`);
  return [
    p.store === 'Rema 1000',
    p.date === '2026-10-18',
    p.time === '17.39',
    p.total === 20,
    items.includes('OKO. LOG=14'),
    items.includes('HVIDLOG=6'),
    p.paymentMethod === 'Mastercard',
    p.receiptNumber === '20220107' && p.register === '2',
  ].filter(Boolean).length;
}

describe.skipIf(!process.env.OCR_COMPARE)('OCR settings comparison', () => {
  it('prints hits per setting', async () => {
    const rows: string[] = [];
    for (const psm of ['4', '6']) {
      const { ocr, terminate } = await createNodeOcr(psm);
      for (const f of files) {
        const raw = loadJpegGray(join(fixtures, f));
        const prepared = prepareForOcr(raw);
        const variants = {
          'uden forbehandling': normalize(resizeLong(raw, 1800)),
          'grå (beskåret)': prepared.gray,
          'binær (beskåret)': prepared.binary,
        };
        for (const [name, img] of Object.entries(variants)) {
          const out = await ocr(img);
          rows.push(`PSM ${psm} | ${f.padEnd(26)} | ${name.padEnd(18)} | ${hits(out.text)}/8 | score ${parseScore(parseReceipt(out.text, { today: '2026-10-23' }))} | conf ${Math.round(out.confidence)}`);
        }
      }
      await terminate();
    }
    console.log('\n' + rows.join('\n'));
  }, 600_000);
});
