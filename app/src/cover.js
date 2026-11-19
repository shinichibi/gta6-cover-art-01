// cover.js — draws a VICE FRAME cover onto a canvas.
//
// A cover is a collage of photo panels in the loading-screen tradition:
// one hero panel, a few supporting panels, crisp white seams, then the
// lettering — a stacked gradient title, an original "VI" badge, a caption
// line and a studio credit strip. Every panel's photo is graded by the
// pipeline in grade.js before it lands. All lettering is drawn here from
// system font stacks; no artwork or typeface comes from any game.

import { gradePixels, presetGradient } from './grade.js';

/** Collage arrangements, as fractions of the cover's width and height. */
export const LAYOUTS = {
  classic: {
    label: 'Classic Collage',
    panels: [
      { x: 0, y: 0, w: 0.62, h: 0.66 },
      { x: 0.62, y: 0, w: 0.38, h: 0.33 },
      { x: 0.62, y: 0.33, w: 0.38, h: 0.33 },
      { x: 0, y: 0.66, w: 1, h: 0.34 },
    ],
  },
  mosaic: {
    label: 'Mosaic Grid',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.42 },
      { x: 0.5, y: 0, w: 0.5, h: 0.42 },
      { x: 0, y: 0.42, w: 0.34, h: 0.3 },
      { x: 0.34, y: 0.42, w: 0.33, h: 0.3 },
      { x: 0.67, y: 0.42, w: 0.33, h: 0.3 },
      { x: 0, y: 0.72, w: 1, h: 0.28 },
    ],
  },
  hero: {
    label: 'Full-Bleed Hero',
    panels: [
      { x: 0, y: 0, w: 1, h: 1 },
      { x: 0.045, y: 0.585, w: 0.335, h: 0.3 },
      { x: 0.62, y: 0.585, w: 0.335, h: 0.3 },
    ],
  },
};

const FONT_STACK = '"Arial Narrow Bold", "Arial Narrow", Impact, "Franklin Gothic Medium", "Helvetica Neue", sans-serif';

/** Where a photo lands inside a panel: cover-fit, zoomed, offset by -1..1. */
function framePhoto(img, pw, ph, zoom, ox, oy) {
  const scale = Math.max(pw / img.naturalWidth, ph / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = (pw - dw) / 2 + (ox * (dw - pw)) / 2;
  const dy = (ph - dh) / 2 + (oy * (dh - ph)) / 2;
  return { dx, dy, dw, dh };
}

// Graded panels are cached: dragging a slider re-renders the whole cover,
// and re-grading unchanged panels would waste most of that time.
const panelCache = new Map();
function gradedPanel(slot, img, pw, ph, preset, intensity) {
  const key = [
    slot.photo, pw, ph,
    slot.zoom.toFixed(3), slot.ox.toFixed(3), slot.oy.toFixed(3),
    preset, intensity.toFixed(2),
  ].join('|');
  const hit = panelCache.get(key);
  if (hit) return hit;

  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(pw));
  c.height = Math.max(2, Math.round(ph));
  const g = c.getContext('2d', { willReadFrequently: true });
  const f = framePhoto(img, c.width, c.height, slot.zoom, slot.ox, slot.oy);
  g.drawImage(img, f.dx, f.dy, f.dw, f.dh);
  const pixels = g.getImageData(0, 0, c.width, c.height);
  gradePixels(pixels, preset, intensity);
  g.putImageData(pixels, 0, 0);

  if (panelCache.size > 28) panelCache.clear();
  panelCache.set(key, c);
  return c;
}

/** A panel with no photo yet: a neon gradient placeholder that invites one. */
function placeholderPanel(ctx, x, y, w, h, index, preset) {
  const stops = presetGradient(preset);
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, '#1b1038');
  grad.addColorStop(0.55, '#3d1454');
  grad.addColorStop(1, '#0d2b4d');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = stops[1];
  ctx.beginPath();
  ctx.arc(x + w * (0.3 + 0.14 * index), y + h * 0.34, Math.min(w, h) * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `700 ${Math.max(13, Math.min(w, h) * 0.075)}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ADD A PHOTO', x + w / 2, y + h * 0.58);
  ctx.font = `400 ${Math.max(11, Math.min(w, h) * 0.05)}px ${FONT_STACK}`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('click this panel, then pick a photo', x + w / 2, y + h * 0.58 + Math.min(w, h) * 0.11);
}

/** One line of display lettering: thick dark outline under a gradient fill. */
function displayText(ctx, text, x, y, size, stops, align = 'left') {
  ctx.save();
  ctx.font = `900 ${size}px ${FONT_STACK}`;
  try { ctx.letterSpacing = `${size * 0.015}px`; } catch { /* older engines */ }
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  const grad = ctx.createLinearGradient(0, y - size, 0, y + size * 0.18);
  stops.forEach((s, i) => grad.addColorStop(i / (stops.length - 1), s));
  ctx.strokeStyle = '#160a26';
  ctx.lineWidth = size * 0.16;
  ctx.strokeText(text, x, y);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = size * 0.045;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = grad;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** The original roman-numeral badge that rides at the title's right hand. */
function viBadge(ctx, W, H, preset) {
  const size = W * 0.165;
  const x = W - size - W * 0.038;
  const y = H * 0.032;
  const stops = presetGradient(preset);
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.rotate(0.055);
  ctx.fillStyle = 'rgba(13, 7, 30, 0.94)';
  ctx.strokeStyle = stops[1];
  ctx.lineWidth = size * 0.045;
  const r = size * 0.16;
  ctx.beginPath();
  ctx.roundRect(-size / 2, -size / 2, size, size, r);
  ctx.fill();
  ctx.stroke();
  ctx.font = `900 ${size * 0.54}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const grad = ctx.createLinearGradient(0, -size * 0.3, 0, size * 0.3);
  stops.forEach((s, i) => grad.addColorStop(i / (stops.length - 1), s));
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160a26';
  ctx.lineWidth = size * 0.07;
  ctx.strokeText('VI', 0, size * 0.03);
  ctx.fillStyle = grad;
  ctx.fillText('VI', 0, size * 0.03);
  ctx.restore();
}

let halftonePattern = null;
function drawHalftone(ctx, W, H) {
  if (!halftonePattern) {
    const p = document.createElement('canvas');
    p.width = 7;
    p.height = 7;
    const g = p.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.beginPath();
    g.arc(3.5, 3.5, 1.6, 0, Math.PI * 2);
    g.fill();
    halftonePattern = ctx.createPattern(p, 'repeat');
  }
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = halftonePattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/**
 * Render the whole cover.
 * @param {HTMLCanvasElement} canvas sized by the caller to the export size
 * @param {object} state layout, preset, intensity, halftone, title, caption, panels
 * @param {Array<{img: HTMLImageElement}>} photos loaded photos
 * @param {{highlight?: number}} opts editor-only extras (selected panel outline)
 */
export function renderCover(canvas, state, photos, opts = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const layout = LAYOUTS[state.layout] || LAYOUTS.classic;
  const stops = presetGradient(state.preset);

  ctx.fillStyle = '#0b0618';
  ctx.fillRect(0, 0, W, H);

  // Panels.
  layout.panels.forEach((rect, i) => {
    const x = rect.x * W;
    const y = rect.y * H;
    const w = rect.w * W;
    const h = rect.h * H;
    const slot = state.panels[i];
    const photo = slot ? photos[slot.photo] : undefined;
    if (slot && photo && photo.img && photo.img.complete && photo.img.naturalWidth > 0) {
      const graded = gradedPanel(slot, photo.img, w, h, state.preset, state.intensity);
      ctx.drawImage(graded, x, y, w, h);
    } else {
      placeholderPanel(ctx, x, y, w, h, i, state.preset);
    }
  });

  // A unifying wash and a gentle vignette over the collage.
  const wash = ctx.createLinearGradient(0, 0, 0, H);
  wash.addColorStop(0, 'rgba(255,110,90,0.10)');
  wash.addColorStop(0.45, 'rgba(0,0,0,0)');
  wash.addColorStop(1, 'rgba(16,0,48,0.20)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
  vig.addColorStop(0, 'rgba(8,0,24,0)');
  vig.addColorStop(1, 'rgba(8,0,24,0.30)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  if (state.halftone) drawHalftone(ctx, W, H);

  // White seams between panels, with a hairline of ink outside them.
  const seam = Math.max(3, W * 0.007);
  layout.panels.forEach((rect) => {
    const x = rect.x * W;
    const y = rect.y * H;
    const w = rect.w * W;
    const h = rect.h * H;
    ctx.strokeStyle = '#12081f';
    ctx.lineWidth = seam * 1.7;
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = seam;
    ctx.strokeRect(x, y, w, h);
  });

  // Lettering.
  viBadge(ctx, W, H, state.preset);
  const titleLines = (state.title || 'VICE FRAME').toUpperCase().split('\n').map((s) => s.trim()).filter(Boolean);
  const maxTitleW = W * 0.68;
  let size = W * 0.118;
  ctx.font = `900 ${size}px ${FONT_STACK}`;
  for (const line of titleLines) {
    const wLine = ctx.measureText(line).width;
    if (wLine > maxTitleW) size *= maxTitleW / wLine;
  }
  const lineHeight = size * 1.04;
  ctx.save();
  ctx.translate(W * 0.05, H * 0.028);
  ctx.rotate(-0.021);
  titleLines.forEach((line, i) => {
    displayText(ctx, line, 0, size + i * lineHeight, size, stops);
  });
  ctx.restore();
  const titleBottom = H * 0.028 + size + (titleLines.length - 1) * lineHeight;

  const caption = (state.caption || '').toUpperCase().trim();
  if (caption) {
    ctx.save();
    ctx.font = `700 ${W * 0.027}px ${FONT_STACK}`;
    try { ctx.letterSpacing = `${W * 0.006}px`; } catch { /* older engines */ }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(10,0,24,0.9)';
    ctx.shadowBlur = W * 0.006;
    ctx.shadowOffsetY = W * 0.003;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(caption, W * 0.052, titleBottom + W * 0.052);
    ctx.restore();
  }

  // Credit strip.
  const stripH = Math.max(20, H * 0.034);
  ctx.fillStyle = 'rgba(9, 5, 20, 0.9)';
  ctx.fillRect(0, H - stripH, W, stripH);
  ctx.font = `700 ${stripH * 0.44}px ${FONT_STACK}`;
  try { ctx.letterSpacing = `${stripH * 0.09}px`; } catch { /* older engines */ }
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd9ec';
  ctx.textAlign = 'left';
  ctx.fillText('VICE FRAME COVER STUDIO', W * 0.02, H - stripH / 2 + 1);
  ctx.textAlign = 'right';
  ctx.fillText('NEON COAST • EST. 2026', W * 0.98, H - stripH / 2 + 1);

  // Editor-only: mark the selected panel.
  if (typeof opts.highlight === 'number' && layout.panels[opts.highlight]) {
    const rect = layout.panels[opts.highlight];
    ctx.save();
    ctx.strokeStyle = '#ffe14d';
    ctx.lineWidth = Math.max(3, W * 0.005);
    ctx.setLineDash([W * 0.02, W * 0.012]);
    ctx.strokeRect(rect.x * W + 4, rect.y * H + 4, rect.w * W - 8, rect.h * H - 8);
    ctx.restore();
  }
}

/** The topmost panel index at a point given in 0..1 cover coordinates. */
export function hitPanel(layoutName, nx, ny) {
  const layout = LAYOUTS[layoutName] || LAYOUTS.classic;
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const r = layout.panels[i];
    if (nx >= r.x && nx <= r.x + r.w && ny >= r.y && ny <= r.y + r.h) return i;
  }
  return -1;
}
