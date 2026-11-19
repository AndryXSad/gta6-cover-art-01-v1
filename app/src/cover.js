// Vice Cover Studio — cover renderer.
// Draws a multi-panel, sunset/neon-graded poster cover onto any 2d canvas
// from the editor state: photos, per-panel crop, layout, grade and caption.
// No network, no external assets: only the photos the user loaded and the
// fonts shipped under app/fonts/.

(function () {
  'use strict';

  // A grade is the whole colour story of a cover: the sky wash laid over
  // every photo, the frame colour, the caption ink and its glow.
  var GRADES = {
    sunset: {
      wash: ['rgba(255,122,26,0.34)', 'rgba(255,46,136,0.30)', 'rgba(123,47,247,0.22)'],
      frame: '#ffd9a0',
      title: '#fff3d6',
      titleStroke: '#2a0a2e',
      sub: '#ffe9a8',
      badge: '#ff7a1a',
      vignette: 'rgba(42,10,46,0.55)',
    },
    neon: {
      wash: ['rgba(34,211,238,0.30)', 'rgba(168,85,247,0.30)', 'rgba(255,46,136,0.28)'],
      frame: '#a5f3fc',
      title: '#eafcff',
      titleStroke: '#12042b',
      sub: '#a5f3fc',
      badge: '#22d3ee',
      vignette: 'rgba(10,4,43,0.55)',
    },
    dusk: {
      wash: ['rgba(255,197,61,0.26)', 'rgba(176,77,255,0.32)', 'rgba(43,16,85,0.30)'],
      frame: '#e9d5ff',
      title: '#fdf4ff',
      titleStroke: '#1c0a33',
      sub: '#fde68a',
      badge: '#ffc53d',
      vignette: 'rgba(28,10,51,0.55)',
    },
    noir: {
      wash: ['rgba(255,255,255,0.10)', 'rgba(120,120,120,0.16)', 'rgba(0,0,0,0.34)'],
      frame: '#f5f5f5',
      title: '#ffffff',
      titleStroke: '#000000',
      sub: '#e5e5e5',
      badge: '#ffffff',
      vignette: 'rgba(0,0,0,0.55)',
    },
  };

  // Panel rectangles for each layout, in fractions of the cover. Every
  // layout leaves an outer margin and a gutter so the panels read as a
  // poster grid instead of one flat photo.
  function layoutRects(name, W, H) {
    var m = Math.round(Math.min(W, H) * 0.028);
    var g = Math.round(Math.min(W, H) * 0.016);
    var x0 = m, y0 = m, x1 = W - m, y1 = H - m;
    var w = x1 - x0, h = y1 - y0;
    var third = (w - 2 * g) / 3;
    var half = (w - g) / 2;
    if (name === 'strip') {
      return [
        { x: x0, y: y0, w: third, h: h },
        { x: x0 + third + g, y: y0, w: third, h: h },
        { x: x0 + 2 * (third + g), y: y0, w: third, h: h },
      ];
    }
    if (name === 'hero') {
      var topH = (h - g) * 0.62;
      return [
        { x: x0, y: y0, w: w, h: topH },
        { x: x0, y: y0 + topH + g, w: half, h: h - topH - g },
        { x: x0 + half + g, y: y0 + topH + g, w: half, h: h - topH - g },
      ];
    }
    if (name === 'quad') {
      var halfH = (h - g) / 2;
      return [
        { x: x0, y: y0, w: half, h: halfH },
        { x: x0 + half + g, y: y0, w: half, h: halfH },
        { x: x0, y: y0 + halfH + g, w: half, h: halfH },
        { x: x0 + half + g, y: y0 + halfH + g, w: half, h: halfH },
      ];
    }
    // 'trio': tall hero panel left, two stacked panels right.
    var heroW = (w - g) * 0.58;
    var stackH = (h - g) / 2;
    return [
      { x: x0, y: y0, w: heroW, h: h },
      { x: x0 + heroW + g, y: y0, w: w - heroW - g, h: stackH },
      { x: x0 + heroW + g, y: y0 + stackH + g, w: w - heroW - g, h: stackH },
    ];
  }

  // Deterministic speckle so the grain looks the same on every export.
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Draw one photo into one panel: cover-fit, then the panel's zoom and
  // pan. Pan is a -1..1 fraction of the spare room the zoom leaves.
  function drawPhotoInto(ctx, img, rect, panel) {
    var zoom = panel.zoom || 1;
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    var scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
    var dw = iw * scale, dh = ih * scale;
    var dx = rect.x + (rect.w - dw) / 2 + (panel.x || 0) * Math.max(0, (dw - rect.w) / 2);
    var dy = rect.y + (rect.h - dh) / 2 + (panel.y || 0) * Math.max(0, (dh - rect.h) / 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }

  // A diagonal sunset wash plus a vignette, laid over one panel.
  function gradePanel(ctx, rect, grade) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    var wash = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    wash.addColorStop(0, grade.wash[0]);
    wash.addColorStop(0.55, grade.wash[1]);
    wash.addColorStop(1, grade.wash[2]);
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    var vig = ctx.createRadialGradient(
      rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.35,
      rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.75,
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, grade.vignette);
    ctx.fillStyle = vig;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }

  // The caption: a big bold title with a heavy outline, a letterspaced
  // subtitle, and a small original star badge. Lettering styles change
  // the title's treatment only; the words stay the user's.
  function drawCaption(ctx, W, H, state, grade) {
    var title = (state.title || '').trim().toUpperCase();
    var sub = (state.subtitle || '').trim().toUpperCase();
    var scale = Math.min(W, H) / 1080;
    var bottom = state.captionPos !== 'top';
    var bandH = Math.round(H * 0.16 * (state.titleScale || 1));
    var bandY = bottom ? H - bandH - Math.round(H * 0.035) : Math.round(H * 0.035);
    var cx = W / 2;

    if (state.captionStyle === 'chrome') {
      ctx.save();
      ctx.fillStyle = 'rgba(10,4,20,0.72)';
      ctx.fillRect(0, bandY, W, bandH);
      ctx.fillStyle = grade.badge;
      ctx.fillRect(0, bandY, W, Math.max(3, Math.round(4 * scale)));
      ctx.fillRect(0, bandY + bandH - Math.max(3, Math.round(4 * scale)), W, Math.max(3, Math.round(4 * scale)));
      ctx.restore();
    }

    if (title) {
      var size = Math.round(Math.min(W * 0.105, bandH * 0.62) * (state.titleScale || 1));
      ctx.save();
      ctx.font = '900 ' + size + 'px "Vice Display", "Vice Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      try { ctx.letterSpacing = Math.round(size * 0.04) + 'px'; } catch (e) { /* older canvas: no tracking */ }
      var ty = bandY + bandH / 2 - (sub ? size * 0.12 : 0);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = grade.titleStroke;
      ctx.lineWidth = Math.max(3, Math.round(size * 0.14));
      if (state.captionStyle === 'neon') {
        ctx.shadowColor = grade.badge;
        ctx.shadowBlur = Math.round(size * 0.30);
      } else {
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = Math.round(size * 0.16);
        ctx.shadowOffsetY = Math.round(size * 0.05);
      }
      ctx.strokeText(title, cx, ty);
      ctx.fillStyle = grade.title;
      ctx.fillText(title, cx, ty);
      ctx.restore();
    }

    if (sub) {
      var subSize = Math.round(Math.min(W * 0.026, 30 * scale + 8));
      ctx.save();
      ctx.font = '700 ' + subSize + 'px "Vice Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      try { ctx.letterSpacing = Math.round(subSize * 0.32) + 'px'; } catch (e) { /* older canvas */ }
      var sy = bandY + bandH - Math.round(subSize * 1.1);
      if (!title) sy = bandY + bandH / 2;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = Math.round(subSize * 0.3);
      ctx.fillStyle = grade.sub;
      ctx.fillText(sub, cx, sy);
      ctx.restore();
    }

    // Small original badge, top corner opposite the caption.
    var b = Math.round(34 * scale + 10);
    var bx = Math.round(W * 0.035), by = bottom ? Math.round(H * 0.035) : H - b - Math.round(H * 0.035);
    ctx.save();
    ctx.fillStyle = 'rgba(10,4,20,0.66)';
    ctx.beginPath();
    ctx.roundRect(bx, by, b * 3.7, b, b / 2);
    ctx.fill();
    ctx.fillStyle = grade.badge;
    ctx.font = '700 ' + Math.round(b * 0.52) + 'px "Vice Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2605  VC STUDIO', bx + b * 0.32, by + b / 2 + 1);
    ctx.restore();
  }

  // Light print grain over the whole cover.
  function grain(ctx, W, H) {
    var rnd = mulberry32(20261119);
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#ffffff';
    var n = Math.round((W * H) / 9000);
    for (var i = 0; i < n; i++) {
      var s = rnd() < 0.5 ? 1 : 2;
      ctx.fillRect(rnd() * W, rnd() * H, s, s);
    }
    ctx.restore();
  }

  // Render the whole cover. `photos` is an array of loaded Image elements
  // (or null slots); `state.panels[i]` picks the photo, zoom and pan.
  function drawCover(ctx, W, H, state) {
    var grade = GRADES[state.grade] || GRADES.sunset;
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#160a24';
    ctx.fillRect(0, 0, W, H);

    var rects = layoutRects(state.layout || 'trio', W, H);
    for (var i = 0; i < rects.length; i++) {
      var panel = state.panels[i] || { photo: 0, zoom: 1.2, x: 0, y: 0 };
      var img = state.photos[panel.photo];
      if (img) drawPhotoInto(ctx, img, rects[i], panel);
      gradePanel(ctx, rects[i], grade);
      ctx.save();
      ctx.strokeStyle = grade.frame;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = Math.max(2, Math.round(Math.min(W, H) * 0.004));
      ctx.strokeRect(rects[i].x, rects[i].y, rects[i].w, rects[i].h);
      ctx.restore();
    }

    drawCaption(ctx, W, H, state, grade);
    grain(ctx, W, H);
    ctx.restore();
  }

  // A fresh canvas with the cover rendered at export size.
  function renderExport(state, size) {
    var canvas = document.createElement('canvas');
    canvas.width = size.w;
    canvas.height = size.h;
    drawCover(canvas.getContext('2d'), size.w, size.h, state);
    return canvas;
  }

  window.ViceCover = {
    GRADES: GRADES,
    layoutRects: layoutRects,
    drawCover: drawCover,
    renderExport: renderExport,
    panelCount: function (layout) { return layoutRects(layout || 'trio', 100, 100).length; },
  };
})();
