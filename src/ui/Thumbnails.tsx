import { useEffect, useRef, useState } from 'react';
import type { Pdf } from '../pdf/engine';
import { useNearViewport } from './PageView';
function Thumbnail({
  pdf,
  index,
  current,
  onClick,
}: {
  pdf: Pdf;
  index: number;
  current: boolean;
  onClick(): void;
}) {
  const ref = useRef<HTMLButtonElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const near = useNearViewport(ref, '150px');
  const [ratio, setRatio] = useState(842 / 595);
  useEffect(() => {
    if (!near) return;
    let canceled = false,
      task: ReturnType<Awaited<ReturnType<Pdf['getPage']>>['render']> | undefined;
    (async () => {
      const page = await pdf.getPage(index + 1);
      if (canceled || !canvas.current) return;
      const base = page.getViewport({ scale: 1, rotation: 0 });
      setRatio(base.height / base.width);
      const viewport = page.getViewport({ scale: 132 / base.width, rotation: 0 });
      const target = canvas.current;
      target.width = Math.ceil(viewport.width);
      target.height = Math.ceil(viewport.height);
      task = page.render({ canvas: target, canvasContext: target.getContext('2d')!, viewport });
      await task.promise;
    })().catch(() => {});
    return () => {
      canceled = true;
      task?.cancel();
    };
  }, [pdf, index, near]);
  return (
    <button
      ref={ref}
      className={`thumbnail ${current ? 'current' : ''}`}
      onClick={onClick}
      aria-label={`Zu Seite ${index + 1}`}
      aria-current={current ? 'page' : undefined}
    >
      <div style={{ width: 132, height: 132 * ratio }}>
        <canvas ref={canvas} />
      </div>
      <span>{index + 1}</span>
    </button>
  );
}
export function Thumbnails({
  pdf,
  current,
  onPage,
}: {
  pdf: Pdf;
  current: number;
  onPage(page: number): void;
}) {
  return (
    <aside className="thumbnails" aria-label="Seitenübersicht">
      <h2>
        Seiten <span>{pdf.numPages}</span>
      </h2>
      <div className="thumbnail-list">
        {Array.from({ length: pdf.numPages }, (_, index) => (
          <Thumbnail
            key={index}
            pdf={pdf}
            index={index}
            current={current === index}
            onClick={() => onPage(index)}
          />
        ))}
      </div>
    </aside>
  );
}
