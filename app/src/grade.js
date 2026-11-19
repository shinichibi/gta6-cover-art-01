// grade.js — the Vice City colour grade.
//
// Every cover panel passes through this pixel pipeline before it is
// composited: a contrast and saturation shaping, then a split tone that
// pushes the shadows toward teal-blue and the highlights toward warm neon,
// blended with the untouched photo by the intensity the visitor chose.
// Three house presets tune the recipe; nothing here talks to a network.

export const PRESETS = {
  sunset: {
    label: 'Sunset Vice',
    saturation: 1.38,
    contrast: 1.13,
    brightness: 1.02,
    shadowTint: [16, 42, 74],
    highlightTint: [255, 158, 84],
    toneAmount: 0.55,
  },
  midnight: {
    label: 'Midnight Neon',
    saturation: 1.26,
    contrast: 1.19,
    brightness: 0.99,
    shadowTint: [8, 10, 46],
    highlightTint: [255, 92, 196],
    toneAmount: 0.62,
  },
  chrome: {
    label: 'Chrome Day',
    saturation: 0.94,
    contrast: 1.24,
    brightness: 1.05,
    shadowTint: [22, 34, 52],
    highlightTint: [196, 228, 255],
    toneAmount: 0.34,
  },
};

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

/**
 * Grade an ImageData in place.
 * @param {ImageData} imageData pixels to transform
 * @param {string} presetName one of the PRESETS keys
 * @param {number} intensity 0 (photo untouched) .. 1 (full grade)
 */
export function gradePixels(imageData, presetName, intensity) {
  const p = PRESETS[presetName] || PRESETS.sunset;
  const t = Math.max(0, Math.min(1, intensity));
  if (t === 0) return imageData;
  const data = imageData.data;
  const sat = 1 + (p.saturation - 1) * t;
  const con = 1 + (p.contrast - 1) * t;
  const bri = 1 + (p.brightness - 1) * t;
  const tone = p.toneAmount * t;
  const [sr, sg, sb] = p.shadowTint;
  const [hr, hg, hb] = p.highlightTint;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Brightness, then contrast around mid grey.
    r *= bri;
    g *= bri;
    b *= bri;
    r = (r - 128) * con + 128;
    g = (g - 128) * con + 128;
    b = (b - 128) * con + 128;

    // Saturation around the pixel's own luma.
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = luma + (r - luma) * sat;
    g = luma + (g - luma) * sat;
    b = luma + (b - luma) * sat;

    // Split tone: shadows lean to the tint's dark colour, highlights to
    // its bright colour, both weighted by how far the pixel sits from mid.
    const m = Math.max(0, Math.min(1, luma / 255));
    const shadowW = (1 - m) * (1 - m) * tone;
    const highW = m * m * tone;
    r += (sr - r) * shadowW * 0.55 + (hr - r) * highW * 0.38;
    g += (sg - g) * shadowW * 0.55 + (hg - g) * highW * 0.38;
    b += (sb - b) * shadowW * 0.55 + (hb - b) * highW * 0.38;

    data[i] = clamp255(r);
    data[i + 1] = clamp255(g);
    data[i + 2] = clamp255(b);
  }
  return imageData;
}

/** The two-stop gradient a preset paints behind the cover's lettering. */
export function presetGradient(presetName) {
  switch (presetName) {
    case 'midnight':
      return ['#7df9ff', '#ff5cc4', '#7a2bff'];
    case 'chrome':
      return ['#ffffff', '#bcd8ff', '#5f7fa6'];
    default:
      return ['#fff3b0', '#ff9e54', '#ff2e88'];
  }
}
