import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { useToast } from '../components/toastContext';
import { TopBar } from '../components/TopBar';
import { InstallHelp } from '../components/InstallHelp';
import { NotificationSetting } from '../components/NotificationSetting';
import { deleteAllData, loadDemoData, updateProfile } from '../db/actions';
import { downloadBlob, exportBackup, importBackup } from '../db/backup';
import { useProfile } from '../db/hooks';
import type { Profile as ProfileT } from '../db/types';
import { todayISO } from '../logic/dates';

export default function Profile() {
  const profile = useProfile();
  if (!profile) return null;
  return <ProfileForm profile={profile} key={profile.createdAt} />;
}

function ProfileForm({ profile }: { profile: ProfileT }) {
  const toast = useToast();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile.name);
  const [budget, setBudget] = useState(String(profile.monthlyBudget));
  const [returnDays, setReturnDays] = useState(String(profile.defaultReturnDays));
  const [confirm, setConfirm] = useState<'demo' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);

  const dirty =
    name.trim() !== profile.name || Number(budget) !== profile.monthlyBudget || Number(returnDays) !== profile.defaultReturnDays;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !Number(budget)) return;
    await updateProfile({ name: name.trim(), monthlyBudget: Number(budget), defaultReturnDays: Number(returnDays) || 30 });
    toast('Dine indstillinger er gemt.');
  };

  const setNoticeDays = async (days: number) => {
    await updateProfile({ noticeDaysBefore: days });
  };

  const doExport = async () => {
    const blob = await exportBackup();
    downloadBlob(blob, `veya-backup-${todayISO()}.json`);
    toast('Backup er gemt som fil.');
  };

  const doImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      await importBackup(file);
      toast('Din backup er indlæst.');
      navigate('/');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Backup kunne ikke indlæses.');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const doConfirm = async () => {
    setBusy(true);
    if (confirm === 'demo') {
      await loadDemoData(profile.name);
      toast('Demodata er indlæst.');
      navigate('/');
    } else if (confirm === 'delete') {
      await deleteAllData();
      navigate('/velkommen', { replace: true });
    }
    setBusy(false);
    setConfirm(null);
  };

  return (
    <section className="page">
      <TopBar back />
      <div className="center" style={{ paddingBottom: 6 }}>
        <div className="avatar large" aria-hidden="true">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <h1 style={{ fontSize: 22, marginTop: 12 }}>{profile.name}</h1>
        <p className="muted">Veya gør det nemt at være på forkant.</p>
      </div>

      <h2>Indstillinger</h2>
      <form className="form" onSubmit={save} style={{ marginTop: 0 }}>
        <label className="field">
          <span>Navn</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Månedligt budget (kr.)</span>
            <input inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ''))} required />
          </label>
          <label className="field">
            <span>Standard returret (dage)</span>
            <input inputMode="numeric" value={returnDays} onChange={(e) => setReturnDays(e.target.value.replace(/[^\d]/g, ''))} />
          </label>
        </div>
        {dirty && (
          <button className="action" type="submit">
            Gem ændringer
          </button>
        )}
      </form>

      <fieldset className="field">
        <legend>Sig til om frister og regninger</legend>
        <div className="chip-row">
          {[1, 3, 7].map((d) => (
            <button
              key={d}
              type="button"
              className="chip-btn"
              aria-pressed={profile.noticeDaysBefore === d}
              onClick={() => setNoticeDays(d)}
            >
              {d === 1 ? '1 dag før' : `${d} dage før`}
            </button>
          ))}
        </div>
      </fieldset>

      <NotificationSetting />

      <h2>Installér Veya på din telefon</h2>
      <InstallHelp />

      <h2>Dine data</h2>
      <div className="info">
        <button type="button" className="row" onClick={doExport}>
          <div className="row-icon">
            <Icon name="download" />
          </div>
          <div className="row-main">
            <b>Eksportér mine data</b>
            <span>Backup som fil, inkl. kvitteringsbilleder</span>
          </div>
        </button>
        <button type="button" className="row" onClick={() => fileInput.current?.click()}>
          <div className="row-icon">
            <Icon name="upload" />
          </div>
          <div className="row-main">
            <b>Importér backup</b>
            <span>Erstatter alt på denne enhed</span>
          </div>
        </button>
        <button type="button" className="row" onClick={() => setConfirm('demo')}>
          <div className="row-icon">
            <Icon name="sparkle" />
          </div>
          <div className="row-main">
            <b>Indlæs demodata</b>
            <span>Eksempler, der passer til dagens dato</span>
          </div>
        </button>
        <button type="button" className="row" onClick={() => setConfirm('delete')}>
          <div className="row-icon" style={{ background: 'var(--danger-icon)', color: 'var(--danger-text)' }}>
            <Icon name="trash" />
          </div>
          <div className="row-main">
            <b className="text-danger">Slet alle data</b>
            <span>Kan ikke fortrydes</span>
          </div>
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => doImport(e.target.files?.[0])}
      />

      <p className="muted center" style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
        <Icon name="lock" size={15} /> Dine data gemmes kun på denne enhed.
      </p>
      <p className="slogan">Dit liv. Ét overblik.</p>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'delete' ? 'Slet alle data?' : 'Indlæs demodata?'}
      >
        <p className="muted" style={{ margin: '12px 0 16px', lineHeight: 1.5 }}>
          {confirm === 'delete'
            ? 'Alle køb, kvitteringer, abonnementer, regninger og indstillinger bliver slettet fra denne enhed. Overvej at eksportere en backup først.'
            : 'Demodata erstatter alt, der ligger i Veya nu. Dit navn beholdes.'}
        </p>
        <button type="button" className={`action ${confirm === 'delete' ? 'danger' : ''}`} disabled={busy} onClick={doConfirm}>
          {confirm === 'delete' ? 'Ja, slet alt' : 'Indlæs demodata'}
        </button>
        <button type="button" className="action ghost" onClick={() => setConfirm(null)}>
          Annullér
        </button>
      </Modal>
    </section>
  );
}
