import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Columns2,
  FilePenLine,
  FolderOpen,
  LayoutList,
  Minus,
  Plus,
  Printer,
  Redo2,
  Save,
  Search,
  StretchHorizontal,
  Type,
  Undo2,
} from 'lucide-react';
import type { ZoomMode } from './DocumentViewer';
interface Props {
  hasFile: boolean;
  busy: boolean;
  editing: boolean;
  page: number;
  total: number;
  zoom: number;
  mode: ZoomMode;
  manual: boolean;
  thumbnails: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onOpen(): void;
  onSave(): void;
  onEdit(): void;
  onLeave(): void;
  onPrint(): void;
  onSearch(): void;
  onThumbnails(): void;
  onManual(): void;
  onUndo(): void;
  onRedo(): void;
  onPage(page: number): void;
  onZoom(zoom: number): void;
  onMode(mode: ZoomMode): void;
}
export function Toolbar(p: Props) {
  const disabled = !p.hasFile || p.busy;
  return (
    <>
      <nav className="viewer-toolbar" aria-label="Dokumentwerkzeuge">
        <div className="toolgroup">
          <button onClick={p.onOpen} disabled={p.busy} title="PDF öffnen (Strg+O)">
            <FolderOpen size={17} />
            Öffnen
          </button>
          <span className="divider" />
          <button
            onClick={p.onThumbnails}
            disabled={disabled}
            className={p.thumbnails ? 'active' : ''}
            aria-label="Seitenübersicht umschalten"
            aria-pressed={p.thumbnails}
            title="Seitenübersicht"
          >
            <LayoutList size={18} />
          </button>
          <button
            onClick={p.onSearch}
            disabled={disabled}
            aria-label="Dokument durchsuchen"
            title="Suchen (Strg+F)"
          >
            <Search size={18} />
          </button>
          <button
            onClick={p.onPrint}
            disabled={disabled}
            aria-label="Drucken"
            title="Drucken (Strg+P)"
          >
            <Printer size={18} />
          </button>
        </div>
        <div className="navigation">
          <button
            onClick={() => p.onPage(p.page - 1)}
            disabled={disabled || p.page === 0}
            aria-label="Vorherige Seite"
          >
            <ChevronLeft size={17} />
          </button>
          <label className="page-number">
            <input
              type="number"
              key={`${p.page}-${p.total}`}
              aria-label="Seite"
              defaultValue={p.hasFile ? p.page + 1 : 0}
              min={1}
              max={p.total}
              disabled={disabled}
              onBlur={(event) => {
                const value = Math.max(
                  1,
                  Math.min(p.total, event.currentTarget.valueAsNumber || 1),
                );
                event.currentTarget.value = String(value);
                p.onPage(value - 1);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
            />
            <span>/ {p.total || '–'}</span>
          </label>
          <button
            onClick={() => p.onPage(p.page + 1)}
            disabled={disabled || p.page + 1 >= p.total}
            aria-label="Nächste Seite"
          >
            <ChevronRight size={17} />
          </button>
          <span className="divider" />
          <button
            onClick={() => p.onZoom(p.zoom - 0.1)}
            disabled={disabled || p.zoom <= 0.15}
            aria-label="Verkleinern"
          >
            <Minus size={16} />
          </button>
          <select
            aria-label="Zoom"
            disabled={disabled}
            value={p.mode === 'custom' ? 'custom' : p.mode}
            onChange={(event) => {
              if (event.target.value === 'page' || event.target.value === 'width')
                p.onMode(event.target.value);
              else if (event.target.value !== 'custom') p.onZoom(Number(event.target.value));
            }}
          >
            <option value="page">Ganze Seite</option>
            <option value="width">Seitenbreite</option>
            <option value="custom" hidden>
              {Math.round(p.zoom * 100)} %
            </option>
            {[0.5, 0.75, 1, 1.25, 1.5, 2, 3].map((value) => (
              <option key={value} value={value}>
                {value * 100} %
              </option>
            ))}
          </select>
          <button
            onClick={() => p.onZoom(p.zoom + 0.1)}
            disabled={disabled || p.zoom >= 3}
            aria-label="Vergrößern"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => p.onMode('width')}
            disabled={disabled}
            aria-label="An Seitenbreite anpassen"
            title="Seitenbreite"
          >
            <StretchHorizontal size={17} />
          </button>
          <button
            onClick={() => p.onMode('page')}
            disabled={disabled}
            aria-label="Ganze Seite einpassen"
            title="Ganze Seite"
          >
            <Columns2 size={17} />
          </button>
        </div>
        <div className="mode-actions">
          {p.editing ? (
            <button onClick={p.onLeave} disabled={p.busy}>
              <BookOpen size={17} />
              Lesemodus
            </button>
          ) : (
            <button onClick={p.onEdit} disabled={disabled} className="primary">
              <FilePenLine size={17} />
              Bearbeiten
            </button>
          )}
        </div>
      </nav>
      {p.editing && (
        <div className="edit-toolbar" aria-label="Bearbeitungswerkzeuge">
          <span className="mode-badge">
            <FilePenLine size={14} />
            BEARBEITEN
          </span>
          <button onClick={p.onSave} disabled={p.busy} className="primary">
            <Save size={16} />
            Speichern unter
          </button>
          <span className="divider" />
          <button
            onClick={p.onUndo}
            disabled={!p.canUndo || p.busy}
            aria-label="Rückgängig"
            title="Rückgängig (Strg+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={p.onRedo}
            disabled={!p.canRedo || p.busy}
            aria-label="Wiederholen"
            title="Wiederholen (Strg+Y)"
          >
            <Redo2 size={16} />
          </button>
          <span className="divider" />
          <button
            onClick={p.onManual}
            disabled={p.busy}
            className={p.manual ? 'active' : ''}
            aria-pressed={p.manual}
          >
            <Type size={17} />
            Text ergänzen
          </button>
          <span className="toolbar-hint">Felder auswählen, ausfüllen oder korrigieren</span>
        </div>
      )}
    </>
  );
}
