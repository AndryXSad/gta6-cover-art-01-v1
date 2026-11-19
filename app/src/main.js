// Vice Cover Studio — editor wiring.
// Owns the editor state, loads the user's photos (or the bundled samples),
// keeps the live preview in sync, and exports the finished cover as PNG.
// Photos are read on this machine only; nothing is uploaded anywhere.

(function () {
  'use strict';

  var SIZES = {
    '1080x1080': { w: 1080, h: 1080, label: '1080 \u00d7 1080' },
    '1080x1350': { w: 1080, h: 1350, label: '1080 \u00d7 1350' },
    '1920x1080': { w: 1920, h: 1080, label: '1920 \u00d7 1080' },
  };

  var state = {
    layout: 'trio',
    grade: 'sunset',
    title: 'VICE NIGHTS',
    subtitle: 'YOUR STORY \u00b7 YOUR CITY',
    titleScale: 1,
    captionStyle: 'solid',
    captionPos: 'bottom',
    sizeKey: '1080x1080',
    photos: [null, null, null],
    panels: [
      { photo: 0, zoom: 1.05, x: 0, y: 0 },
      { photo: 1, zoom: 1.05, x: 0, y: 0 },
      { photo: 2, zoom: 1.05, x: 0, y: 0 },
      { photo: 0, zoom: 1.05, x: 0, y: 0 },
    ],
  };

  var selectedPanel = 0;
  var stage = document.getElementById('stage');
  var stageCtx = stage.getContext('2d');
  var note = document.getElementById('exportNote');
  var dims = document.getElementById('previewDims');

  function $(id) { return document.getElementById(id); }

  function loadImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function render() {
    var size = SIZES[state.sizeKey];
    var scale = 960 / size.w;
    var pw = Math.round(size.w * scale);
    var ph = Math.round(size.h * scale);
    if (stage.width !== pw || stage.height !== ph) {
      stage.width = pw;
      stage.height = ph;
    }
    window.ViceCover.drawCover(stageCtx, pw, ph, state);
    dims.textContent = size.label;
  }

  function syncPanelControls() {
    var panel = state.panels[selectedPanel];
    $('zoomRange').value = panel.zoom;
    $('zoomVal').textContent = panel.zoom.toFixed(2) + '\u00d7';
    $('panXRange').value = panel.x;
    $('panYRange').value = panel.y;
    $('photoSelect').value = String(panel.photo);
    var chips = document.querySelectorAll('#panelPicker .panel-chip');
    chips.forEach(function (chip, i) {
      chip.classList.toggle('is-active', i === selectedPanel);
    });
  }

  function rebuildPanelPicker() {
    var count = window.ViceCover.panelCount(state.layout);
    if (selectedPanel >= count) selectedPanel = 0;
    var picker = $('panelPicker');
    picker.innerHTML = '';
    var names = ['Panel 1', 'Panel 2', 'Panel 3', 'Panel 4'];
    for (var i = 0; i < count; i++) {
      (function (index) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'panel-chip' + (index === selectedPanel ? ' is-active' : '');
        chip.textContent = names[index] + ' \u00b7 Photo ' + (state.panels[index].photo + 1);
        chip.addEventListener('click', function () {
          selectedPanel = index;
          syncPanelControls();
        });
        picker.appendChild(chip);
      })(i);
    }
    syncPanelControls();
  }

  function setPhoto(slot, img) {
    state.photos[slot] = img;
    var thumb = $('thumb' + slot);
    if (thumb && img) thumb.src = img.src;
    render();
  }

  function readUpload(slot, file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      loadImage(reader.result).then(function (img) {
        if (img) setPhoto(slot, img);
      });
    };
    reader.readAsDataURL(file);
  }

  function exportCover(sizeKey) {
    var key = sizeKey || state.sizeKey;
    var size = SIZES[key];
    var canvas = window.ViceCover.renderExport(state, size);
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) {
        if (!blob) { resolve(null); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'vice-cover-' + key + '.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
        note.textContent = 'Exported vice-cover-' + key + '.png (' + size.label + ').';
        resolve(url);
      }, 'image/png');
    });
  }

  // -- toolbar wiring -------------------------------------------------------

  document.querySelectorAll('#layoutGrid .layout-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#layoutGrid .layout-btn').forEach(function (b) {
        b.classList.remove('is-active');
      });
      btn.classList.add('is-active');
      state.layout = btn.dataset.layout;
      rebuildPanelPicker();
      render();
    });
  });

  document.querySelectorAll('#gradeGrid .grade-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#gradeGrid .grade-btn').forEach(function (b) {
        b.classList.remove('is-active');
      });
      btn.classList.add('is-active');
      state.grade = btn.dataset.grade;
      render();
    });
  });

  for (var slot = 0; slot < 3; slot++) {
    (function (s) {
      $('file' + s).addEventListener('change', function (ev) {
        readUpload(s, ev.target.files && ev.target.files[0]);
      });
    })(slot);
  }

  document.querySelectorAll('[data-sample]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var slotEl = btn.closest('.photo-slot');
      var slot = Number(slotEl.dataset.slot);
      loadImage(btn.dataset.sample).then(function (img) {
        if (img) setPhoto(slot, img);
      });
    });
  });

  $('zoomRange').addEventListener('input', function (ev) {
    state.panels[selectedPanel].zoom = Number(ev.target.value);
    $('zoomVal').textContent = Number(ev.target.value).toFixed(2) + '\u00d7';
    render();
  });
  $('panXRange').addEventListener('input', function (ev) {
    state.panels[selectedPanel].x = Number(ev.target.value);
    render();
  });
  $('panYRange').addEventListener('input', function (ev) {
    state.panels[selectedPanel].y = Number(ev.target.value);
    render();
  });
  $('photoSelect').addEventListener('change', function (ev) {
    state.panels[selectedPanel].photo = Number(ev.target.value);
    rebuildPanelPicker();
    render();
  });

  $('titleInput').addEventListener('input', function (ev) {
    state.title = ev.target.value;
    render();
  });
  $('subtitleInput').addEventListener('input', function (ev) {
    state.subtitle = ev.target.value;
    render();
  });
  $('titleSizeRange').addEventListener('input', function (ev) {
    state.titleScale = Number(ev.target.value) / 100;
    $('titleSizeVal').textContent = ev.target.value + '%';
    render();
  });
  $('captionStyle').addEventListener('change', function (ev) {
    state.captionStyle = ev.target.value;
    render();
  });
  $('captionPos').addEventListener('change', function (ev) {
    state.captionPos = ev.target.value;
    render();
  });
  $('exportSize').addEventListener('change', function (ev) {
    state.sizeKey = ev.target.value;
    render();
  });

  $('exportBtn').addEventListener('click', function () { exportCover(); });
  $('exportBtn2').addEventListener('click', function () { exportCover(); });

  // Keyboard shortcut: Ctrl/Cmd+Enter exports at the chosen size.
  document.addEventListener('keydown', function (ev) {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
      ev.preventDefault();
      exportCover();
    }
  });

  // -- direct manipulation on the preview ----------------------------------
  // Drag moves the photo inside the panel under the pointer; the wheel
  // zooms it. Coordinates are mapped from the displayed canvas back to
  // the preview's own pixels.

  var drag = null;

  function panelAt(px, py) {
    var rects = window.ViceCover.layoutRects(state.layout, stage.width, stage.height);
    for (var i = rects.length - 1; i >= 0; i--) {
      var r = rects[i];
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
    }
    return -1;
  }

  function canvasPoint(ev) {
    var box = stage.getBoundingClientRect();
    return {
      x: (ev.clientX - box.left) * (stage.width / box.width),
      y: (ev.clientY - box.top) * (stage.height / box.height),
    };
  }

  stage.addEventListener('pointerdown', function (ev) {
    var p = canvasPoint(ev);
    var hit = panelAt(p.x, p.y);
    if (hit < 0) return;
    selectedPanel = hit;
    syncPanelControls();
    drag = { x: p.x, y: p.y, px: state.panels[hit].x, py: state.panels[hit].y };
    stage.setPointerCapture(ev.pointerId);
  });

  stage.addEventListener('pointermove', function (ev) {
    if (!drag) return;
    var p = canvasPoint(ev);
    var panel = state.panels[selectedPanel];
    var rects = window.ViceCover.layoutRects(state.layout, stage.width, stage.height);
    var rect = rects[selectedPanel];
    var spanX = Math.max(40, rect.w * 0.5 * panel.zoom);
    var spanY = Math.max(40, rect.h * 0.5 * panel.zoom);
    panel.x = Math.max(-1, Math.min(1, drag.px + ((p.x - drag.x) / spanX) * 2));
    panel.y = Math.max(-1, Math.min(1, drag.py + ((p.y - drag.y) / spanY) * 2));
    syncPanelControls();
    render();
  });

  stage.addEventListener('pointerup', function () { drag = null; });
  stage.addEventListener('pointercancel', function () { drag = null; });

  stage.addEventListener('wheel', function (ev) {
    ev.preventDefault();
    var p = canvasPoint(ev);
    var hit = panelAt(p.x, p.y);
    if (hit < 0) return;
    selectedPanel = hit;
    var panel = state.panels[hit];
    panel.zoom = Math.max(1, Math.min(3, panel.zoom * (ev.deltaY < 0 ? 1.08 : 0.93)));
    syncPanelControls();
    render();
  }, { passive: false });

  // -- screenshot / automation hooks (used only by the maker's own shots) ---
  // Returns a data URL of the cover the app itself rendered at export size.
  window.__viceExport = function (sizeKey) {
    var size = SIZES[sizeKey] || SIZES[state.sizeKey];
    var canvas = window.ViceCover.renderExport(state, size);
    return canvas.toDataURL('image/png');
  };
  window.__viceState = state;

  // -- start: load the bundled samples so the editor opens with photos -----
  document.fonts.ready.then(function () { render(); });
  Promise.all([
    loadImage('samples/boulevard.jpg'),
    loadImage('samples/pier.jpg'),
    loadImage('samples/boulevard.jpg'),
  ]).then(function (imgs) {
    imgs.forEach(function (img, i) { if (img) setPhoto(i, img); });
    window.__viceReady = true;
    render();
  });
  rebuildPanelPicker();
  render();
})();
