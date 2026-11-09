import { useEffect, useRef } from 'react';
export function ConfirmDialog({
  busy,
  onChoice,
}: {
  busy: boolean;
  onChoice(choice: 'save' | 'discard' | 'cancel'): void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onChoice('cancel');
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const buttons = Array.from(
          ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || [],
        );
        if (!buttons.length) {
          event.preventDefault();
          return;
        }
        if (event.shiftKey && document.activeElement === buttons[0]) {
          event.preventDefault();
          buttons.at(-1)?.focus();
        }
        if (!event.shiftKey && document.activeElement === buttons.at(-1)) {
          event.preventDefault();
          buttons[0].focus();
        }
      }}
    >
      <h2 id="confirm-title">Änderungen speichern?</h2>
      <p>Dein Dokument enthält ungespeicherte Änderungen.</p>
      <div>
        <button disabled={busy} onClick={() => onChoice('cancel')} autoFocus>
          Abbrechen
        </button>
        <button disabled={busy} onClick={() => onChoice('discard')}>
          Verwerfen
        </button>
        <button disabled={busy} className="primary" onClick={() => onChoice('save')}>
          Speichern
        </button>
      </div>
    </dialog>
  );
}
