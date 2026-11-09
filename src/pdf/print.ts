import type { Pdf } from './engine';
export async function printDocument(pdf: Pdf, progress: (page: number) => void): Promise<boolean> {
  const root = document.createElement('div');
  root.className = 'print-document';
  root.setAttribute('aria-hidden', 'true');
  const styles = document.createElement('style');
  root.append(styles);
  document.body.append(root);
  try {
    for (let index = 0; index < pdf.numPages; index++) {
      progress(index + 1);
      const page = await pdf.getPage(index + 1),
        dimensions = page.getViewport({ scale: 1 });
      const scale = Math.min(
        150 / 72,
        Math.sqrt(12000000 / (dimensions.width * dimensions.height)),
      );
      const viewport = page.getViewport({ scale });
      const sheet = document.createElement('section'),
        canvas = document.createElement('canvas');
      sheet.className = 'print-sheet';
      sheet.style.page = `ezpdf${index}`;
      sheet.style.width = `${dimensions.width}pt`;
      sheet.style.height = `${dimensions.height}pt`;
      styles.textContent += `${index === 0 ? `@page { size: ${dimensions.width}pt ${dimensions.height}pt; margin: 0; }` : ''}@page ezpdf${index} { size: ${dimensions.width}pt ${dimensions.height}pt; margin: 0; }\n`;
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      sheet.append(canvas);
      root.append(sheet);
      await page.render({
        canvas,
        canvasContext: canvas.getContext('2d')!,
        viewport,
        intent: 'print',
      }).promise;
    }
    if (window.desktop) return await window.desktop.print();
    window.print();
    return true;
  } finally {
    root.remove();
  }
}
