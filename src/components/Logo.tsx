import { useId } from 'react';

interface LogoProps {
  size?: number;
}

/** The Veya two-leaf mark on a soft lavender rounded square. */
export function Logo({ size = 40 }: LogoProps) {
  // Unique gradient ids so several logos on one page don't clash.
  const id = useId().replace(/:/g, '');
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="Veya">
      <defs>
        <radialGradient id={`${id}bg`} cx="50%" cy="43%" r="70%">
          <stop offset="0" stopColor="#fbfaff" />
          <stop offset="0.58" stopColor="#e4d8f5" />
          <stop offset="1" stopColor="#c7afe5" />
        </radialGradient>
        <linearGradient id={`${id}dk`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4c267d" />
          <stop offset="1" stopColor="#27113f" />
        </linearGradient>
        <linearGradient id={`${id}lt`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a778de" />
          <stop offset="1" stopColor="#5c35a4" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="39" height="39" rx="13" fill={`url(#${id}bg)`} stroke="#c4abe1" />
      <path d="M0 -12 C6.5 -7 7 5 0 12 C-6 6 -6.5 -6 0 -12Z" fill={`url(#${id}dk)`} transform="translate(15.5 20.5) rotate(-34)" />
      <path d="M0 -10 C5.5 -6 6 4 0 10 C-5 5 -5.5 -5 0 -10Z" fill={`url(#${id}lt)`} transform="translate(26 20) rotate(38)" />
    </svg>
  );
}
