import { describe, expect, it } from 'vitest';
import { findDate, parseReceipt, suggestProduct } from '../src/logic/receiptParser';
import { levenshtein, matchStore } from '../src/logic/storeMatch';

const today = '2026-10-23';
const parse = (text: string) => parseReceipt(text, { today });

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
21-10-2026`;

/** Typical OCR output of a REMA 1000 bon (thermal print, uppercase, VAT letters). */
const rema = `REMA IOOO
Nørrebrogade 160
2200 København N
Tlf. 70 10 10 50
CVR 26 96 22 85
OKO. LOG 14,00
HVIDLOG 6,00
AT BETALE 20,00
MASTERCARD 20,00
Moms udgør 4,00
Betjent af: 117
KS: 2 BON: 20220107
18.10.26 17.39
Tak for besøget`;

describe('parseReceipt', () => {
  it('reads a REMA 1000 bon', () => {
    const r = parse(rema);
    expect(r.store).toBe('Rema 1000');
    expect(r.category).toBe('mad');
    expect(r.date).toBe('2026-10-18');
    expect(r.time).toBe('17.39');
    expect(r.total).toBe(20);
    expect(r.items).toEqual([
      { name: 'OKO. LOG', amount: 14 },
      { name: 'HVIDLOG', amount: 6 },
    ]);
    expect(r.paymentMethod).toBe('Mastercard');
    expect(r.receiptNumber).toBe('20220107');
    expect(r.register).toBe('2');
    expect(r.uncertain).not.toContain('price');
    expect(r.uncertain).not.toContain('date');
  });

  it('reads an Elgiganten receipt', () => {
    const r = parse(elgiganten);
    expect(r.store).toBe('Elgiganten');
    expect(r.storeLocation).toBe('Frederiksberg Centeret');
    expect(r.date).toBe('2026-09-09');
    expect(r.time).toBe('14.32');
    expect(r.total).toBe(1899);
    expect(r.receiptNumber).toBe('3493829');
    expect(r.paymentMethod).toBe('Visa •••• 4251');
    expect(suggestProduct(r)).toBe('AirPods Pro (2nd gen)');
    expect(r.online).toBe(false);
  });

  it('reads a grocery receipt with "I ALT" and a 2-digit year', () => {
    const r = parse(netto);
    expect(r.store).toBe('Netto');
    expect(r.total).toBe(43.45);
    expect(r.date).toBe('2026-10-12');
    expect(r.receiptNumber).toBe('0042-117');
    expect(r.paymentMethod).toBe('Dankort');
    expect(r.items.map((i) => i.name)).toContain('RUGBRØD');
    expect(suggestProduct(r)).toBe('Dagligvarer');
  });

  it('reads an online order with Danish month name', () => {
    const r = parse(zalando);
    expect(r.store).toBe('Zalando');
    expect(r.date).toBe('2026-10-02');
    expect(r.total).toBe(899);
    expect(r.paymentMethod).toBe('MobilePay');
    expect(r.online).toBe(true);
    expect(r.receiptNumber).toBe('10101234567890');
  });

  it('copes with OCR noise and dot decimals', () => {
    const r = parse(noisy);
    expect(r.store).toBe('Matas');
    expect(r.uncertain).toContain('store');
    expect(r.total).toBe(119);
    expect(r.date).toBe('2026-09-30');
    expect(r.paymentMethod).toBe('Mastercard •••• 9921');
  });

  it('fixes letters read inside amounts', () => {
    const r = parse('NETTO\nKAFFE 2O,OO\nAT BETALE 2O,OO');
    expect(r.total).toBe(20);
    expect(r.items[0]).toEqual({ name: 'KAFFE', amount: 20 });
  });

  it('falls back to the amount on the payment line', () => {
    const r = parse('Kiosken\nCola 18,00\nChips 22,00\nVISA 40,00\n40,00');
    expect(r.total).toBe(40);
    expect(r.uncertain).toContain('price');
  });

  it('uses the first line for unknown stores', () => {
    const r = parse(unknownStore);
    expect(r.store).toBe('Café Lumen');
    expect(r.uncertain).toContain('store');
    expect(r.total).toBe(77);
    expect(r.items).toHaveLength(2);
    expect(suggestProduct(r)).toBe('Flat white');
  });

  it('returns empty fields for unreadable text', () => {
    const r = parse('~~ ### ~~');
    expect(r.store).toBeUndefined();
    expect(r.total).toBeUndefined();
    expect(r.date).toBeUndefined();
  });
});

describe('findDate', () => {
  it('supports the Danish formats with and without time', () => {
    expect(findDate('18.10.26 17.39', today)).toEqual({ date: '2026-10-18', time: '17.39', candidates: 1 });
    expect(findDate('Dato: 18-10-2026', today)?.date).toBe('2026-10-18');
    expect(findDate('18/10/26 kl. 9:05', today)).toMatchObject({ date: '2026-10-18', time: '09.05' });
    expect(findDate('2026-10-18T17:39', today)?.date).toBe('2026-10-18');
  });

  it('never reads an 8-digit bonnummer as a date', () => {
    expect(findDate('KS: 2 BON: 20220107', today)).toBeUndefined();
    expect(findDate('BON: 20220107\n18.10.26 17.39', today)?.date).toBe('2026-10-18');
  });

  it('rejects impossible, future and unrealistic dates', () => {
    expect(findDate('31-02-2026', today)).toBeUndefined();
    expect(findDate('13.13.26', today)).toBeUndefined();
    expect(findDate('24-10-2026', today)).toBeUndefined(); // tomorrow
    expect(findDate('01.01.1998', today)).toBeUndefined();
    expect(findDate('Pris 12.50', today)).toBeUndefined();
    expect(findDate('d. 5/10/2026', today)?.date).toBe('2026-10-05');
  });
});

describe('store matching', () => {
  it('tolerates OCR mistakes in store names', () => {
    for (const s of ['REMA IOOO', 'Rema 1OOO', 'REMA1000', 'rema 1000 nørrebro']) expect(matchStore(s)?.store.name).toBe('Rema 1000');
    expect(matchStore('ELGIGANTFN')?.store.name).toBe('Elgiganten');
    expect(matchStore('SOSTRENE GRENE')?.store.name).toBe('Søstrene Grene');
    expect(matchStore('F0TEX')?.store.name).toBe('Føtex');
    expect(matchStore('7-ELEVEN')?.store.name).toBe('7-Eleven');
  });

  it('does not invent stores from ordinary words', () => {
    expect(matchStore('Tak for besøget')).toBeUndefined();
    expect(matchStore('Nørrebrogade 160')).toBeUndefined();
    expect(matchStore('LOWER')).toBeUndefined();
  });

  it('computes edit distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
  });
});
