import type { Category } from '../db/types';

export const categories: Category[] = ['elektronik', 'toej', 'mad', 'skoenhed', 'bolig', 'transport', 'fritid', 'andet'];

export const categoryLabel: Record<Category, string> = {
  elektronik: 'Elektronik',
  toej: 'Tøj',
  mad: 'Mad',
  skoenhed: 'Skønhed',
  bolig: 'Bolig',
  transport: 'Transport',
  fritid: 'Fritid',
  andet: 'Andet',
};

/** Chart colours, purple family first so the biggest slices match the brand. */
export const categoryColor: Record<Category, string> = {
  bolig: '#825fc1',
  mad: '#b79be3',
  toej: '#e68a3f',
  elektronik: '#3d1a70',
  fritid: '#2e9e6a',
  skoenhed: '#e2799a',
  transport: '#5b8fd6',
  andet: '#cfc5dc',
};
