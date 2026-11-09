import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectGrayRegions, labelFor, overlaps } from '../src/pdf/detection';
test('separates side-by-side pale blue gray fields and ignores white paper', () => {
  const width = 600,
    height = 400,
    data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (const box of [
    { x: 90, y: 220, width: 410, height: 26 },
    { x: 90, y: 280, width: 197, height: 26 },
    { x: 300, y: 280, width: 200, height: 26 },
  ])
    for (let y = box.y; y < box.y + box.height; y++)
      for (let x = box.x; x < box.x + box.width; x++)
        data.set([235, 238, 240, 255], (y * width + x) * 4);
  assert.deepEqual(detectGrayRegions(data, width, height), [
    { x: 90, y: 220, width: 410, height: 26 },
    { x: 90, y: 280, width: 197, height: 26 },
    { x: 300, y: 280, width: 200, height: 26 },
  ]);
});
test('uses captions underneath each field without stealing a neighboring caption', () => {
  const left = { x: 90, y: 280, width: 197, height: 26 },
    right = { x: 300, y: 280, width: 200, height: 26 };
  const texts = [
    { x: 90, y: 311, width: 190, height: 8, text: 'Telefon' },
    { x: 300, y: 311, width: 55, height: 8, text: 'E-Mail' },
  ];
  assert.equal(labelFor(left, texts), 'Telefon');
  assert.equal(labelFor(right, texts), 'E-Mail');
  assert.equal(overlaps(left, right), false);
});
