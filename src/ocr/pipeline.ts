import { parseReceipt, parseScore, type ParsedReceipt } from '../logic/receiptParser';
import { prepareForOcr, type GrayImage } from './image';

export interface OcrLine {
  text: string;
  confidence: number;
}

export interface OcrOutput {
  text: string;
  /** Mean word confidence, 0–100 */
  confidence: number;
  lines: OcrLine[];
}

/** Runs Tesseract on one prepared image. Implemented per environment (browser worker / Node). */
export type OcrEngine = (image: GrayImage) => Promise<OcrOutput>;

export interface ScanResult {
  text: string;
  parsed: ParsedReceipt;
  variant: 'gray' | 'binary';
  confidence: number;
  cropped: boolean;
}

/** Tesseract page segmentation mode: 6 = one uniform block of text (best on our receipts). */
export const RECEIPT_PSM = '6';

/** A parse at or above this score has store, date and total without doubts. */
const GOOD_ENOUGH = 85;

function analyse(out: OcrOutput, today: string | undefined) {
  const lineConfidence = new Map(out.lines.map((l) => [l.text.replace(/\s+/g, ' ').trim(), l.confidence]));
  const parsed = parseReceipt(out.text, { today, lineConfidence });
  // Completeness of the parse matters most; OCR confidence breaks ties.
  return { parsed, score: parseScore(parsed) + out.confidence * 0.2 };
}

/**
 * Cleans up the photo, reads it with OCR and parses it. The grey (non-binarised)
 * version is tried first; if that leaves store, date or total missing or doubtful,
 * the black/white version is read too and the better of the two is kept.
 */
export async function scanReceipt(
  image: GrayImage,
  ocr: OcrEngine,
  { today, tryBoth = false }: { today?: string; tryBoth?: boolean } = {},
): Promise<ScanResult> {
  const prepared = prepareForOcr(image);
  const first = await ocr(prepared.gray);
  const a = analyse(first, today);
  let best: { out: OcrOutput; parsed: ParsedReceipt; score: number; variant: ScanResult['variant'] } = { out: first, ...a, variant: 'gray' };
  if (tryBoth || parseScore(a.parsed) < GOOD_ENOUGH) {
    const second = await ocr(prepared.binary);
    const b = analyse(second, today);
    if (b.score > best.score) best = { out: second, ...b, variant: 'binary' };
  }
  return { text: best.out.text, parsed: best.parsed, variant: best.variant, confidence: best.out.confidence, cropped: prepared.cropped };
}

/** Flattens Tesseract's block → paragraph → line tree into lines with confidence. */
export function linesFromBlocks(
  blocks: { paragraphs: { lines: { text: string; confidence: number }[] }[] }[] | null | undefined,
): OcrLine[] {
  return (blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines.map((l) => ({ text: l.text.trim(), confidence: l.confidence }))));
}
