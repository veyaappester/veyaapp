import { TopBar } from '../components/TopBar';

export default function Onboarding() {
  return (
    <section className="page">
      <TopBar back />
      <h1>Velkommen til Veya</h1>
      <p className="muted">Kommer snart.</p>
    </section>
  );
}