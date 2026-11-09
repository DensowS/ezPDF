import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { DocumentFile } from '../domain';
import { discoverFields, openPdf, savePdf, type Pdf } from '../pdf/engine';
import { printDocument } from '../pdf/print';
import { emptyHistory, fieldReducer, isDirty } from './fields';
export type ConfirmAction =
  { type: 'leave' } | { type: 'close' } | { type: 'open'; file: DocumentFile };
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
export function useDocumentSession() {
  const [file, setFile] = useState<DocumentFile | null>(null),
    [pdf, setPdf] = useState<Pdf | null>(null);
  const [history, dispatch] = useReducer(fieldReducer, emptyHistory);
  const [editing, setEditing] = useState(false),
    [analyzed, setAnalyzed] = useState(false);
  const [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [firstSize, setFirstSize] = useState({ width: 595, height: 842 });
  const [confirmation, setConfirmation] = useState<ConfirmAction | null>(null);
  const [generation, setGeneration] = useState(0);
  const dirty = isDirty(history),
    lock = useRef(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(
    () => () => {
      void pdf?.loadingTask.destroy();
    },
    [pdf],
  );
  useEffect(() => {
    window.desktop?.setDirty(dirty);
  }, [dirty]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty && !window.desktop) event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  const load = useCallback(async (incoming: DocumentFile) => {
    if (lock.current) return;
    lock.current = true;
    setBusy('PDF öffnen …');
    setError('');
    let opened: Pdf | undefined;
    try {
      opened = await openPdf(incoming.bytes);
      const first = (await opened.getPage(1)).getViewport({ scale: 1, rotation: 0 });
      setFirstSize({ width: first.width, height: first.height });
      setPdf(opened);
      setFile(incoming);
      setEditing(false);
      setAnalyzed(false);
      dispatch({ type: 'reset', fields: [] });
      setGeneration((g) => g + 1);
      setNotice('Lesemodus · Änderungen erst über „Bearbeiten“.');
    } catch (error) {
      await opened?.loadingTask.destroy();
      setError('PDF konnte nicht geöffnet werden: ' + errorMessage(error));
    } finally {
      lock.current = false;
      setBusy('');
    }
  }, []);
  const requestOpen = useCallback(
    async (incoming: DocumentFile) => {
      if (lock.current) return;
      if (dirtyRef.current) {
        setConfirmation({ type: 'open', file: incoming });
        return;
      }
      await load(incoming);
    },
    [load],
  );
  useEffect(() => {
    const offFile = window.desktop?.onFile(requestOpen);
    const offClose = window.desktop?.onClose(() => setConfirmation({ type: 'close' }));
    window.desktop?.ready();
    return () => {
      offFile?.();
      offClose?.();
    };
  }, [requestOpen]);
  async function enterEditor() {
    if (!pdf || lock.current) return;
    if (analyzed) {
      setEditing(true);
      return;
    }
    lock.current = true;
    setBusy('Formularfelder erkennen …');
    setError('');
    try {
      const fields = await discoverFields(pdf);
      dispatch({ type: 'reset', fields });
      setAnalyzed(true);
      setEditing(true);
      setNotice(`${fields.length} Felder erkannt. Beschriftungen und Positionen bitte prüfen.`);
    } catch (error) {
      setError('Felderkennung fehlgeschlagen: ' + errorMessage(error));
    } finally {
      lock.current = false;
      setBusy('');
    }
  }
  function leaveEditor() {
    if (lock.current) return;
    if (dirty) setConfirmation({ type: 'leave' });
    else {
      setEditing(false);
      setNotice('Lesemodus');
    }
  }
  async function save(exit = false): Promise<boolean> {
    if (!file || !pdf || lock.current) return false;
    lock.current = true;
    setBusy('PDF speichern …');
    setError('');
    let reopened: Pdf | undefined;
    try {
      const bytes = await savePdf(file.bytes, history.current);
      const name = file.name.replace(/(?:-bearbeitet)?\.pdf$/i, '') + '-bearbeitet.pdf';
      let saved: boolean;
      if (window.desktop) saved = await window.desktop.save(name, bytes);
      else {
        const url = URL.createObjectURL(
          new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        saved = true;
      }
      if (!saved) return false;
      reopened = await openPdf(bytes);
      const fields = exit ? [] : await discoverFields(reopened);
      setPdf(reopened);
      setFile({ name, bytes });
      dispatch({ type: 'reset', fields });
      setAnalyzed(!exit);
      setEditing(!exit);
      setNotice('PDF gespeichert. Die Formularfelder bleiben ausfüllbar.');
      return true;
    } catch (error) {
      await reopened?.loadingTask.destroy();
      setError('Speichern fehlgeschlagen: ' + errorMessage(error));
      return false;
    } finally {
      lock.current = false;
      setBusy('');
    }
  }
  async function print() {
    if (!pdf || !file || lock.current) return;
    lock.current = true;
    setError('');
    setBusy('Druck vorbereiten …');
    let temporary: Pdf | undefined;
    try {
      const printPdf = dirty
        ? (temporary = await openPdf(await savePdf(file.bytes, history.current)))
        : pdf;
      const success = await printDocument(printPdf, (page) =>
        setBusy(`Druck vorbereiten · Seite ${page} von ${pdf.numPages} …`),
      );
      setNotice(success ? 'Dokument an den Druckdialog übergeben.' : 'Drucken abgebrochen.');
    } catch (error) {
      setError('Drucken fehlgeschlagen: ' + errorMessage(error));
    } finally {
      await temporary?.loadingTask.destroy();
      lock.current = false;
      setBusy('');
    }
  }
  async function resolveConfirmation(choice: 'save' | 'discard' | 'cancel') {
    const action = confirmation;
    if (!action || lock.current) return;
    if (choice === 'cancel') {
      setConfirmation(null);
      return;
    }
    if (choice === 'save' && !(await save(true))) return;
    if (choice === 'discard') dispatch({ type: 'discard' });
    setConfirmation(null);
    if (action.type === 'close') window.desktop?.allowClose();
    else if (action.type === 'leave') {
      setEditing(false);
      setNotice(
        choice === 'discard' ? 'Änderungen verworfen · Lesemodus' : 'PDF gespeichert · Lesemodus',
      );
    } else await load(action.file);
  }
  return {
    file,
    pdf,
    history,
    dispatch,
    editing,
    dirty,
    busy,
    error,
    notice,
    firstSize,
    generation,
    confirmation,
    setError,
    requestOpen,
    enterEditor,
    leaveEditor,
    save,
    print,
    resolveConfirmation,
  };
}
