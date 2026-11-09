import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, LoaderCircle, Search, X } from 'lucide-react';
export function SearchBar({
  query,
  onQuery,
  count,
  active,
  searching,
  error,
  onNext,
  onClose,
}: {
  query: string;
  onQuery(query: string): void;
  count: number;
  active: number;
  searching: boolean;
  error: string;
  onNext(direction: number): void;
  onClose(): void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div className="search-bar" role="search">
      <Search size={16} />
      <input
        ref={ref}
        aria-label="Suchtext"
        value={query}
        placeholder="Dokument durchsuchen …"
        onChange={(event) => onQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onNext(event.shiftKey ? -1 : 1);
          }
          if (event.key === 'Escape') onClose();
        }}
      />
      <span className="search-count" aria-live="polite">
        {searching ? (
          <LoaderCircle className="spin" size={15} />
        ) : error ? (
          'Suche fehlgeschlagen'
        ) : query.trim() ? (
          count ? (
            `${active + 1} / ${count}${count === 10000 ? '+' : ''}`
          ) : (
            'Keine Treffer'
          )
        ) : (
          ''
        )}
      </span>
      <button onClick={() => onNext(-1)} disabled={!count} aria-label="Vorheriger Treffer">
        <ArrowUp size={16} />
      </button>
      <button onClick={() => onNext(1)} disabled={!count} aria-label="Nächster Treffer">
        <ArrowDown size={16} />
      </button>
      <button onClick={onClose} aria-label="Suche schließen">
        <X size={16} />
      </button>
    </div>
  );
}
