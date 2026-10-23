import { serviceTint } from '../logic/services';

/** Initial-letter icon for a subscription, tinted for well-known services. */
export function SubIcon({ name }: { name: string }) {
  const tint = serviceTint(name);
  return (
    <div className="row-icon" style={{ background: tint.bg, color: tint.fg }} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase()}
    </div>
  );
}
