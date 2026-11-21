// Vice Cover Studio — editor wiring.
// Owns the poster state, the controls, drag/zoom on the preview canvas,
// and the PNG export. All drawing lives in cover.js.

import {
  drawCover,
  LAYOUTS,
  GRADES,
  LETTERINGS,
  panelRect,
  panelCount,
  DISPLAY_FONT,
  SANS_FONT,
} from './cover.js';

const SAMPLES = {
  pier: 'samples/pier.jpg',
  boulevard: 'samples/boulevard.jpg',
};

const EXPORT_SIZES = ['1080x1080', '1080x1350', '1920x1080'];

// The single source of truth for the poster. The screenshot driver reads
// and tweaks this object directly, so its shape is part of the contract:
// panels are always an array of { img, zoom, x, y }.
const state = {
  layout: 'trio',
  grade: 'sunset',
  lettering: 'vice',
  title: 'VICE CITY',
  subtitle: 'A SUNSET HEIST',
  size: '1080x1080',
  selected: 0,
  panels: [
    { img: null, zoom: 1, x: 0.5, y: 0.5 },
    { img: null, zoom: 1, x: 0.5, y: 0.5 },
    { img: null, zoom: 1, x: 0.5, y: 0.5 },
    { img: null, zoom: 1, x: 0.5, y: 0.5 },
  ],
};

window.__viceState = state;
window.__viceReady = false;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const stage = $('#stage');
const ctx = stage.getContext('2d');
const statusLine = $('#statusLine');

function setStatus(msg) {
  statusLine.textContent = msg;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load ' + src));
    img.src = src;
  });
}

function sizeParts(size) {
  const [w, h] = size.split('x').map(Number);
  return { w, h };
}

// Preview canvas follows the export aspect, capped at 720 px on the long side.
function previewDims() {
  const { w, h } = sizeParts(state.size);
  const scale = 720 / Math.max(w, h);
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

function render() {
  const d = previewDims();
  if (stage.width !== d.w || stage.height !== d.h) {
    stage.width = d.w;
    stage.height = d.h;
  }
  drawCover(ctx, state, d.w, d.h);
  syncSliders();
}

function syncSliders() {
  const p = state.panels[state.selected];
  const zoom = $('#zoomRange');
  const xr = $('#xRange');
  const yr = $('#yRange');
  zoom.value = String(p.zoom);
  xr.value = String(p.x);
  yr.value = String(p.y);
  $('#zoomOut').textContent = p.zoom.toFixed(2) + '×';
  $('#xOut').textContent = Math.round(p.x * 100) + '%';
  $('#yOut').textContent = Math.round(p.y * 100) + '%';
}

function markOn(buttons, attr, value) {
  buttons.forEach((b) => b.classList.toggle('on', b.dataset[attr] === value));
}

function applyLayout(id) {
  state.layout = id;
  markOn($$('[data-layout]'), 'layout', id);
  $('#layoutBlurb').textContent = LAYOUTS[id].blurb;
  if (state.selected >= panelCount(id)) selectPanel(panelCount(id) - 1);
  render();
}

function applyGrade(id) {
  state.grade = id;
  markOn($$('[data-grade]'), 'grade', id);
  render();
}

function selectPanel(i) {
  state.selected = i;
  markOn($$('[data-panel]'), 'panel', String(i));
  syncSliders();
  render();
}

// --- Photo intake ------------------------------------------------------

async function putPhotoInPanel(img, index) {
  state.panels[index].img = img;
  state.panels[index].zoom = 1;
  state.panels[index].x = 0.5;
  state.panels[index].y = 0.5;
  render();
}

async function loadSample(name, index) {
  try {
    const img = await loadImage(SAMPLES[name]);
    await putPhotoInPanel(img, index);
    setStatus(`Panel ${index + 1} uses the ${name} sample.`);
  } catch (e) {
    setStatus('Sample photo failed to load: ' + e.message);
  }
}

function bindPhotoControls() {
  $('#photoFile').addEventListener('change', async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('read failed'));
        reader.readAsDataURL(file);
      });
      const img = await loadImage(dataUrl);
      await putPhotoInPanel(img, state.selected);
      setStatus(`Panel ${state.selected + 1} uses “${file.name}”.`);
    } catch (e) {
      setStatus('That photo could not be used: ' + e.message);
    }
    ev.target.value = '';
  });

  $('#fillAllBtn').addEventListener('click', () => {
    const img = state.panels[state.selected].img;
    if (!img) {
      setStatus('Choose a photo for a panel first, then Fill all copies it.');
      return;
    }
    state.panels.forEach((p) => {
      p.img = img;
      p.zoom = 1;
      p.x = 0.5;
      p.y = 0.5;
    });
    render();
    setStatus('Every panel now uses the same photo.');
  });

  $('#samplePierBtn').addEventListener('click', () => loadSample('pier', state.selected));
  $('#sampleBlvdBtn').addEventListener('click', () => loadSample('boulevard', state.selected));
  $('#shuffleBtn').addEventListener('click', async () => {
    const names = Object.keys(SAMPLES);
    for (let i = 0; i < state.panels.length; i++) {
      const pick = names[Math.floor(Math.random() * names.length)];
      try {
        state.panels[i].img = await loadImage(SAMPLES[pick]);
      } catch { /* keep whatever was there */ }
      state.panels[i].zoom = 1;
      state.panels[i].x = 0.5;
      state.panels[i].y = 0.5;
    }
    render();
    setStatus('Samples shuffled across the panels.');
  });
}

// --- Drag to pan, wheel to zoom ---------------------------------------

function canvasPoint(ev) {
  const box = stage.getBoundingClientRect();
  return {
    x: ((ev.clientX - box.left) / box.width) * stage.width,
    y: ((ev.clientY - box.top) / box.height) * stage.height,
  };
}

function hitPanel(pt) {
  const n = panelCount(state.layout);
  for (let i = n - 1; i >= 0; i--) {
    const r = panelRect(state.layout, i, stage.width, stage.height);
    if (pt.x >= r.x && pt.x < r.x + r.w && pt.y >= r.y && pt.y < r.y + r.h) return i;
  }
  return state.selected;
}

function bindCanvasGestures() {
  let drag = null;
  stage.addEventListener('pointerdown', (ev) => {
    const pt = canvasPoint(ev);
    selectPanel(hitPanel(pt));
    drag = { x: pt.x, y: pt.y, panel: state.selected };
    stage.setPointerCapture(ev.pointerId);
  });
  stage.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const pt = canvasPoint(ev);
    const p = state.panels[drag.panel];
    if (!p.img) return;
    const r = panelRect(state.layout, drag.panel, stage.width, stage.height);
    const scale = Math.max(r.w / p.img.naturalWidth, r.h / p.img.naturalHeight) * p.zoom;
    const dw = p.img.naturalWidth * scale;
    const dh = p.img.naturalHeight * scale;
    if (dw > r.w) p.x = clamp(p.x - (pt.x - drag.x) / (dw - r.w), 0, 1);
    if (dh > r.h) p.y = clamp(p.y - (pt.y - drag.y) / (dh - r.h), 0, 1);
    drag = { x: pt.x, y: pt.y, panel: drag.panel };
    render();
  });
  const endDrag = () => { drag = null; };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const pt = canvasPoint(ev);
    selectPanel(hitPanel(pt));
    const p = state.panels[state.selected];
    p.zoom = clamp(p.zoom * Math.exp(-ev.deltaY * 0.0012), 1, 2.5);
    render();
  }, { passive: false });
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// --- Export ------------------------------------------------------------

// Renders the poster at an exact size and returns a PNG data URL.
// The screenshot driver calls this directly.
window.__viceExport = async function (size) {
  const target = EXPORT_SIZES.includes(size) ? size : state.size;
  const { w, h } = sizeParts(target);
  await document.fonts.ready;
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), state, w, h);
  return off.toDataURL('image/png');
};

function downloadExport() {
  window.__viceExport(state.size).then((url) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `vice-cover-${state.size}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setStatus(`Exported ${state.size} PNG.`);
  });
}

// --- Controls ----------------------------------------------------------

function bindControls() {
  $$('[data-layout]').forEach((b) =>
    b.addEventListener('click', () => applyLayout(b.dataset.layout)));
  $$('[data-grade]').forEach((b) =>
    b.addEventListener('click', () => applyGrade(b.dataset.grade)));
  $$('[data-panel]').forEach((b) =>
    b.addEventListener('click', () => selectPanel(Number(b.dataset.panel))));
  $$('[data-size]').forEach((b) =>
    b.addEventListener('click', () => {
      state.size = b.dataset.size;
      markOn($$('[data-size]'), 'size', state.size);
      render();
    }));
  $('#titleInput').addEventListener('input', (ev) => {
    state.title = ev.target.value;
    render();
  });
  $('#subtitleInput').addEventListener('input', (ev) => {
    state.subtitle = ev.target.value;
    render();
  });
  $('#captionStyle').addEventListener('change', (ev) => {
    state.lettering = ev.target.value;
    render();
  });
  $('#zoomRange').addEventListener('input', (ev) => {
    state.panels[state.selected].zoom = Number(ev.target.value);
    render();
  });
  $('#xRange').addEventListener('input', (ev) => {
    state.panels[state.selected].x = Number(ev.target.value);
    render();
  });
  $('#yRange').addEventListener('input', (ev) => {
    state.panels[state.selected].y = Number(ev.target.value);
    render();
  });
  $('#exportBtn').addEventListener('click', downloadExport);
  document.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
      ev.preventDefault();
      downloadExport();
    }
  });
}

// --- Boot ---------------------------------------------------------------

async function boot() {
  bindControls();
  bindPhotoControls();
  bindCanvasGestures();
  // Warm the shipped faces so the first render already uses them.
  try {
    await Promise.all([
      document.fonts.load(`900 90px ${DISPLAY_FONT}`),
      document.fonts.load(`700 90px ${DISPLAY_FONT}`),
      document.fonts.load(`700 28px ${SANS_FONT}`),
      document.fonts.load(`400 28px ${SANS_FONT}`),
    ]);
  } catch { /* canvas falls back to system sans; still usable */ }
  // Default look: pier left, boulevard middle, pier right, boulevard spare.
  const picks = ['pier', 'boulevard', 'pier', 'boulevard'];
  for (let i = 0; i < state.panels.length; i++) {
    try {
      state.panels[i].img = await loadImage(SAMPLES[picks[i]]);
    } catch { /* panel stays empty */ }
  }
  render();
  setStatus('Ready — drag a photo, pick a layout and grade, then Export PNG.');
  window.__viceReady = true;
}

boot();
