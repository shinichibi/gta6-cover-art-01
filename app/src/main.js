// main.js — VICE FRAME's studio wiring.
//
// Everything a visitor touches lives here: photo intake (picker, drag and
// drop, the two bundled samples), panel selection and dragging, the grade
// and layout controls, and the PNG export. The drawing itself is cover.js;
// this file owns the state and the conversation with the page.

import { LAYOUTS, renderCover, hitPanel } from './cover.js';
import { LIBRARY, LIBRARY_BY_ID, SHOWCASES } from './library.js';

const SIZES = {
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 × 1350' },
  square: { w: 1080, h: 1080, label: 'Square 1080 × 1080' },
  wide: { w: 1920, h: 1080, label: 'Wide 1920 × 1080' },
};

const blankSlot = () => ({ photo: -1, ox: 0, oy: 0, zoom: 1.15 });

const state = {
  layout: 'classic',
  preset: 'sunset',
  intensity: 0.85,
  halftone: false,
  title: 'VICE FRAME',
  caption: 'WELCOME BACK TO THE CITY OF NEON',
  size: 'portrait',
  selected: 0,
  panels: Array.from({ length: 6 }, blankSlot),
};

const photos = []; // { img, name }

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const statusEl = $('status');
const chipsEl = $('photo-chips');
const zoomEl = $('zoom');
const zoomVal = $('zoom-val');

/** The title as the cover stacks it: one word per line for short titles. */
function stackedTitle() {
  const raw = (state.title || 'VICE FRAME').trim();
  if (raw.includes('\n')) return raw;
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words.length <= 3) return words.join('\n');
  return raw;
}

function render(highlight = state.selected) {
  const size = SIZES[state.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  renderCover(canvas, { ...state, title: stackedTitle() }, photos, { highlight });
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function panelCount() {
  return LAYOUTS[state.layout].panels.length;
}

function describeSelection() {
  const slot = state.panels[state.selected];
  const name = slot && slot.photo >= 0 && photos[slot.photo] ? photos[slot.photo].name : 'no photo yet';
  setStatus(`Panel ${state.selected + 1} of ${panelCount()} selected — ${name}. Drag on the cover to reposition it, or pick a photo below.`);
}

// ------------------------------------------------------------- photo intake

function addPhoto(img, name) {
  photos.push({ img, name });
  const slot = state.panels[state.selected];
  if (slot) slot.photo = photos.length - 1;
  drawChips();
  describeSelection();
  render();
}

function loadFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => addPhoto(img, file.name.replace(/\.[^.]+$/, ''));
  img.src = url;
}

function loadSample(path, name) {
  const existing = photos.findIndex((p) => p.name === name);
  if (existing >= 0) {
    state.panels[state.selected].photo = existing;
    drawChips();
    describeSelection();
    render();
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      addPhoto(img, name);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = path;
  });
}

/** Load a bundled plate (or any bundled path) into the photo list once. */
function ensurePhoto(src, name) {
  const existing = photos.findIndex((p) => p.name === name);
  if (existing >= 0) return Promise.resolve(existing);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      photos.push({ img, name });
      resolve(photos.length - 1);
    };
    img.onerror = () => resolve(-1);
    img.src = src;
  });
}

// ------------------------------------------------------------- cast library

const libraryEl = $('library-strip');
const libButtons = new Map();

function buildLibrary() {
  if (!libraryEl) return;
  for (const kind of ['Cast', 'Scenes']) {
    const heading = document.createElement('h3');
    heading.textContent = kind;
    const row = document.createElement('div');
    row.className = 'lib-row';
    for (const item of LIBRARY.filter((i) => i.kind === kind)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lib-item';
      btn.title = `Put “${item.name}” in panel ${state.selected + 1}`;
      const thumb = document.createElement('img');
      thumb.src = item.src;
      thumb.alt = '';
      const label = document.createElement('span');
      label.textContent = item.name;
      btn.append(thumb, label);
      btn.addEventListener('click', async () => {
        const idx = await ensurePhoto(item.src, item.name);
        if (idx < 0) return;
        state.panels[state.selected].photo = idx;
        drawChips();
        describeSelection();
        render();
        setStatus(`“${item.name}” is in panel ${state.selected + 1}. Drag it on the cover or zoom it, or cast another plate.`);
      });
      libButtons.set(item.id, btn);
      row.appendChild(btn);
    }
    libraryEl.append(heading, row);
  }
}

/** Mark the library plate that currently sits in the selected panel. */
function refreshLibrary() {
  const slot = state.panels[state.selected];
  const current = slot && slot.photo >= 0 && photos[slot.photo] ? photos[slot.photo].name : null;
  for (const [id, btn] of libButtons) {
    btn.classList.toggle('on', LIBRARY_BY_ID.get(id).name === current);
  }
}

// ------------------------------------------------------------- showcases

async function applyShowcase(key) {
  const sc = SHOWCASES[key];
  if (!sc) return;
  setStatus(`Casting the ${sc.label} cover…`);
  const idxs = [];
  for (const panel of sc.panels) {
    const item = LIBRARY_BY_ID.get(panel.id);
    idxs.push(await ensurePhoto(item.src, item.name));
  }
  if (idxs.some((i) => i < 0)) {
    setStatus('A library plate failed to load — the showcase was not applied.');
    return;
  }
  state.layout = sc.layout;
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('on', b.dataset.layout === sc.layout));
  state.preset = sc.preset;
  document.querySelectorAll('[data-preset]').forEach((b) => b.classList.toggle('on', b.dataset.preset === sc.preset));
  state.intensity = sc.intensity;
  $('intensity').value = String(Math.round(sc.intensity * 100));
  $('intensity-val').textContent = `${Math.round(sc.intensity * 100)}%`;
  state.caption = sc.caption;
  $('caption-input').value = sc.caption;
  if (!state.title.trim()) {
    state.title = 'VICE FRAME';
    $('title-input').value = state.title;
  }
  state.panels.forEach((slot, i) => {
    const panel = sc.panels[i];
    if (panel) Object.assign(slot, { photo: idxs[i], ox: panel.ox, oy: panel.oy, zoom: panel.zoom });
    else Object.assign(slot, blankSlot());
  });
  state.selected = 0;
  syncZoom();
  drawChips();
  render();
  setStatus(`${sc.label} showcase built — the whole cast, graded and lettered. Restyle it with the grade presets, or export your PNG.`);
}

function drawChips() {
  chipsEl.innerHTML = '';
  if (photos.length === 0) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = 'No photos yet. Upload one, drop one onto the cover, or load a sample.';
    chipsEl.appendChild(p);
    return;
  }
  photos.forEach((photo, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    if (state.panels[state.selected] && state.panels[state.selected].photo === i) chip.classList.add('on');
    const thumb = document.createElement('img');
    thumb.src = photo.img.src;
    thumb.alt = '';
    const label = document.createElement('span');
    label.textContent = photo.name;
    chip.append(thumb, label);
    chip.title = `Put “${photo.name}” in panel ${state.selected + 1}`;
    chip.addEventListener('click', () => {
      state.panels[state.selected].photo = i;
      drawChips();
      describeSelection();
      render();
    });
    chipsEl.appendChild(chip);
  });
  refreshLibrary();
}

// ------------------------------------------------------------- panel play

let drag = null;

function canvasPoint(evt) {
  const r = canvas.getBoundingClientRect();
  return {
    nx: (evt.clientX - r.left) / r.width,
    ny: (evt.clientY - r.top) / r.height,
  };
}

canvas.addEventListener('pointerdown', (evt) => {
  const { nx, ny } = canvasPoint(evt);
  const hit = hitPanel(state.layout, nx, ny);
  if (hit < 0) return;
  state.selected = hit;
  drawChips();
  describeSelection();
  syncZoom();
  drag = { x: evt.clientX, y: evt.clientY };
  canvas.setPointerCapture(evt.pointerId);
  render();
});

canvas.addEventListener('pointermove', (evt) => {
  if (!drag) return;
  const slot = state.panels[state.selected];
  if (!slot || slot.photo < 0 || !photos[slot.photo]) return;
  const img = photos[slot.photo].img;
  const rect = LAYOUTS[state.layout].panels[state.selected];
  const r = canvas.getBoundingClientRect();
  const pw = rect.w * canvas.width;
  const ph = rect.h * canvas.height;
  const scale = Math.max(pw / img.naturalWidth, ph / img.naturalHeight) * slot.zoom;
  const overflowX = (img.naturalWidth * scale - pw) / 2;
  const overflowY = (img.naturalHeight * scale - ph) / 2;
  const dxPx = ((evt.clientX - drag.x) / r.width) * canvas.width;
  const dyPx = ((evt.clientY - drag.y) / r.height) * canvas.height;
  if (overflowX > 1) slot.ox = Math.max(-1, Math.min(1, slot.ox - dxPx / overflowX));
  if (overflowY > 1) slot.oy = Math.max(-1, Math.min(1, slot.oy - dyPx / overflowY));
  drag = { x: evt.clientX, y: evt.clientY };
  render();
});

const endDrag = () => { drag = null; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

// Drag and drop photos straight onto the stage.
const stage = $('stage');
['dragenter', 'dragover'].forEach((name) => stage.addEventListener(name, (e) => {
  e.preventDefault();
  stage.classList.add('drop');
}));
['dragleave', 'drop'].forEach((name) => stage.addEventListener(name, (e) => {
  e.preventDefault();
  stage.classList.remove('drop');
}));
stage.addEventListener('drop', (e) => {
  const files = [...(e.dataTransfer ? e.dataTransfer.files : [])];
  files.forEach(loadFile);
});

// ------------------------------------------------------------- controls

function syncZoom() {
  const slot = state.panels[state.selected];
  const z = slot ? slot.zoom : 1.15;
  zoomEl.value = String(Math.round(z * 100));
  zoomVal.textContent = `${Math.round(z * 100)}%`;
}

zoomEl.addEventListener('input', () => {
  const slot = state.panels[state.selected];
  if (slot) slot.zoom = Number(zoomEl.value) / 100;
  zoomVal.textContent = `${zoomEl.value}%`;
  render();
});

$('file-input').addEventListener('change', (e) => {
  [...e.target.files].forEach(loadFile);
  e.target.value = '';
});
$('sample-boulevard').addEventListener('click', () => loadSample('samples/boulevard.jpg', 'Neon Boulevard'));
$('sample-pier').addEventListener('click', () => loadSample('samples/pier.jpg', 'Sunset Pier'));

$('fill-all').addEventListener('click', () => {
  const slot = state.panels[state.selected];
  const source = slot && slot.photo >= 0 ? slot.photo : photos.length - 1;
  if (source < 0) {
    setStatus('Load a photo first — then “Fill all panels” can spread it across the cover.');
    return;
  }
  const crops = [
    { ox: 0, oy: 0, zoom: 1.05 },
    { ox: 0.4, oy: -0.25, zoom: 1.45 },
    { ox: -0.35, oy: 0.3, zoom: 1.45 },
    { ox: 0, oy: 0.35, zoom: 1.15 },
    { ox: -0.45, oy: -0.3, zoom: 1.5 },
    { ox: 0.3, oy: 0.1, zoom: 1.2 },
  ];
  state.panels.forEach((s, i) => {
    s.photo = source;
    Object.assign(s, crops[i % crops.length]);
  });
  drawChips();
  render();
  setStatus(`Every panel now shows “${photos[source].name}”, each with its own crop. Click any panel to fine-tune it.`);
});

document.querySelectorAll('[data-layout]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.layout = btn.dataset.layout;
    document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('on', b === btn));
    if (state.selected >= panelCount()) state.selected = 0;
    drawChips();
    describeSelection();
    render();
  });
});

document.querySelectorAll('[data-preset]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.preset = btn.dataset.preset;
    document.querySelectorAll('[data-preset]').forEach((b) => b.classList.toggle('on', b === btn));
    render();
  });
});

$('intensity').addEventListener('input', (e) => {
  state.intensity = Number(e.target.value) / 100;
  $('intensity-val').textContent = `${e.target.value}%`;
  render();
});

$('halftone').addEventListener('change', (e) => {
  state.halftone = e.target.checked;
  render();
});

$('title-input').addEventListener('input', (e) => {
  state.title = e.target.value;
  render();
});
$('caption-input').addEventListener('input', (e) => {
  state.caption = e.target.value;
  render();
});
$('size-select').addEventListener('change', (e) => {
  state.size = e.target.value;
  render();
});

// ------------------------------------------------------------- auto + export

$('auto-cover').addEventListener('click', async () => {
  if (photos.length === 0) {
    await loadSample('samples/pier.jpg', 'Sunset Pier');
  }
  if (photos.length === 0) return;
  state.layout = 'classic';
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('on', b.dataset.layout === 'classic'));
  state.preset = 'sunset';
  document.querySelectorAll('[data-preset]').forEach((b) => b.classList.toggle('on', b.dataset.preset === 'sunset'));
  state.intensity = 0.85;
  $('intensity').value = '85';
  $('intensity-val').textContent = '85%';
  if (!state.title.trim()) state.title = 'VICE FRAME';
  if (!state.caption.trim()) state.caption = 'WELCOME BACK TO THE CITY OF NEON';
  $('title-input').value = state.title;
  $('caption-input').value = state.caption;
  const crops = [
    { ox: 0, oy: -0.05, zoom: 1.05 },
    { ox: 0.4, oy: -0.2, zoom: 1.5 },
    { ox: -0.35, oy: 0.25, zoom: 1.5 },
    { ox: 0, oy: 0.3, zoom: 1.12 },
    { ox: -0.4, oy: -0.3, zoom: 1.5 },
    { ox: 0.3, oy: 0.1, zoom: 1.2 },
  ];
  state.panels.forEach((s, i) => {
    s.photo = 0;
    Object.assign(s, crops[i % crops.length]);
  });
  state.selected = 0;
  syncZoom();
  drawChips();
  render();
  setStatus(`Auto cover built from “${photos[0].name}”. Tweak anything you like, then export your PNG.`);
});

$('export-png').addEventListener('click', () => {
  render(-1); // the export itself carries no editor markings
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vice-frame-cover.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    setStatus('Cover exported as a PNG. Share it anywhere.');
    render();
  }, 'image/png');
});

// ------------------------------------------------------------- first paint

buildLibrary();
$('showcase-ensemble').addEventListener('click', () => applyShowcase('ensemble'));
$('showcase-duo').addEventListener('click', () => applyShowcase('duo'));
syncZoom();
drawChips();
describeSelection();
render();
