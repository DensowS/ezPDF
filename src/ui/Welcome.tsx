import { FolderOpen } from 'lucide-react';
import logo from '../../assets/brand/ezpdf-icon.png';
export function Welcome({ onOpen, busy }: { onOpen(): void; busy: boolean }) {
  return (
    <section className="welcome-workspace">
      <div className="welcome">
        <img className="welcome-logo" src={logo} alt="ezPDF" />
        <button className="primary large" onClick={onOpen} disabled={busy}>
          <FolderOpen size={18} />
          PDF öffnen
        </button>
        <small>oder eine PDF hierher ziehen</small>
      </div>
    </section>
  );
}
