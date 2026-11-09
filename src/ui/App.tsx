import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileText,
  FolderOpen,
  Save,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  ScanLine,
  Type,
  PanelRightClose,
  Check,
  ShieldCheck,
  Undo2,
  X,
  LoaderCircle,
} from 'lucide-react';
import type { DocumentFile, Field } from '../domain';
import { discoverFields, openPdf, savePdf, type Pdf } from '../pdf/engine';

export function App() {
  const [file, setFile] = useState<DocumentFile | null>(null),
    [pdf, setPdf] = useState<Pdf | null>(null);
  const [fields, setFields] = useState<Field[]>([]),
    [page, setPage] = useState(0),
    [zoom, setZoom] = useState(1);
  const [size, setSize] = useState({ width: 595, height: 842 }),
    [busy, setBusy] = useState('');
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [dirty, setDirty] = useState(false);
  const [manual, setManual] = useState(false),
    [sidebar, setSidebar] = useState(true),
    [selected, setSelected] = useState('');
  const [history, setHistory] = useState<Field[][]>([]),
    [closePrompt, setClosePrompt] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null),
    input = useRef<HTMLInputElement>(null),
    pdfRef = useRef<Pdf | null>(null);
  const busyRef = useRef(false),
    dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  const load = useCallback(async (incoming: DocumentFile) => {
    if (busyRef.current) return;
    if (
      dirtyRef.current &&
      !window.confirm('Ungespeicherte Änderungen verwerfen und andere PDF öffnen?')
    )
      return;
    busyRef.current = true;
    setBusy('PDF öffnen und Felder erkennen …');
    setError('');
    setNotice('');
    let opened: Pdf | undefined;
    try {
      opened = await openPdf(incoming.bytes);
      const detected = await discoverFields(opened);
      await pdfRef.current?.loadingTask.destroy();
      pdfRef.current = opened;
      setPdf(opened);
      setFile(incoming);
      setFields(detected);
      setPage(0);
      setHistory([]);
      setDirty(false);
      setSelected('');
      setNotice(`${detected.length} Felder erkannt. Bitte Zuordnung prüfen.`);
    } catch (e) {
      await opened?.loadingTask.destroy();
      setError('PDF konnte nicht geladen werden: ' + message(e));
    } finally {
      busyRef.current = false;
      setBusy('');
    }
  }, []);
  useEffect(() => {
    const unsubscribe = window.desktop?.onFile(load);
    const close = window.desktop?.onClose(() => setClosePrompt(true));
    window.desktop?.ready();
    return () => {
      unsubscribe?.();
      close?.();
    };
  }, [load]);
  useEffect(() => {
    window.desktop?.setDirty(dirty);
  }, [dirty]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty && !window.desktop) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let canceled = false,
      render: { cancel(): void; promise: Promise<unknown> } | undefined;
    pdf
      .getPage(page + 1)
      .then(async (p) => {
        if (canceled || !canvas.current) return;
        const view = p.getViewport({ scale: zoom, rotation: 0 });
        const element = canvas.current,
          ratio = window.devicePixelRatio || 1;
        element.width = Math.floor(view.width * ratio);
        element.height = Math.floor(view.height * ratio);
        setSize({ width: view.width, height: view.height });
        render = p.render({
          canvas: element,
          canvasContext: element.getContext('2d')!,
          viewport: view,
          transform: [ratio, 0, 0, ratio, 0, 0],
          annotationMode: 0,
        });
        await render.promise;
      })
      .catch((e) => {
        if (!canceled) setError(message(e));
      });
    return () => {
      canceled = true;
      render?.cancel();
    };
  }, [pdf, page, zoom]);
  const open = async () => {
    if (window.desktop) {
      try {
        const chosen = await window.desktop.open();
        if (chosen) await load(chosen);
      } catch (e) {
        setError(message(e));
      }
    } else input.current?.click();
  };
  const save = async (): Promise<boolean> => {
    if (!file || busyRef.current) return false;
    busyRef.current = true;
    setBusy('PDF speichern …');
    setError('');
    try {
      const bytes = await savePdf(file.bytes, fields),
        name = file.name.replace(/\.pdf$/i, '') + '-bearbeitet.pdf';
      let saved = true;
      if (window.desktop) saved = await window.desktop.save(name, bytes);
      else {
        const url = URL.createObjectURL(
          new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }),
        );
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
      if (saved) {
        setDirty(false);
        setNotice('PDF gespeichert. Die Formularfelder bleiben ausfüllbar.');
      }
      return saved;
    } catch (e) {
      setError('Speichern fehlgeschlagen: ' + message(e));
      return false;
    } finally {
      busyRef.current = false;
      setBusy('');
    }
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        void open();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  const change = (id: string, value: string) => {
    setHistory((h) => [...h.slice(-99), fields]);
    const target = fields.find((f) => f.id === id)!;
    setFields((all) =>
      all.map((f) =>
        f.id === id || (target.nativeName && f.nativeName === target.nativeName)
          ? { ...f, value }
          : f,
      ),
    );
    setDirty(true);
  };
  const undo = () => {
    const previous = history.at(-1);
    if (previous) {
      setFields(previous);
      setHistory((h) => h.slice(0, -1));
      setDirty(true);
    }
  };
  const editor = (field: Field, overlay: boolean) => {
    const props = {
      'aria-label': field.label,
      disabled: field.readOnly || !!busy,
      onFocus: () => setSelected(field.id),
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        change(
          field.id,
          field.kind === 'checkbox'
            ? (e.target as HTMLInputElement).checked
              ? 'true'
              : ''
            : e.target.value,
        ),
    };
    if (field.kind === 'checkbox')
      return <input {...props} type="checkbox" checked={field.value === 'true'} />;
    if (field.kind === 'choice')
      return (
        <select {...props} value={field.value}>
          <option value="">Auswählen</option>
          {field.options?.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      );
    return (
      <input
        {...props}
        value={field.value}
        placeholder={overlay ? '' : 'Hier eingeben …'}
        style={overlay ? { fontSize: Math.min(11, field.height * 0.48) * zoom } : undefined}
      />
    );
  };
  const current = fields.filter((f) => f.page === page);
  return (
    <div
      className="app"
      onDragOver={(e) => e.preventDefault()}
      onDrop={async (e) => {
        e.preventDefault();
        const chosen = e.dataTransfer.files[0];
        if (chosen)
          await load({ name: chosen.name, bytes: new Uint8Array(await chosen.arrayBuffer()) });
      }}
    >
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={async (e) => {
          const chosen = e.target.files?.[0];
          if (chosen)
            await load({ name: chosen.name, bytes: new Uint8Array(await chosen.arrayBuffer()) });
          e.target.value = '';
        }}
      />
      <header>
        <div className="brand">
          <div className="brand-icon">
            <FileText size={22} />
          </div>
          <span>
            ez<span>PDF</span>
          </span>
          <small>DESKTOP</small>
        </div>
        <div className="filename">
          {file ? (
            <>
              <FileText size={15} />
              {file.name}
              {dirty && <span className="dot" title="Ungespeicherte Änderungen" />}
            </>
          ) : (
            'Dein Raum für Dokumente'
          )}
        </div>
        <span className="local">
          <ShieldCheck size={14} /> Lokal auf deinem Gerät
        </span>
      </header>
      <nav>
        <div className="toolgroup">
          <button onClick={open} disabled={!!busy}>
            <FolderOpen size={17} />
            Öffnen
          </button>
          <button disabled={!file || !!busy} onClick={() => void save()} className="primary">
            <Save size={16} />
            Speichern unter
          </button>
        </div>
        <div className="toolgroup">
          <button
            onClick={undo}
            disabled={!history.length || !!busy}
            title="Letzte Änderung rückgängig"
          >
            <Undo2 size={17} />
          </button>
          <i />
          <button
            onClick={() => setManual(!manual)}
            disabled={!file || !!busy}
            className={manual ? 'active' : ''}
          >
            <Type size={17} />
            Text ergänzen
          </button>
          <button
            className={!manual && file ? 'active' : ''}
            disabled={!file}
            onClick={() => setManual(false)}
          >
            <ScanLine size={17} />
            Formular
          </button>
        </div>
        <div className="toolbar-end">
          <button
            disabled={!pdf || page === 0 || !!busy}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Vorherige Seite"
          >
            <ChevronLeft size={17} />
          </button>
          <span>{pdf ? `${page + 1} / ${pdf.numPages}` : '– / –'}</span>
          <button
            disabled={!pdf || page >= pdf.numPages - 1 || !!busy}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Nächste Seite"
          >
            <ChevronRight size={17} />
          </button>
          <i />
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
            disabled={!file}
            aria-label="Verkleinern"
          >
            <Minus size={16} />
          </button>
          <span>{Math.round(zoom * 100)} %</span>
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
            disabled={!file}
            aria-label="Vergrößern"
          >
            <Plus size={16} />
          </button>
          <button onClick={() => setSidebar((s) => !s)} aria-label="Felderleiste umschalten">
            <PanelRightClose size={17} />
          </button>
        </div>
      </nav>
      {(error || busy) && (
        <div role={error ? 'alert' : 'status'} className={'banner ' + (error ? 'error' : '')}>
          {busy && <LoaderCircle className="spin" size={16} />} {error || busy}
          {error && (
            <button onClick={() => setError('')} aria-label="Meldung schließen">
              <X size={15} />
            </button>
          )}
        </div>
      )}
      <main>
        <section className={'workspace ' + (manual ? 'placing' : '')}>
          {!pdf ? (
            <div className="welcome">
              <div className="welcome-icon">
                <FileText size={42} strokeWidth={1.3} />
              </div>
              <span className="eyebrow">WENIGER AUFWAND. MEHR ERLEDIGT.</span>
              <h1>
                Deine PDFs.
                <br />
                <span>Einfach bearbeitet.</span>
              </h1>
              <p>
                Öffne ein Dokument, fülle erkannte Felder aus
                <br />
                und speichere deine fertige PDF.
              </p>
              <button className="primary large" onClick={open} disabled={!!busy}>
                <FolderOpen size={18} />
                PDF öffnen
              </button>
              <small>oder eine PDF hierher ziehen · Strg + O</small>
              <div className="feature-pills">
                <span>
                  <ScanLine size={15} />
                  Automatische Felderkennung
                </span>
                <span>
                  <ShieldCheck size={15} />
                  Ohne Cloud
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="paper-meta">
                <span>SEITE {page + 1}</span>
                <span>
                  {manual
                    ? 'Klicke auf die Seite, um ein Textfeld zu ergänzen'
                    : 'Erkannte Felder direkt im Dokument ausfüllen'}
                </span>
              </div>
              <div
                className="paper"
                style={{ width: size.width, height: size.height }}
                onClick={(e) => {
                  if (!manual || busy) return;
                  const rect = e.currentTarget.getBoundingClientRect(),
                    width = size.width / zoom,
                    height = size.height / zoom;
                  const field: Field = {
                    id: crypto.randomUUID(),
                    source: 'manual',
                    kind: 'text',
                    page,
                    label: 'Ergänzter Text',
                    value: '',
                    x: Math.max(0, Math.min((e.clientX - rect.left) / zoom, width - 160)),
                    y: Math.max(0, Math.min((e.clientY - rect.top) / zoom, height - 24)),
                    width: Math.min(160, width),
                    height: 24,
                  };
                  setHistory((h) => [...h.slice(-99), fields]);
                  setFields((f) => [...f, field]);
                  setManual(false);
                  setSelected(field.id);
                  setDirty(true);
                }}
              >
                <canvas ref={canvas} style={{ width: size.width, height: size.height }} />
                {current.map((field) => (
                  <div
                    key={field.id}
                    className={'field-overlay ' + (selected === field.id ? 'selected' : '')}
                    style={{
                      left: field.x * zoom,
                      top: field.y * zoom,
                      width: field.width * zoom,
                      height: field.height * zoom,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {editor(field, true)}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
        {sidebar && (
          <aside>
            <div className="aside-heading">
              <div>
                <span className="eyebrow">DEIN DOKUMENT</span>
                <h2>
                  Formularfelder <b>{fields.length}</b>
                </h2>
              </div>
              <ScanLine size={20} />
            </div>
            {!file ? (
              <div className="aside-empty">
                <div className="empty-lines">
                  <span />
                  <span />
                  <span />
                </div>
                <h3>Wir finden die Felder für dich.</h3>
                <p>
                  Bestehende Formularfelder und graue Eingabeflächen werden beim Öffnen automatisch
                  erkannt.
                </p>
              </div>
            ) : (
              <>
                <div className="aside-note">
                  <Check size={16} />
                  <span>
                    {fields.length} Felder im Dokument
                    <br />
                    <small>Erkennung und Beschriftung bitte prüfen.</small>
                  </span>
                </div>
                <div className="fields-list">
                  {fields.length === 0 && (
                    <p>
                      Keine Felder erkannt. Über „Text ergänzen“ kannst du eigene Textfelder
                      platzieren.
                    </p>
                  )}
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className={'field-card ' + (selected === field.id ? 'focused' : '')}
                      onClick={() => {
                        setPage(field.page);
                        setSelected(field.id);
                      }}
                    >
                      <div className="field-title">
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <label>{field.label}</label>
                        {field.source !== 'native' && (
                          <button
                            title="Feld entfernen"
                            aria-label={'Feld entfernen: ' + field.label}
                            onClick={(e) => {
                              e.stopPropagation();
                              setHistory((h) => [...h.slice(-99), fields]);
                              setFields((f) => f.filter((item) => item.id !== field.id));
                              setDirty(true);
                            }}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                      {editor(field, false)}
                      <small>
                        Seite {field.page + 1} ·{' '}
                        {field.source === 'native'
                          ? 'PDF-Formular'
                          : field.source === 'detected'
                            ? 'Automatisch erkannt'
                            : 'Ergänzter Text'}
                        {field.readOnly ? ' · Schreibgeschützt' : ''}
                      </small>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="aside-footer">
              <ShieldCheck size={16} />
              <span>
                Deine Dokumente bleiben bei dir.
                <br />
                <small>Keine Uploads. Kein Konto erforderlich.</small>
              </span>
            </div>
          </aside>
        )}
      </main>
      <footer>
        <span>
          <span className="status-dot" />
          {notice || 'Bereit für dein nächstes Dokument'}
        </span>
        <span>
          ezPDF <span className="version">0.1.0</span>
        </span>
      </footer>
      {closePrompt && (
        <div className="modal-backdrop">
          <div role="dialog" aria-modal="true" aria-labelledby="close-title" className="modal">
            <h2 id="close-title">Änderungen speichern?</h2>
            <p>Dein Dokument enthält ungespeicherte Änderungen.</p>
            <div>
              <button onClick={() => setClosePrompt(false)}>Abbrechen</button>
              <button onClick={() => window.desktop?.allowClose()}>Verwerfen</button>
              <button
                className="primary"
                onClick={async () => {
                  if (await save()) window.desktop?.allowClose();
                }}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
