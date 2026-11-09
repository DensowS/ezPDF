import { FileText, FolderOpen, ShieldCheck } from 'lucide-react';
import logo from '../../assets/brand/ezpdf-icon.svg';
export function Welcome({ onOpen, busy }: { onOpen(): void; busy: boolean }) {
  return (
    <section className="welcome-workspace">
      <div className="welcome">
        <img className="welcome-logo" src={logo} alt="" />
        <span className="eyebrow">DEIN RAUM FÜR DOKUMENTE</span>
        <h1>
          Einfach öffnen.
          <br />
          <span>Entspannt lesen.</span>
        </h1>
        <p>
          Deine PDFs im Mittelpunkt.
          <br />
          Und wenn du mehr vorhast: ein Klick auf Bearbeiten.
        </p>
        <button className="primary large" onClick={onOpen} disabled={busy}>
          <FolderOpen size={18} />
          PDF öffnen
        </button>
        <small>oder eine PDF hierher ziehen · Strg + O</small>
        <div className="feature-pills">
          <span>
            <FileText size={15} />
            Lesen ohne Ablenkung
          </span>
          <span>
            <ShieldCheck size={15} />
            Alles bleibt lokal
          </span>
        </div>
      </div>
    </section>
  );
}
