import { useEffect, useState } from 'react';
import type { Pdf } from '../pdf/engine';
import { searchPdf, type SearchMatch } from '../pdf/search';
import { errorMessage } from '../state/useDocumentSession';
export function useSearch(pdf: Pdf | null) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState('');
  const [matches, setMatches] = useState<SearchMatch[]>([]),
    [active, setActive] = useState(0);
  const [searching, setSearching] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    setQuery('');
    setMatches([]);
    setActive(0);
    setError('');
  }, [pdf]);
  useEffect(() => {
    const abort = new AbortController();
    setMatches([]);
    setActive(0);
    setError('');
    if (!pdf || !query.trim()) {
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      searchPdf(pdf, query, abort.signal)
        .then((results) => {
          if (!abort.signal.aborted) setMatches(results);
        })
        .catch((error) => {
          if (!abort.signal.aborted) setError(errorMessage(error));
        })
        .finally(() => {
          if (!abort.signal.aborted) setSearching(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [pdf, query]);
  function close() {
    setOpen(false);
    setQuery('');
  }
  function next(direction: number) {
    if (matches.length) setActive((index) => (index + direction + matches.length) % matches.length);
  }
  return { open, setOpen, query, setQuery, matches, active, searching, error, close, next };
}
