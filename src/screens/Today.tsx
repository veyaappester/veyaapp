import { TopBar } from '../components/TopBar';

export default function Today() {
  return (
    <section className="page">
      <TopBar back />
      <h1>Veya i dag</h1>
      <p className="muted">Kommer snart.</p>
    </section>
  );
}