import { useEffect, useRef, useState } from 'react';
import type { Field } from '../domain';
import type { Pdf } from '../pdf/engine';
import type { SearchMatch } from '../pdf/search';
import { PageView } from './PageView';
export type ZoomMode = 'page' | 'width' | 'custom';
interface Props {
  pdf: Pdf;
  firstSize: { width: number; height: number };
  mode: ZoomMode;
  customZoom: number;
  request: { index: number; token: number };
  currentPage: number;
  editing: boolean;
  fields: Field[];
  selected: string;
  manual: boolean;
  busy: boolean;
  matches: SearchMatch[];
  activeMatch: number;
  onCurrent(page: number): void;
  onZoom(zoom: number): void;
  onSelect(id: string): void;
  onPatch(id: string, patch: Partial<Field>): void;
  onAdd(field: Field): void;
  onError(error: string): void;
}
export function DocumentViewer(props: Props) {
  const viewport = useRef<HTMLDivElement>(null),
    frame = useRef(0);
  const [available, setAvailable] = useState({ width: 1000, height: 700 });
  const { pdf, firstSize, mode, customZoom, request, onCurrent, onZoom } = props;
  const zoom =
    mode === 'custom'
      ? customZoom
      : Math.max(
          0.15,
          Math.min(
            3,
            (available.width - 88) / firstSize.width,
            ...(mode === 'page' ? [(available.height - 60) / firstSize.height] : []),
          ),
        );
  useEffect(() => {
    const observer = new ResizeObserver((entries) =>
      setAvailable({ width: entries[0].contentRect.width, height: entries[0].contentRect.height }),
    );
    if (viewport.current) observer.observe(viewport.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, []);
  useEffect(() => {
    onZoom(zoom);
  }, [zoom, onZoom]);
  useEffect(() => {
    const element = viewport.current?.querySelector(`[data-page="${request.index}"]`);
    element?.scrollIntoView({ block: 'start', inline: 'nearest' });
    onCurrent(request.index);
  }, [request, onCurrent]);
  const previousZoom = useRef(zoom);
  useEffect(() => {
    if (previousZoom.current !== zoom) {
      const element = viewport.current?.querySelector(`[data-page="${props.currentPage}"]`);
      element?.scrollIntoView({ block: 'start', inline: 'nearest' });
      previousZoom.current = zoom;
    }
  }, [zoom, props.currentPage]);
  return (
    <section
      className="workspace"
      ref={viewport}
      aria-label="PDF-Dokument"
      tabIndex={0}
      onScroll={() => {
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
          const view = viewport.current;
          if (!view) return;
          const visible = view.getBoundingClientRect();
          let best = 0,
            area = -1;
          view.querySelectorAll<HTMLElement>('[data-page]').forEach((element) => {
            const bounds = element.getBoundingClientRect();
            const intersection = Math.max(
              0,
              Math.min(bounds.bottom, visible.bottom) - Math.max(bounds.top, visible.top),
            );
            if (intersection > area) {
              area = intersection;
              best = Number(element.dataset.page);
            }
          });
          onCurrent(best);
        });
      }}
    >
      {Array.from({ length: pdf.numPages }, (_, index) => (
        <PageView
          key={index}
          {...props}
          index={index}
          fallbackSize={firstSize}
          zoom={zoom}
          fields={props.fields.filter((field) => field.page === index)}
        />
      ))}
    </section>
  );
}
