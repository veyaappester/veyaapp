import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import { Logo } from '../components/Logo';
import { createProfile, loadDemoData } from '../db/actions';

const slides: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'home',
    title: 'Dit liv. Ét overblik.',
    text: 'Køb, kvitteringer, abonnementer, regninger og frister samlet ét sted, så du ikke skal lede i mails, netbank og kamerarulle.',
  },
  {
    icon: 'scan',
    title: 'Scan din kvittering',
    text: 'Tag et billede, så finder Veya butik, pris og dato og holder øje med returfrist og reklamationsret for dig.',
  },
  {
    icon: 'sparkle',
    title: 'Veya i dag',
    text: 'Kun det, der faktisk kræver din opmærksomhed: en returfrist om to dage, en regning der forfalder, eller et abonnement der stiger.',
  },
];

const SUGGESTED_BUDGET = 9600;

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [budget, setBudget] = useState(String(SUGGESTED_BUDGET));
  const [busy, setBusy] = useState(false);

  const onSlides = step < slides.length;
  const slide = slides[step];

  const submitProfile = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setStep(slides.length + 1);
  };

  const finish = async (demo: boolean) => {
    setBusy(true);
    if (demo) {
      await loadDemoData(name.trim());
    } else {
      await createProfile(name, Number(budget) || SUGGESTED_BUDGET);
    }
    navigate('/', { replace: true });
  };

  return (
    <section className="onboarding">
      <div className="top">
        <Logo size={40} />
        {onSlides && (
          <button type="button" className="link" onClick={() => setStep(slides.length)}>
            Spring over
          </button>
        )}
      </div>

      {onSlides && (
        <>
          <div className="slide" key={step}>
            <div className="slide-art">
              <Icon name={slide.icon} size={52} strokeWidth={1.6} />
            </div>
            <h1>{slide.title}</h1>
            <p>{slide.text}</p>
          </div>
          <div className="dots" aria-hidden="true">
            {slides.map((_, i) => (
              <i key={i} className={i === step ? 'on' : ''} />
            ))}
          </div>
          <button type="button" className="action" onClick={() => setStep(step + 1)}>
            {step === slides.length - 1 ? 'Kom i gang' : 'Næste'}
          </button>
        </>
      )}

      {step === slides.length && (
        <form className="slide" onSubmit={submitProfile} style={{ justifyContent: 'flex-start', textAlign: 'left' }}>
          <h1>Lad os sætte Veya op</h1>
          <p>Det tager under et minut, og alt bliver kun gemt på din telefon.</p>
          <div className="form">
            <label className="field">
              <span>Hvad hedder du?</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" placeholder="Fornavn" required autoFocus />
            </label>
            <label className="field">
              <span>Dit månedlige budget (kr.)</span>
              <input
                inputMode="numeric"
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ''))}
                required
              />
              <span className="hint">Forslag: 9.600 kr. Alt, du bruger, inkl. husleje og abonnementer. Kan altid ændres.</span>
            </label>
          </div>
          <div style={{ flex: 1 }} />
          <button type="submit" className="action" disabled={!name.trim()}>
            Fortsæt
          </button>
        </form>
      )}

      {step === slides.length + 1 && (
        <div className="slide">
          <div className="slide-art">
            <Icon name="check" size={52} strokeWidth={1.6} />
          </div>
          <h1>Klar, {name.trim()}!</h1>
          <p>Vil du starte med tom app, eller se Veya fyldt med eksempler først? Demodata kan altid slettes igen under Profil.</p>
          <div style={{ flex: 1 }} />
          <button type="button" className="action" disabled={busy} onClick={() => finish(false)}>
            Start tomt
          </button>
          <button type="button" className="action secondary" disabled={busy} onClick={() => finish(true)}>
            Prøv med demodata
          </button>
        </div>
      )}
    </section>
  );
}
