import { useState } from 'react';
import { GripVertical } from 'lucide-react';
import type { Field, Rect } from '../domain';
import { boundRect } from '../state/fields';
import { FieldInput } from './FieldInput';
export function FieldOverlay({
  field,
  zoom,
  selected,
  size,
  disabled,
  onSelect,
  onPatch,
}: {
  field: Field;
  zoom: number;
  selected: boolean;
  size: { width: number; height: number };
  disabled: boolean;
  onSelect(): void;
  onPatch(patch: Partial<Field>): void;
}) {
  const [preview, setPreview] = useState<Rect | null>(null);
  const rect = preview || field;
  const movable = field.source !== 'native' && !disabled;
  function drag(event: React.PointerEvent<HTMLButtonElement>, resize: boolean) {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    const button = event.currentTarget,
      x = event.clientX,
      y = event.clientY;
    let next: Rect = field;
    button.setPointerCapture(event.pointerId);
    const move = (event: PointerEvent) => {
      const dx = (event.clientX - x) / zoom,
        dy = (event.clientY - y) / zoom;
      next = boundRect(
        resize
          ? {
              ...field,
              width: Math.max(12, Math.min(size.width - field.x, field.width + dx)),
              height: Math.max(12, Math.min(size.height - field.y, field.height + dy)),
            }
          : { ...field, x: field.x + dx, y: field.y + dy },
        size,
      );
      setPreview(next);
    };
    const end = (event: PointerEvent) => {
      button.removeEventListener('pointermove', move);
      button.removeEventListener('pointerup', end);
      button.removeEventListener('pointercancel', cancel);
      setPreview(null);
      if (event.type === 'pointerup')
        onPatch({ x: next.x, y: next.y, width: next.width, height: next.height });
    };
    const cancel = (event: PointerEvent) => end(event);
    button.addEventListener('pointermove', move);
    button.addEventListener('pointerup', end);
    button.addEventListener('pointercancel', cancel);
  }
  return (
    <div
      className={`field-overlay ${selected ? 'selected' : ''} ${field.source === 'native' ? 'native' : ''}`}
      style={{
        left: rect.x * zoom,
        top: rect.y * zoom,
        width: rect.width * zoom,
        height: rect.height * zoom,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <FieldInput
        field={field}
        overlay
        zoom={zoom}
        disabled={disabled}
        onFocus={onSelect}
        onValue={(value) => onPatch({ value })}
      />
      {selected && movable && (
        <>
          <button
            className="move-handle"
            aria-label="Feld verschieben"
            title="Ziehen oder mit Pfeiltasten verschieben"
            onPointerDown={(event) => drag(event, false)}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
              event.preventDefault();
              const step = event.shiftKey ? 10 : 1;
              onPatch(
                boundRect(
                  {
                    ...field,
                    x:
                      field.x +
                      (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0),
                    y:
                      field.y +
                      (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0),
                  },
                  size,
                ),
              );
            }}
          >
            <GripVertical size={12} />
          </button>
          <button
            className="resize-handle"
            aria-label="Feldgröße ändern"
            title="Ziehen zum Vergrößern"
            onPointerDown={(event) => drag(event, true)}
          />
        </>
      )}
    </div>
  );
}
