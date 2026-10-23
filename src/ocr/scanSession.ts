import type { ParsedReceipt } from '../logic/receiptParser';

/** Hands the scanned image and OCR result from /scan to /scan/resultat (in memory only). */
export interface ScanSession {
  blob: Blob;
  thumb: Blob;
  text: string;
  parsed: ParsedReceipt;
}

let current: ScanSession | null = null;

export function setScanSession(session: ScanSession | null) {
  current = session;
}

export function getScanSession(): ScanSession | null {
  return current;
}
