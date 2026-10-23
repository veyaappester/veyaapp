import { describe, expect, it } from 'vitest';
import { findDate, parseReceipt, suggestProduct } from '../src/logic/receiptParser';

const elgiganten = `ELGIGANTEN
Frederiksberg Centeret
Falkoner Allé 21, 2000 Frederiksberg
CVR 27 97 58 74
09-09-2026 14:32
Kassebon 3493829
AirPods Pro (2nd gen)
1 x 1.899,00
TOTAL 1.899,00
Heraf moms 379,80
Betalt med Visa **** 4251
Tak for dit køb!`;

const netto = `netto
Nørrebrogade 12
2200 København N
Tlf 43 86 43 86
MÆLK LET 1L 10,95
RUGBRØD 22,00
BANANER 2 x 6,00 12,00
PANT 1,50
SUBTOTAL 46,45
RABAT -3,00
I ALT 43,45
DANKORT 43,45
Moms 8,69
Bon nr: 0042-117
12.10.26 17:05`;

const zalando = `Zalando SE
Ordrenummer: 10101234567890
Ordredato: 2. okt. 2026
New Balance 530 sneakers 899,00 kr
Levering 0,00
At betale 899,00 DKK
Betalt med MobilePay
Fortrydelsesret 14 dage`;

const noisy = `M@TAS
Strøget 45
NIACINAMIDE 10% SERUM l 119,00
Total DKK 119.00
Mastercard XXXX XXXX XXXX 9921
2026/09/30`;

const unknownStore = `Café Lumen
Jægersborggade 7
Kvittering
Flat white 45,00
Croissant 32,00
Total 77,00
24-10-2026`;

describe('parseReceipt', () => {
  it('reads an Elgiganten receipt', () => {
    const r = parseReceipt(elgiganten);
    expect(r.store).toBe('Elgiganten');
    expect(r.storeLocation).toBe('Frederiksberg Centeret');
    expect(r.date).toBe('2026-09-09');
    expect(r.total).toBe(1899);
    expect(r.receiptNumber).toBe('3493829');
    expect(r.paymentMethod).toBe('Visa •••• 4251');
    expect(suggestProduct(r)).toBe('AirPods Pro (2nd gen)');
    expect(r.online).toBe(false);
  });

  it('reads a grocery receipt with "I ALT" and a 2-digit year', () => {
    const r = parseReceipt(netto);
    expect(r.store).toBe('Netto');
    expect(r.total).toBe(43.45);
    expect(r.date).toBe('2026-10-12');
    expect(r.receiptNumber).toBe('0042-117');
    expect(r.paymentMethod).toBe('Dankort');
    expect(r.items.map((i) => i.name)).toContain('RUGBRØD');
    expect(suggestProduct(r)).toBe('Dagligvarer');
  });

  it('reads an online order with Danish month name', () => {
    const r = parseReceipt(zalando);
    expect(r.store).toBe('Zalando');
    expect(r.date).toBe('2026-10-02');
    expect(r.total).toBe(899);
    expect(r.paymentMethod).toBe('MobilePay');
    expect(r.online).toBe(true);
    expect(r.receiptNumber).toBe('10101234567890');
  });

  it('copes with OCR noise and dot decimals', () => {
    const r = parseReceipt(noisy);
    expect(r.total).toBe(119);
    expect(r.date).toBe('2026-09-30');
    expect(r.paymentMethod).toBe('Mastercard •••• 9921');
  });

  it('reads card numbers masked with OCR-garbled characters', () => {
    expect(parseReceipt('Visa +++ 1234\nTOTAL 10,00').paymentMethod).toBe('Visa •••• 1234');
  });

  it('uses the first line for unknown stores', () => {
    const r = parseReceipt(unknownStore);
    expect(r.store).toBe('Café Lumen');
    expect(r.total).toBe(77);
    expect(r.items).toHaveLength(2);
    expect(suggestProduct(r)).toBe('Flat white');
  });

  it('returns empty fields for unreadable text', () => {
    const r = parseReceipt('~~ ### ~~');
    expect(r.store).toBeUndefined();
    expect(r.total).toBeUndefined();
    expect(r.date).toBeUndefined();
  });
});

describe('findDate', () => {
  it('rejects impossible dates and amounts', () => {
    expect(findDate('31-02-2026')).toBeUndefined();
    expect(findDate('Pris 12.50')).toBeUndefined();
    expect(findDate('d. 5/11/2026')).toBe('2026-11-05');
  });
});
