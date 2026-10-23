import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

const items: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Overblik', icon: 'home', end: true },
  { to: '/koeb', label: 'Køb', icon: 'bag' },
  { to: '/scan', label: 'Scan', icon: 'scan' },
  { to: '/abonnementer', label: 'Abonn.', icon: 'repeat' },
  { to: '/plan', label: 'Plan', icon: 'calendar' },
];

export function Nav() {
  return (
    <nav className="nav" aria-label="Hovedmenu">
      {items.map((item) =>
        item.icon === 'scan' ? (
          <NavLink key={item.to} to={item.to} aria-label="Scan kvittering">
            <span className="scan">
              <Icon name="scan" size={24} />
            </span>
            {item.label}
          </NavLink>
        ) : (
          <NavLink key={item.to} to={item.to} end={item.end}>
            <Icon name={item.icon} size={22} />
            {item.label}
          </NavLink>
        ),
      )}
    </nav>
  );
}
