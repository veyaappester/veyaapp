import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PurchaseEditor } from '../components/PurchaseEditor';
import { useToast } from '../components/toastContext';
import { TopBar } from '../components/TopBar';
import { useGoBack } from '../components/useGoBack';
import { useProfile } from '../db/hooks';
import { savePurchase } from '../db/purchases';
import { db } from '../db/schema';
import { draftFromPurchase, emptyDraft } from '../logic/purchaseDraft';

export default function PurchaseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const profile = useProfile();
  const existing = useLiveQuery(async () => (id ? ((await db.purchases.get(id)) ?? null) : null), [id]);
  const [busy, setBusy] = useState(false);
  const goBack = useGoBack(id ? `/koeb/${id}` : '/koeb');

  if (!profile || existing === undefined) return null;
  if (id && !existing) {
    return (
      <section className="page">
        <TopBar back="/koeb" />
        <h1>Købet findes ikke</h1>
      </section>
    );
  }

  return (
    <section className="page">
      <TopBar back={id ? `/koeb/${id}` : '/koeb'} />
      <h1>{existing ? 'Redigér køb' : 'Tilføj køb'}</h1>
      <p className="muted">
        {existing ? 'Frister bliver regnet ud igen, når du gemmer.' : 'Uden kvittering? Ingen problem. Veya regner fristerne ud for dig.'}
      </p>
      <PurchaseEditor
        key={existing?.id ?? 'new'}
        profile={profile}
        initial={existing ? draftFromPurchase(existing) : emptyDraft()}
        editing={!!existing}
        busy={busy}
        submitLabel={existing ? 'Gem ændringer' : 'Gem køb'}
        onSubmit={async (input) => {
          setBusy(true);
          const newId = await savePurchase(
            { ...input, receiptImageId: existing?.receiptImageId, receiptText: existing?.receiptText },
            existing?.id,
          );
          if (existing) {
            toast('Købet er opdateret.');
            goBack();
          } else {
            toast('Købet er gemt — økonomi og plan er opdateret.');
            navigate(`/koeb/${newId}`, { replace: true });
          }
        }}
      />
    </section>
  );
}
