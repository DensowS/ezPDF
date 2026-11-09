import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, LoaderCircle, X } from 'lucide-react';
import type { Field } from '../domain';
import { useDocumentSession, errorMessage } from '../state/useDocumentSession';
import { DocumentViewer, type ZoomMode } from './DocumentViewer';
import { Toolbar } from './Toolbar';
import { Welcome } from './Welcome';
import { Thumbnails } from './Thumbnails';
import { FieldInspector } from './FieldInspector';
import { ConfirmDialog } from './ConfirmDialog';
import { SearchBar } from './SearchBar';
import { useSearch } from './useSearch';
import logo from '../../assets/brand/ezpdf-icon.png';

export function App() {
  const session = useDocumentSession(),
    search = useSearch(session.pdf);
  const [page, setPage] = useState(0),
    [request, setRequest] = useState({ index: 0, token: 0 });
  const [mode, setMode] = useState<ZoomMode>('page'),
    [customZoom, setCustomZoom] = useState(1),
    [zoom, setZoom] = useState(1);
  const [thumbnails, setThumbnails] = useState(false),
    [manual, setManual] = useState(false),
    [selected, setSelected] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    document.title = session.file ? `${session.file.name} — ezPDF` : 'ezPDF';
  }, [session.file]);
  useEffect(() => {
    setPage(0);
    setRequest({ index: 0, token: Date.now() });
    setMode('page');
    setSelected('');
    setManual(false);
  }, [session.generation]);
  useEffect(() => {
    if (!session.editing) {
      setManual(false);
      setSelected('');
    }
  }, [session.editing]);
  const goTo = useCallback(
    (index: number) => {
      const target = Math.max(0, Math.min((session.pdf?.numPages || 1) - 1, index));
      setPage(target);
      setRequest((previous) => ({ index: target, token: previous.token + 1 }));
    },
    [session.pdf],
  );
  useEffect(() => {
    const match = search.matches[search.active];
    if (match) goTo(match.page);
  }, [search.matches, search.active, goTo]);
  const onPatch = useCallback(
    (id: string, patch: Partial<Field>) => session.dispatch({ type: 'patch', id, patch }),
    [session.dispatch],
  );
  const addField = useCallback(
    (field: Field) => {
      session.dispatch({ type: 'add', field });
      setManual(false);
      setSelected(field.id);
    },
    [session.dispatch],
  );
  function selectField(id: string) {
    setSelected(id);
    const field = session.history.current.find((field) => field.id === id);
    if (field && field.page !== page) goTo(field.page);
  }
  async function open() {
    if (session.busy) return;
    if (!window.desktop) {
      input.current?.click();
      return;
    }
    try {
      const file = await window.desktop.open();
      if (file) await session.requestOpen(file);
    } catch (error) {
      session.setError(errorMessage(error));
    }
  }
  function changeZoom(value: number) {
    setMode('custom');
    setCustomZoom(Math.max(0.15, Math.min(3, value)));
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (session.confirmation) return;
      const modifier = event.ctrlKey || event.metaKey,
        key = event.key.toLowerCase();
      if (modifier && key === 'o') {
        event.preventDefault();
        void open();
      }
      if (modifier && key === 's') {
        event.preventDefault();
        if (session.editing) void session.save();
      }
      if (modifier && key === 'p' && session.pdf) {
        event.preventDefault();
        void session.print();
      }
      if (modifier && key === 'f' && session.pdf) {
        event.preventDefault();
        search.setOpen(true);
      }
      if (session.busy) return;
      if (modifier && session.editing && (key === 'z' || key === 'y')) {
        event.preventDefault();
        session.dispatch({ type: key === 'y' || event.shiftKey ? 'redo' : 'undo' });
      }
      const target = event.target as HTMLElement;
      if (
        !session.pdf ||
        modifier ||
        target.closest('input,select,textarea,[contenteditable="true"]')
      )
        return;
      if (event.key === 'PageDown') {
        event.preventDefault();
        goTo(page + 1);
      }
      if (event.key === 'PageUp') {
        event.preventDefault();
        goTo(page - 1);
      }
      if (event.key === 'Home') {
        event.preventDefault();
        goTo(0);
      }
      if (event.key === 'End') {
        event.preventDefault();
        goTo(session.pdf.numPages - 1);
      }
      if (event.key === 'Escape') {
        setManual(false);
        search.close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
  return (
    <div
      className="app"
      data-mode={session.editing ? 'edit' : 'view'}
      onDragOver={(event) => event.preventDefault()}
      onDrop={async (event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file && !session.busy)
          await session.requestOpen({
            name: file.name,
            bytes: new Uint8Array(await file.arrayBuffer()),
          });
      }}
    >
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={async (event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file)
            await session.requestOpen({
              name: file.name,
              bytes: new Uint8Array(await file.arrayBuffer()),
            });
        }}
      />
      {session.pdf && (
        <>
          <header>
            <div className="brand">
              <img src={logo} alt="ezPDF Logo" />
              <span>
                ez<span>PDF</span>
              </span>
            </div>
            <div className="filename">
              {session.file ? (
                <>
                  <FileText size={15} />
                  {session.file.name}
                  {session.dirty && <span className="dot" title="Ungespeicherte Änderungen" />}
                </>
              ) : null}
            </div>
          </header>
          <Toolbar
            hasFile={!!session.pdf}
            busy={!!session.busy}
            editing={session.editing}
            page={page}
            total={session.pdf?.numPages || 0}
            zoom={zoom}
            mode={mode}
            manual={manual}
            thumbnails={thumbnails}
            canUndo={!!session.history.past.length}
            canRedo={!!session.history.future.length}
            onOpen={() => void open()}
            onSave={() => void session.save()}
            onEdit={() => void session.enterEditor()}
            onLeave={session.leaveEditor}
            onPrint={() => void session.print()}
            onSearch={() => search.setOpen((value) => !value)}
            onThumbnails={() => setThumbnails((value) => !value)}
            onManual={() => setManual((value) => !value)}
            onUndo={() => session.dispatch({ type: 'undo' })}
            onRedo={() => session.dispatch({ type: 'redo' })}
            onPage={goTo}
            onZoom={changeZoom}
            onMode={setMode}
          />
        </>
      )}
      {search.open && (
        <SearchBar
          query={search.query}
          onQuery={search.setQuery}
          count={search.matches.length}
          active={search.active}
          searching={search.searching}
          error={search.error}
          onNext={search.next}
          onClose={search.close}
        />
      )}
      {(session.error || session.busy) && (
        <div
          role={session.error ? 'alert' : 'status'}
          className={`banner ${session.error ? 'error' : ''}`}
        >
          {session.busy && <LoaderCircle size={16} className="spin" />}
          {session.error || session.busy}
          {session.error && (
            <button onClick={() => session.setError('')} aria-label="Meldung schließen">
              <X size={15} />
            </button>
          )}
        </div>
      )}
      <main>
        {session.pdf ? (
          <>
            {thumbnails && <Thumbnails pdf={session.pdf} current={page} onPage={goTo} />}
            <DocumentViewer
              pdf={session.pdf}
              firstSize={session.firstSize}
              mode={mode}
              customZoom={customZoom}
              request={request}
              currentPage={page}
              editing={session.editing}
              fields={session.history.current}
              selected={selected}
              manual={manual}
              busy={!!session.busy}
              matches={search.matches}
              activeMatch={search.active}
              onCurrent={setPage}
              onZoom={setZoom}
              onSelect={setSelected}
              onPatch={onPatch}
              onAdd={addField}
              onError={session.setError}
            />
            {session.editing && (
              <FieldInspector
                pdf={session.pdf}
                fields={session.history.current}
                selected={selected}
                disabled={!!session.busy}
                onSelect={selectField}
                onPatch={onPatch}
                onRemove={(id) => session.dispatch({ type: 'remove', id })}
              />
            )}
          </>
        ) : (
          <Welcome onOpen={() => void open()} busy={!!session.busy} />
        )}
      </main>
      {session.pdf && session.notice && <footer aria-live="polite">{session.notice}</footer>}
      {session.confirmation && (
        <ConfirmDialog
          busy={!!session.busy}
          onChoice={(choice) => void session.resolveConfirmation(choice)}
        />
      )}
    </div>
  );
}
