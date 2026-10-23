import { TopBar } from '../components/TopBar';

export default function ReceiptView() {
  return (
    <section className="page">
      <TopBar back />
      <h1>Kvittering</h1>
      <p className="muted">Kommer snart.</p>
    </section>
  );
}