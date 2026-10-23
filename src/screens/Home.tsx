import { TopBar } from '../components/TopBar';

export default function Home() {
  return (
    <section className="page">
      <TopBar back />
      <h1>Overblik</h1>
      <p className="muted">Kommer snart.</p>
    </section>
  );
}