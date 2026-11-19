// library.js — VICE FRAME's bundled Cast & Scenes plates and showcases.
//
// The plates are original flat-poster illustrations drawn for this studio
// (programmatically, in PIL) and shipped inside app/assets/, so they work
// fully offline like everything else. A showcase is a recipe: a layout, a
// grade, a caption and a panel-by-panel casting that turns the library
// into a finished blockbuster cover in one click. Showcases only ever
// fill the same panel slots a visitor fills by hand, so every v1 tool —
// drag, zoom, grades, export — keeps working on the result.

export const LIBRARY = [
  { id: 'lucia', name: 'Lucia — The Lead', kind: 'Cast', src: 'assets/char-lucia.jpg' },
  { id: 'jason', name: 'Jason — The Driver', kind: 'Cast', src: 'assets/char-jason.jpg' },
  { id: 'kingpin', name: 'Don Marino — The Kingpin', kind: 'Cast', src: 'assets/char-kingpin.jpg' },
  { id: 'racer', name: 'Vex — The Racer', kind: 'Cast', src: 'assets/char-racer.jpg' },
  { id: 'lifeguard', name: 'Sandy — The Lifeguard', kind: 'Cast', src: 'assets/char-lifeguard.jpg' },
  { id: 'biker', name: 'Rook — The Biker', kind: 'Cast', src: 'assets/char-biker.jpg' },
  { id: 'skyline', name: 'Neon Skyline', kind: 'Scenes', src: 'assets/scene-skyline.jpg' },
  { id: 'marina', name: 'Marina at Dusk', kind: 'Scenes', src: 'assets/scene-marina.jpg' },
  { id: 'street', name: 'Neon Street', kind: 'Scenes', src: 'assets/scene-street.jpg' },
  { id: 'beach', name: 'Palm Beach', kind: 'Scenes', src: 'assets/scene-beach.jpg' },
  { id: 'swamp', name: 'Swamp Run', kind: 'Scenes', src: 'assets/scene-swamp.jpg' },
];

export const LIBRARY_BY_ID = new Map(LIBRARY.map((item) => [item.id, item]));

/** One-click finished covers, cast from the library. */
export const SHOWCASES = {
  ensemble: {
    label: 'Ensemble',
    layout: 'classic',
    preset: 'sunset',
    intensity: 0.85,
    caption: 'WELCOME BACK TO THE CITY OF NEON',
    panels: [
      { id: 'skyline', ox: 0, oy: 0, zoom: 1.04 },
      { id: 'street', ox: 0, oy: -0.2, zoom: 1.1 },
      { id: 'lucia', ox: 0, oy: -0.06, zoom: 1.06 },
      { id: 'marina', ox: 0, oy: -0.3, zoom: 1.06 },
    ],
  },
  duo: {
    label: 'Duo Leads',
    layout: 'hero',
    preset: 'sunset',
    intensity: 0.85,
    caption: 'TWO HEARTS. ONE CITY. NO BRAKES.',
    panels: [
      { id: 'marina', ox: 0, oy: 0, zoom: 1.05 },
      { id: 'lucia', ox: 0, oy: -0.05, zoom: 1.07 },
      { id: 'jason', ox: 0, oy: -0.05, zoom: 1.07 },
    ],
  },
};
