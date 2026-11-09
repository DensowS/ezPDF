import { useEffect, useRef, useState } from 'react';
import { TextLayer, AnnotationMode } from 'pdfjs-dist';
import type { Field } from '../domain';
import type { Pdf } from '../pdf/engine';
import type { SearchMatch } from '../pdf/search';
import { FieldOverlay } from './FieldOverlay';
import { boundRect } from '../state/fields';

export function useNearViewport(ref: React.RefObject<HTMLElement | null>, margin = '800px') {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => setNear(entries[0].isIntersecting), {
      rootMargin: margin,
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, margin]);
  return near;
}
type Size = { width: number; height: number };
interface Props {
  pdf: Pdf;
  index: number;
  zoom: number;
  fallbackSize: Size;
  editing: boolean;
  fields: Field[];
  selected: string;
  manual: boolean;
  busy: boolean;
  matches: SearchMatch[];
  activeMatch: number;
  onSelect(id: string): void;
  onPatch(id: string, patch: Partial<Field>): void;
  onAdd(field: Field): void;
  onError(error: string): void;
}
export function PageView({
  pdf,
  index,
  zoom,
  fallbackSize,
  editing,
  fields,
  selected,
  manual,
  busy,
  matches,
  activeMatch,
  onSelect,
  onPatch,
  onAdd,
  onError,
}: Props) {
  const host = useRef<HTMLDivElement>(null),
    paint = useRef<HTMLDivElement>(null),
    text = useRef<HTMLDivElement>(null);
  const near = useNearViewport(host);
  const [size, setSize] = useState(fallbackSize),
    [rendered, setRendered] = useState(0);
  const layer = useRef<TextLayer | null>(null);
  useEffect(() => {
    if (!near) {
      paint.current?.replaceChildren();
      text.current?.replaceChildren();
      layer.current = null;
      return;
    }
    let canceled = false,
      task: ReturnType<Awaited<ReturnType<Pdf['getPage']>>['render']> | undefined,
      textLayer: TextLayer | undefined;
    (async () => {
      const page = await pdf.getPage(index + 1);
      if (canceled) return;
      const base = page.getViewport({ scale: 1, rotation: 0 });
      setSize({ width: base.width, height: base.height });
      const viewport = page.getViewport({ scale: zoom, rotation: 0 });
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        Math.sqrt(16000000 / (viewport.width * viewport.height)),
      );
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width * ratio);
      canvas.height = Math.ceil(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      task = page.render({
        canvas,
        canvasContext: canvas.getContext('2d')!,
        viewport,
        transform: [ratio, 0, 0, ratio, 0, 0],
        annotationMode: editing ? AnnotationMode.DISABLE : AnnotationMode.ENABLE,
      });
      const [, content] = await Promise.all([task.promise, page.getTextContent()]);
      if (canceled) return;
      const container = document.createElement('div');
      container.className = 'textLayer';
      container.style.setProperty('--total-scale-factor', String(zoom));
      textLayer = new TextLayer({ textContentSource: content, container, viewport });
      await textLayer.render();
      if (canceled) return;
      paint.current?.replaceChildren(canvas);
      text.current?.replaceChildren(container);
      layer.current = textLayer;
      setRendered((value) => value + 1);
    })().catch((error) => {
      if (!canceled) onError(String(error));
    });
    return () => {
      canceled = true;
      task?.cancel();
      textLayer?.cancel();
      layer.current = null;
    };
  }, [pdf, index, zoom, near, editing, onError]);
  useEffect(() => {
    const current = layer.current;
    if (!current) return;
    const pieces = new Map<number, { from: number; to: number; match: number }[]>();
    matches.forEach((match, matchIndex) => {
      if (match.page !== index) return;
      for (const segment of match.segments)
        pieces.set(segment.index, [
          ...(pieces.get(segment.index) || []),
          { ...segment, match: matchIndex },
        ]);
    });
    current.textDivs.forEach((div, index) => {
      const value = current.textContentItemsStr[index];
      div.replaceChildren();
      let cursor = 0;
      for (const segment of (pieces.get(index) || []).sort((a, b) => a.from - b.from)) {
        div.append(document.createTextNode(value.slice(cursor, segment.from)));
        const mark = document.createElement('mark');
        mark.className = segment.match === activeMatch ? 'search-match active' : 'search-match';
        mark.dataset.match = String(segment.match);
        mark.textContent = value.slice(segment.from, segment.to);
        div.append(mark);
        cursor = segment.to;
      }
      div.append(document.createTextNode(value.slice(cursor)));
    });
    if (matches[activeMatch]?.page === index)
      text.current
        ?.querySelector(`[data-match="${activeMatch}"]`)
        ?.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, [matches, activeMatch, rendered, index]);
  return (
    <div className="page-shell" data-page={index} ref={host} style={{ width: size.width * zoom }}>
      <div className="paper-meta">
        <span>SEITE {index + 1}</span>
        <span>{editing && manual ? 'Klicken, um ein Textfeld zu ergänzen' : ''}</span>
      </div>
      <div
        className={`paper ${manual ? 'placing' : ''}`}
        style={{ width: size.width * zoom, height: size.height * zoom }}
        onClick={(event) => {
          if (!editing || !manual || busy) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          onAdd({
            ...boundRect(
              {
                x: (event.clientX - bounds.left) / zoom,
                y: (event.clientY - bounds.top) / zoom,
                width: 160,
                height: 24,
              },
              size,
            ),
            id: crypto.randomUUID(),
            page: index,
            kind: 'text',
            source: 'manual',
            label: 'Ergänzter Text',
            value: '',
          });
        }}
      >
        <div ref={paint} className="page-paint" />
        <div ref={text} className={`page-text ${editing && manual ? 'placing' : ''}`} />
        {editing &&
          fields.map((field) => (
            <FieldOverlay
              key={field.id}
              field={field}
              zoom={zoom}
              size={size}
              disabled={busy}
              selected={selected === field.id}
              onSelect={() => onSelect(field.id)}
              onPatch={(patch) => onPatch(field.id, patch)}
            />
          ))}
      </div>
    </div>
  );
}
