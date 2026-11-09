import * as pdfjs from 'pdfjs-dist';
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFOptionList,
  PDFName,
  PDFHexString,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import type { Field } from '../domain';
import { detectGrayRegions, labelFor, overlaps, type TextBox } from './detection';
pdfjs.GlobalWorkerOptions.workerSrc = worker;
export const openPdf = (bytes: Uint8Array) =>
  pdfjs.getDocument({ data: bytes.slice(), enableXfa: false }).promise;
export type Pdf = Awaited<ReturnType<typeof openPdf>>;
export async function discoverFields(pdf: Pdf): Promise<Field[]> {
  const result: Field[] = [];
  for (let pageIndex = 0; pageIndex < pdf.numPages; pageIndex++) {
    const page = await pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 1, rotation: 0 });
    const texts: TextBox[] = (await page.getTextContent()).items.flatMap((item) => {
      if (!('str' in item) || !item.str.trim()) return [];
      const t = pdfjs.Util.transform(viewport.transform, item.transform);
      return [
        { text: item.str, x: t[4], y: t[5] - item.height, width: item.width, height: item.height },
      ];
    });
    const annotations = await page.getAnnotations();
    for (const annotation of annotations) {
      if (
        annotation.subtype !== 'Widget' ||
        !['Tx', 'Btn', 'Ch'].includes(annotation.fieldType) ||
        annotation.pushButton ||
        annotation.radioButton
      )
        continue;
      const [a, b, c, d, e, f] = viewport.transform;
      const [rx1, ry1, rx2, ry2] = annotation.rect;
      const [x1, y1, x2, y2] = [
        a * rx1 + c * ry1 + e,
        b * rx1 + d * ry1 + f,
        a * rx2 + c * ry2 + e,
        b * rx2 + d * ry2 + f,
      ];
      const rect = {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
      };
      result.push({
        ...rect,
        id: `native-${pageIndex}-${annotation.id}`,
        page: pageIndex,
        source: 'native',
        nativeName: annotation.fieldName,
        label: annotation.alternativeText || labelFor(rect, texts) || annotation.fieldName,
        kind: annotation.checkBox ? 'checkbox' : annotation.fieldType === 'Ch' ? 'choice' : 'text',
        value: annotation.checkBox
          ? annotation.fieldValue && annotation.fieldValue !== 'Off'
            ? 'true'
            : ''
          : String(
              Array.isArray(annotation.fieldValue)
                ? annotation.fieldValue[0] || ''
                : annotation.fieldValue || '',
            ),
        options: annotation.options?.map((o: { exportValue: string }) => o.exportValue),
        readOnly: annotation.readOnly,
      });
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    await page.render({
      canvasContext: context,
      canvas,
      viewport,
      annotationMode: pdfjs.AnnotationMode.DISABLE,
    }).promise;
    const regions = detectGrayRegions(
      context.getImageData(0, 0, canvas.width, canvas.height).data,
      canvas.width,
      canvas.height,
    );
    for (const [index, rect] of regions.entries()) {
      if (result.some((f) => f.page === pageIndex && overlaps(f, rect))) continue;
      result.push({
        ...rect,
        id: `gray-${pageIndex}-${index}`,
        page: pageIndex,
        label: labelFor(rect, texts),
        value: '',
        source: 'detected',
        kind: 'text',
      });
    }
    canvas.width = canvas.height = 0;
  }
  return result;
}
export async function savePdf(bytes: Uint8Array, fields: Field[]): Promise<Uint8Array> {
  const document = await PDFDocument.load(bytes);
  const form = document.getForm();
  if (form.hasXFA())
    throw new Error('XFA-Formulare werden in dieser Version noch nicht unterstützt.');
  const font = await document.embedFont(StandardFonts.Helvetica);
  const updated = new Set<string>();
  for (const field of fields) {
    if (field.readOnly) continue;
    if (field.source === 'native') {
      if (updated.has(field.nativeName!)) continue;
      const native = form.getField(field.nativeName!);
      if (native instanceof PDFTextField) native.setText(field.value);
      else if (native instanceof PDFCheckBox)
        field.value === 'true' ? native.check() : native.uncheck();
      else if (native instanceof PDFDropdown || native instanceof PDFOptionList)
        field.value ? native.select(field.value) : native.clear();
      native.acroField.dict.set(PDFName.of('TU'), PDFHexString.fromText(field.label));
      updated.add(field.nativeName!);
    } else {
      const page = document.getPage(field.page),
        crop = page.getCropBox();
      let name = `ezPDF.${field.id}`;
      while (form.getFields().some((f) => f.getName() === name)) name += '_';
      const text = form.createTextField(name);
      text.acroField.dict.set(PDFName.of('TU'), PDFHexString.fromText(field.label));
      text.setText(field.value);
      text.addToPage(page, {
        x: crop.x + field.x,
        y: crop.y + crop.height - field.y - field.height,
        width: field.width,
        height: field.height,
        borderWidth: 0,
        backgroundColor: undefined,
        textColor: rgb(0.1, 0.12, 0.15),
        font,
      });
      text.setFontSize(Math.min(11, field.height * 0.48));
    }
  }
  form.updateFieldAppearances(font);
  return document.save();
}
