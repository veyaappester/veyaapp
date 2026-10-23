import type { Profile, Purchase } from '../db/types';
import { fmtFull, kr } from './format';

/** Pre-written Danish complaint (reklamation) the user can send to the store. */
export function complaintText(p: Purchase, profile: Pick<Profile, 'name'>): string {
  const lines = [
    `Reklamation: ${p.product}`,
    '',
    `Hej ${p.store}`,
    '',
    `Jeg vil gerne reklamere over ${p.product}, som jeg købte hos jer den ${fmtFull(p.date)}${
      p.storeLocation ? ` (${p.storeLocation})` : ''
    } for ${kr(p.price)}`, // kr() already ends with "kr."
    '',
    'Fejlen er: [beskriv kort, hvad der er galt, og hvornår det startede]',
    '',
    `Købet er dækket af reklamationsretten til og med ${fmtFull(p.complaintUntil)}. Jeg ønsker varen repareret eller ombyttet, alternativt pengene tilbage.`,
    '',
    'Købsoplysninger:',
    `• Produkt: ${p.product}`,
    `• Købsdato: ${fmtFull(p.date)}`,
    `• Pris: ${kr(p.price)}`,
  ];
  if (p.receiptNumber) lines.push(`• Kassebon nr.: ${p.receiptNumber}`);
  if (p.paymentMethod) lines.push(`• Betalt med: ${p.paymentMethod}`);
  lines.push('', p.receiptImageId ? 'Kvitteringen er vedhæftet.' : '', 'På forhånd tak.', '', 'Venlig hilsen', profile.name);
  return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');
}
