// Vice Cover Studio — editor wiring (DOM, state, export).
// The painting lives in cover.js; this module loads photos, keeps the
// editor state, and re-renders the preview canvas on every change.

import { SIZES, drawCover } from './cover.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const stage = $('#stage');
const stageCtx = stage.getContext('2d');

function freshPanel() {
  return { img: null, zoom: 1.15, x: 0.5, y: 0.5 };
}

const state = {
  layout: 'trio',
  grade: 'sunset',
  style: 'vice',
  title: 'VICE CITY',
  sub: 'WELCOME BACK TO THE SUNSHINE STATE',
  size: '1080x1080',
  selected: 0,
  panels: [freshPanel(), freshPanel(), freshPanel(), freshPanel()],
};

function previewSize() {
  const [w, h] = SIZES[state.size];
  const scale = 640 / w;
  return [640, Math.round(h * scale)];
}

function render() {
  const [pw, ph] = previewSize();
  if (stage.width !== pw || stage.height !== ph) {
    stage.width = pw;
    stage.height = ph;
  }
  drawCover(stageCtx, state, pw, ph);
  $('#sizeLabel').textContent = state.size.replace('x', ' × ');
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSamples() {
  try {
    const [boulevard, pier] = await Promise.all([
      loadImage('samples/boulevard.jpg'),
      loadImage('samples/pier.jpg'),
    ]);
    state.panels[0].img = boulevard;
    state.panels[1].img = pier;
    state.panels[2].img = boulevard;
    state.panels[3].img = pier;
    render();
  } catch (err) {
    console.warn('sample photos failed to load', err);
  }
}

function markReady() {
  window.__viceReady = true;
}

async function boot() {
  await Promise.race([
    Promise.all([loadSamples(), document.fonts ? document.fonts.ready : Promise.resolve()]),
    new Promise((r) => setTimeout(r, 4000)),
  ]);
  render();
  syncPanelControls();
  markReady();
}

function setChip(rowSel, attr, value) {
  $$(`${rowSel} [data-${attr}]`).forEach((btn) => {
    btn.classList.toggle('on', btn.dataset[attr] === String(value));
  });
}

function syncPanelControls() {
  const p = state.panels[state.selected];
  $('#zoomRange').value = p.zoom;
  $('#panX').value = p.x;
  $('#panY').value = p.y;
  setChip('#panelRow', 'panel', state.selected);
}

// --- control wiring -------------------------------------------------------

$$('#layoutRow [data-layout]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.layout = btn.dataset.layout;
    setChip('#layoutRow', 'layout', state.layout);
    render();
  });
});

$$('#gradeRow [data-grade]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.grade = btn.dataset.grade;
    setChip('#gradeRow', 'grade', state.grade);
    render();
  });
});

$('#captionStyle').addEventListener('change', (ev) => {
  state.style = ev.target.value;
  render();
});

$('#titleInput').addEventListener('input', (ev) => {
  state.title = ev.target.value;
  render();
});

$('#subInput').addEventListener('input', (ev) => {
  state.sub = ev.target.value;
  render();
});

$$('#panelRow [data-panel]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.selected = Number(btn.dataset.panel);
    syncPanelControls();
  });
});

$('#zoomRange').addEventListener('input', (ev) => {
  state.panels[state.selected].zoom = Number(ev.target.value);
  render();
});
$('#panX').addEventListener('input', (ev) => {
  state.panels[state.selected].x = Number(ev.target.value);
  render();
});
$('#panY').addEventListener('input', (ev) => {
  state.panels[state.selected].y = Number(ev.target.value);
  render();
});

$('#exportSize').addEventListener('change', (ev) => {
  state.size = ev.target.value;
  render();
});

$('#photoFiles').addEventListener('change', async (ev) => {
  const files = Array.from(ev.target.files || []);
  if (!files.length) return;
  const images = [];
  for (const file of files) {
    try {
      images.push(await loadImage(URL.createObjectURL(file)));
    } catch (err) {
      console.warn('could not read photo', file.name);
    }
  }
  if (!images.length) return;
  if (images.length === 1) {
    // One photo fills every panel — the fastest path to a cover.
    state.panels.forEach((p) => { p.img = images[0]; });
  } else {
    images.forEach((img, i) => {
      state.panels[i % state.panels.length].img = img;
    });
  }
  render();
});

$('#loadSamples').addEventListener('click', () => loadSamples());

// --- canvas drag / wheel framing ------------------------------------------

let dragTarget = null;
let dragStart = null;

function panelAtPoint(px, py) {
  // Preview is a scaled copy of the export; map pointer back to panel
  // slots using the same layout fractions cover.js uses.
  const [pw, ph] = previewSize();
  const [ew, eh] = SIZES[state.size];
  const nx = px / pw;
  const ny = py / ph;
  const rects = {
    trio: [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]],
    strip: [[0, 0, 1, 0.58], [0, 0.58, 0.5, 0.42], [0.5, 0.58, 0.5, 0.42]],
    hero: [[0, 0, 0.62, 1], [0.62, 0, 0.38, 0.5], [0.62, 0.5, 0.38, 0.5]],
    quad: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
  }[state.layout];
  void ew; void eh;
  for (let i = 0; i < rects.length; i++) {
    const [rx, ry, rw, rh] = rects[i];
    if (nx >= rx && nx <= rx + rw && ny >= ry && ny <= ry + rh) return i;
  }
  return state.selected;
}

stage.addEventListener('pointerdown', (ev) => {
  const box = stage.getBoundingClientRect();
  const px = (ev.clientX - box.left) * (stage.width / box.width);
  const py = (ev.clientY - box.top) * (stage.height / box.height);
  dragTarget = panelAtPoint(px, py);
  state.selected = dragTarget;
  syncPanelControls();
  dragStart = { x: px, y: py, fx: state.panels[dragTarget].x, fy: state.panels[dragTarget].y };
  stage.setPointerCapture(ev.pointerId);
});

stage.addEventListener('pointermove', (ev) => {
  if (dragTarget === null || !dragStart) return;
  const box = stage.getBoundingClientRect();
  const px = (ev.clientX - box.left) * (stage.width / box.width);
  const py = (ev.clientY - box.top) * (stage.height / box.height);
  const p = state.panels[dragTarget];
  p.x = Math.min(1, Math.max(0, dragStart.fx + (px - dragStart.x) / stage.width));
  p.y = Math.min(1, Math.max(0, dragStart.fy + (py - dragStart.y) / stage.height));
  syncPanelControls();
  render();
});

stage.addEventListener('pointerup', () => {
  dragTarget = null;
  dragStart = null;
});

stage.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  const idx = dragTarget === null ? state.selected : dragTarget;
  const p = state.panels[idx];
  p.zoom = Math.min(2.6, Math.max(1, p.zoom + (ev.deltaY < 0 ? 0.08 : -0.08)));
  if (idx === state.selected) syncPanelControls();
  render();
}, { passive: false });

// --- export ---------------------------------------------------------------

function exportDataUrl(sizeKey) {
  const [w, h] = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), state, w, h);
  return off.toDataURL('image/png');
}

function downloadCover() {
  const url = exportDataUrl(state.size);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vice-cover-${state.size}.png`;
  a.click();
}

$('#exportBtn').addEventListener('click', downloadCover);

document.addEventListener('keydown', (ev) => {
  if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
    ev.preventDefault();
    downloadCover();
  }
});

// Hooks the screenshot driver uses: the app's own export bytes, and the
// live state it can steer before each shot.
window.__viceState = state;
window.__viceExport = exportDataUrl;
window.__viceRender = render;

render();
boot();
