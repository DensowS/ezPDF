import type { Field } from '../domain';
export function FieldInput({
  field,
  disabled,
  onValue,
  onFocus,
  overlay = false,
  zoom = 1,
}: {
  field: Field;
  disabled?: boolean;
  onValue(value: string): void;
  onFocus?(): void;
  overlay?: boolean;
  zoom?: number;
}) {
  const common = { 'aria-label': field.label, disabled: field.readOnly || disabled, onFocus };
  if (field.kind === 'checkbox')
    return (
      <input
        {...common}
        type="checkbox"
        checked={field.value === 'true'}
        onChange={(event) => onValue(event.target.checked ? 'true' : '')}
      />
    );
  if (field.kind === 'choice')
    return (
      <select {...common} value={field.value} onChange={(event) => onValue(event.target.value)}>
        <option value="">Auswählen</option>
        {field.options?.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    );
  return (
    <input
      {...common}
      value={field.value}
      placeholder={overlay ? '' : 'Hier eingeben …'}
      onChange={(event) => onValue(event.target.value)}
      style={overlay ? { fontSize: Math.min(11, field.height * 0.48) * zoom } : undefined}
    />
  );
}
