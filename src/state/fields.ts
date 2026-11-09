import type { Field, Rect } from '../domain';
export interface FieldHistory {
  current: Field[];
  baseline: Field[];
  past: Field[][];
  future: Field[][];
}
export const emptyHistory: FieldHistory = { current: [], baseline: [], past: [], future: [] };
export type FieldAction =
  | { type: 'reset'; fields: Field[] }
  | { type: 'replace'; fields: Field[] }
  | { type: 'patch'; id: string; patch: Partial<Field> }
  | { type: 'remove'; id: string }
  | { type: 'add'; field: Field }
  | { type: 'undo' | 'redo' | 'discard' };
export function fieldReducer(state: FieldHistory, action: FieldAction): FieldHistory {
  if (action.type === 'reset')
    return { ...emptyHistory, current: action.fields, baseline: action.fields };
  if (action.type === 'discard')
    return { ...emptyHistory, current: state.baseline, baseline: state.baseline };
  if (action.type === 'undo') {
    const previous = state.past.at(-1);
    return previous
      ? {
          ...state,
          current: previous,
          past: state.past.slice(0, -1),
          future: [state.current, ...state.future],
        }
      : state;
  }
  if (action.type === 'redo') {
    const next = state.future[0];
    return next
      ? {
          ...state,
          current: next,
          past: [...state.past, state.current],
          future: state.future.slice(1),
        }
      : state;
  }
  let current = state.current;
  if (action.type === 'replace') current = action.fields;
  if (action.type === 'add') current = [...current, action.field];
  if (action.type === 'remove')
    current = current.filter((f) => f.id !== action.id || f.source === 'native');
  if (action.type === 'patch') {
    const target = current.find((f) => f.id === action.id);
    if (!target || target.readOnly) return state;
    current = current.map((f) => {
      if (f.id === action.id) return { ...f, ...action.patch };
      if (target.nativeName && target.nativeName === f.nativeName) {
        return {
          ...f,
          ...('value' in action.patch ? { value: action.patch.value! } : {}),
          ...('label' in action.patch ? { label: action.patch.label! } : {}),
        };
      }
      return f;
    });
  }
  if (JSON.stringify(current) === JSON.stringify(state.current)) return state;
  return { ...state, current, past: [...state.past.slice(-99), state.current], future: [] };
}
export const isDirty = (state: FieldHistory) =>
  JSON.stringify(state.current) !== JSON.stringify(state.baseline);
export function boundRect(rect: Rect, page: { width: number; height: number }): Rect {
  const width = Math.max(12, Math.min(rect.width, page.width));
  const height = Math.max(12, Math.min(rect.height, page.height));
  return {
    width,
    height,
    x: Math.max(0, Math.min(rect.x, page.width - width)),
    y: Math.max(0, Math.min(rect.y, page.height - height)),
  };
}
