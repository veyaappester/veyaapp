import { Link } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { useProfile } from '../db/hooks';

export default function Home() {
  const profile = useProfile();
  if (!profile) return null;
  return (
    <section className="page">
      <TopBar
        right={
          <Link to="/profil" className="avatar" aria-label="Profil og indstillinger">
            {profile.name.charAt(0).toUpperCase()}
          </Link>
        }
      />
      <h1>Hej, {profile.name}</h1>
      <p className="muted">Budget: {profile.monthlyBudget} kr.</p>
    </section>
  );
}
