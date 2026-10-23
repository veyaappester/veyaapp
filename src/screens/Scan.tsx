import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';
import { useToast } from '../components/toastContext';
import { compressImage } from '../db/images';
import { parseReceipt } from '../logic/receiptParser';
import { setScanSession } from '../ocr/scanSession';
import { readReceiptText, type OcrProgress } from '../ocr/tesseract';

type CameraState = 'idle' | 'starting' | 'live' | 'unavailable';

export default function Scan() {
  const navigate = useNavigate();
  const toast = useToast();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState<CameraState>('idle');
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [preview, setPreview] = useState<string>();

  const stopCamera = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera('unavailable');
      return;
    }
    setCamera('starting');
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      stream.current = s;
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play().catch(() => {});
      }
      setCamera('live');
    } catch {
      setCamera('unavailable');
    }
  }, []);

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);

  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  const processImage = async (source: Blob) => {
    stopCamera();
    setCamera('idle');
    setPreview(URL.createObjectURL(source));
    setProgress({ progress: 0, label: 'Gør billedet klar…' });
    try {
      const { blob, thumb, canvas } = await compressImage(source);
      let text = '';
      try {
        text = await readReceiptText(canvas, setProgress);
      } catch {
        toast('Veya kunne ikke læse teksten. Du kan udfylde købet selv.');
      }
      setScanSession({ blob, thumb, text, parsed: parseReceipt(text) });
      navigate('/scan/resultat');
    } catch {
      toast('Billedet kunne ikke åbnes. Prøv et andet billede.');
      setProgress(null);
      setPreview(undefined);
      startCamera();
    }
  };

  const capture = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext('2d')!.drawImage(v, 0, 0);
    canvas.toBlob((b) => b && processImage(b), 'image/jpeg', 0.92);
  };

  const onFile = (file: File | undefined) => {
    if (file) processImage(file);
  };

  if (progress) {
    return (
      <section className="page">
        <div className="top">
          <Logo size={40} />
          <span className="muted">Trin 1 af 2</span>
        </div>
        <div className="scan-area">{preview && <img className="preview" src={preview} alt="Din kvittering" />}</div>
        <div className="ocr-progress" role="status" aria-live="polite">
          <div className="spinner" />
          <h1 style={{ fontSize: 20 }}>{progress.label}</h1>
          <div className="progress" style={{ maxWidth: 240, margin: '14px auto 8px' }}>
            <i style={{ width: `${Math.round(progress.progress * 100)}%` }} />
          </div>
          <p className="muted small">Første gang henter Veya læse-data (ca. 5 MB). Alt sker på din telefon.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="top">
        <Logo size={40} />
        <span className="muted">Trin 1 af 2</span>
      </div>
      <div className={`scan-area${camera === 'live' ? ' live' : ''}`}>
        <video ref={video} playsInline muted aria-label="Kamera" style={{ display: camera === 'live' ? 'block' : 'none' }} />
        <div className="corner c1" />
        <div className="corner c2" />
        <div className="corner c3" />
        <div className="corner c4" />
        {camera !== 'live' && (
          <div className="receipt-mock" aria-hidden="true">
            <b>ELGIGANTEN</b>
            <br />
            AirPods Pro (2nd gen)
            <br />1 x 1.899,00
            <br />
            <span>09-09-2026 14:32</span>
            <br />
            ──────────
            <br />
            <b>TOTAL 1.899,00</b>
          </div>
        )}
        {camera === 'live' && <button type="button" className="shutter" aria-label="Tag billede af kvitteringen" onClick={capture} />}
      </div>

      <div className="scan-copy">
        <h1>Scan din kvittering</h1>
        <p>
          {camera === 'live'
            ? 'Hold kvitteringen inden for rammen og tryk på knappen. Veya finder selv butik, pris og dato.'
            : 'Tag et billede eller vælg et fra dine billeder. Veya finder selv butik, køb, pris og dato.'}
        </p>
      </div>

      {camera !== 'live' && (
        <button type="button" className="action" onClick={() => cameraInput.current?.click()}>
          <Icon name="camera" /> Tag billede
        </button>
      )}
      <button type="button" className={`action ${camera === 'live' ? '' : 'secondary'}`} onClick={() => galleryInput.current?.click()}>
        <Icon name="image" /> Vælg fra billeder
      </button>
      <Link to="/koeb/ny" className="action ghost">
        Tilføj manuelt uden billede
      </Link>
      {camera === 'unavailable' && (
        <p className="muted small center" style={{ marginTop: 8 }}>
          Kameraet kunne ikke startes her. "Tag billede" åbner telefonens kamera i stedet.
        </p>
      )}

      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </section>
  );
}
