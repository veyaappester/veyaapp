import type { Category } from '../db/types';

/** Quick-add chips for common Danish services. The user still enters the price. */
export const commonServices: { name: string; category: Category; plan?: string }[] = [
  { name: 'Netflix', category: 'fritid' },
  { name: 'Spotify', category: 'fritid', plan: 'Premium' },
  { name: 'Viaplay', category: 'fritid' },
  { name: 'HBO Max', category: 'fritid' },
  { name: 'Disney+', category: 'fritid' },
  { name: 'TV 2 Play', category: 'fritid' },
  { name: 'YouSee', category: 'bolig', plan: 'Internet' },
  { name: 'Telmore', category: 'andet', plan: 'Mobilabonnement' },
  { name: 'Fitness', category: 'fritid' },
  { name: 'iCloud+', category: 'elektronik' },
];

/** Colour for a subscription's initial-letter icon, so well-known brands are recognisable. */
export function serviceTint(name: string): { bg: string; fg: string } {
  const n = name.toLowerCase();
  if (n.includes('netflix')) return { bg: '#fbe4e4', fg: '#b3141c' };
  if (n.includes('spotify')) return { bg: '#e2f6ea', fg: '#16843f' };
  if (n.includes('viaplay')) return { bg: '#ffe9e0', fg: '#c2401a' };
  if (n.includes('telmore')) return { bg: '#e6f0fb', fg: '#1d5fa8' };
  if (n.includes('disney')) return { bg: '#e5eafc', fg: '#1d3a9e' };
  if (n.includes('hbo')) return { bg: '#ece6fb', fg: '#4a2ca0' };
  if (n.includes('icloud')) return { bg: '#e6f2fd', fg: '#1a73c9' };
  return { bg: 'var(--mint)', fg: 'var(--deep)' };
}
