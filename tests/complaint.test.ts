import { describe, expect, it } from 'vitest';
import type { Purchase } from '../src/db/types';
import { complaintText } from '../src/logic/complaint';

const p: Purchase = {
  id: 'p1',
  product: 'AirPods Pro 2',
  store: 'Elgiganten',
  price: 1899,
  date: '2026-09-25',
  category: 'elektronik',
  boughtOnline: false,
  returnDays: 30,
  returnDeadline: '2026-10-25',
  complaintYears: 2,
  complaintUntil: '2028-09-25',
  receiptNumber: '3493829',
  receiptImageId: 'img',
  status: 'active',
  createdAt: '',
};

describe('complaintText', () => {
  it('writes a Danish complaint with the purchase details', () => {
    const text = complaintText(p, { name: 'Sofie' });
    expect(text).toContain('Jeg vil gerne reklamere over AirPods Pro 2, som jeg købte hos jer den 25. september 2026 for 1.899 kr.');
    expect(text).not.toContain('kr..');
    expect(text).toContain('• Kassebon nr.: 3493829');
    expect(text).toContain('Kvitteringen er vedhæftet.');
    expect(text.trim().endsWith('Sofie')).toBe(true);
  });
});
