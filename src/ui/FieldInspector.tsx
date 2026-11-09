import { useEffect, useState } from 'react';
import { ScanLine, ShieldCheck, X } from 'lucide-react';
import type { Field } from '../domain';
import type { Pdf } from '../pdf/engine';
import { boundRect } from '../state/fields';
import { FieldInput } from './FieldInput';
export function FieldInspector({
  pdf,
  fields,
  selected,
  disabled,
  onSelect,
  onPatch,
  onRemove,
}: {
  pdf: Pdf;
  fields: Field[];
  selected: string;
  disabled: boolean;
  onSelect(id: string): void;
  onPatch(id: string, patch: Partial<Field>): void;
  onRemove(id: string): void;
}) {
  const field = fields.find((field) => field.id === selected);
  const [size, setSize] = useState({ width: 595, height: 842 });
  useEffect(() => {
    let active = true;
    if (field)
      void pdf.getPage(field.page + 1).then((page) => {
        const view = page.getViewport({ scale: 1, rotation: 0 });
        if (active) setSize({ width: view.width, height: view.height });
      });
    return () => {
      active = false;
    };
  }, [pdf, field?.page]);
  return (
    <aside className="inspector" aria-label="Formularfelder">
      <div className="aside-heading">
        <div>
          <span className="eyebrow">BEARBEITEN</span>
          <h2>
            Formularfelder <b>{fields.length}</b>
          </h2>
        </div>
        <ScanLine size={20} />
      </div>
      <div className="aside-note">
        Beschriftungen und Erkennung bitte prüfen. Ein ausgewähltes Feld lässt sich unten
        korrigieren.
      </div>
      <div className="fields-list">
        {!fields.length && (
          <p>Keine Felder erkannt. Über „Text ergänzen“ kannst du eigene Felder platzieren.</p>
        )}
        {fields.map((field, index) => (
          <div
            key={field.id}
            className={`field-card ${selected === field.id ? 'focused' : ''}`}
            onClick={() => onSelect(field.id)}
          >
            <div className="field-title">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <button className="field-label" onClick={() => onSelect(field.id)}>
                {field.label}
              </button>
              {field.source !== 'native' && (
                <button
                  aria-label={`Feld entfernen: ${field.label}`}
                  disabled={disabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(field.id);
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <FieldInput
              field={field}
              disabled={disabled}
              onFocus={() => onSelect(field.id)}
              onValue={(value) => onPatch(field.id, { value })}
            />
            <small>
              Seite {field.page + 1} ·{' '}
              {field.source === 'native'
                ? 'PDF-Formular'
                : field.source === 'detected'
                  ? 'Automatisch erkannt'
                  : 'Ergänzter Text'}
            </small>
          </div>
        ))}
      </div>
      {field && (
        <div className="field-properties">
          <h3>Feld korrigieren</h3>
          <label>
            Beschriftung
            <input
              aria-label="Feldbeschriftung"
              value={field.label}
              disabled={disabled || field.readOnly}
              onChange={(event) => onPatch(field.id, { label: event.target.value })}
            />
          </label>
          {field.source !== 'native' ? (
            <>
              <div className="geometry-grid">
                {(['x', 'y', 'width', 'height'] as const).map((key) => (
                  <label key={key}>
                    {{ x: 'X', y: 'Y', width: 'Breite', height: 'Höhe' }[key]}
                    <input
                      type="number"
                      aria-label={`Feld ${key}`}
                      value={Math.round(field[key] * 10) / 10}
                      min={key === 'x' || key === 'y' ? 0 : 12}
                      step={1}
                      disabled={disabled}
                      onChange={(event) => {
                        if (!event.target.value) return;
                        const value = event.target.valueAsNumber;
                        if (Number.isFinite(value))
                          onPatch(field.id, boundRect({ ...field, [key]: value }, size));
                      }}
                    />
                  </label>
                ))}
              </div>
              <p>Werte in PDF-Punkten. Verschieben und Vergrößern geht auch direkt am Feld.</p>
            </>
          ) : (
            <p>Die Position vorhandener PDF-Formularfelder bleibt erhalten.</p>
          )}
        </div>
      )}
      <div className="aside-footer">
        <ShieldCheck size={15} />
        <span>Deine Dokumente bleiben auf deinem Gerät.</span>
      </div>
    </aside>
  );
}
