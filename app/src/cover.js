// Vice Cover Studio — cover renderer (pure canvas, no network).
// This module only draws. It knows nothing about the DOM: give it a 2d
// context, the current poster state and a target size, and it paints the
// whole cover: photo panels, colour grade, caption lettering, vignette.

export const GUTTER = 6; // px gap between panels at 1080 wide, scaled

// Panel rectangles are fractions of the canvas: [x, y, w, h].
export const LAYOUTS = {
  trio: {
    label: 'Vice Trio',
    blurb: 'Three upright panels, the middle one wider.',
    rects: [
      [0, 0, 0.3, 1],
      [0.3, 0, 0.4, 1],
      [0.7, 0, 0.3, 1],
    ],
  },
  strip: {
    label: 'Sunset Strip',
    blurb: 'One wide hero band over two panels below.',
    rects: [
      [0, 0, 1, 0.56],
      [0, 0.56, 0.5, 0.44],
      [0.5, 0.56, 0.5, 0.44],
    ],
  },
  hero: {
    label: 'Hero + Duo',
    blurb: 'A big lead panel with two stacked beside it.',
    rects: [
      [0, 0, 0.62, 1],
      [0.62, 0, 0.38, 0.5],
      [0.62, 0.5, 0.38, 0.5],
    ],
  },
  quad: {
    label: 'Four Corners',
    blurb: 'A two-by-two grid of equal panels.',
    rects: [
      [0, 0, 0.5, 0.5],
      [0.5, 0, 0.5, 0.5],
      [0, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5],
    ],
  },
};

export const LAYOUT_ORDER = ['trio', 'strip', 'hero', 'quad'];

// A grade is a canvas filter applied while each photo is painted, plus a
// translucent colour wash laid over the finished panels.
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    photoFilter: 'saturate(1.32) contrast(1.06) sepia(0.16)',
    wash(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, w * 0.25, h);
      g.addColorStop(0, 'rgba(255, 122, 26, 0.10)');
      g.addColorStop(0.55, 'rgba(255, 62, 120, 0.10)');
      g.addColorStop(1, 'rgba(120, 16, 96, 0.24)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  neon: {
    label: 'Neon Night',
    photoFilter: 'saturate(1.65) contrast(1.12) brightness(1.02)',
    wash(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, 'rgba(0, 229, 255, 0.13)');
      g.addColorStop(0.5, 'rgba(80, 40, 220, 0.10)');
      g.addColorStop(1, 'rgba(255, 0, 140, 0.17)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  dusk: {
    label: 'Palm Dusk',
    photoFilter: 'saturate(1.14) contrast(1.08) brightness(0.93)',
    wash(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(24, 12, 64, 0.30)');
      g.addColorStop(0.6, 'rgba(96, 32, 110, 0.12)');
      g.addColorStop(1, 'rgba(255, 122, 40, 0.12)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  mono: {
    label: 'Mono Noir',
    photoFilter: 'grayscale(1) contrast(1.18) brightness(1.03)',
    wash(ctx, w, h) {
      const g = ctx.createLinearGradient(0, h, w, 0);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0.10)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
};

export const GRADE_ORDER = ['sunset', 'neon', 'dusk', 'mono'];

export const LETTERINGS = {
  vice: { label: 'Vice Bold', hint: 'White block title, dark outline.' },
  neon: { label: 'Neon Glow', hint: 'Glowing title on a dark band.' },
  chrome: { label: 'Chrome Band', hint: 'Title on a metallic strip.' },
};

export const LETTERING_ORDER = ['vice', 'neon', 'chrome'];

export const DISPLAY_FONT = '"Vice Display", "Arial Narrow", sans-serif';
export const SANS_FONT = '"Vice Sans", Arial, sans-serif';

// Rect of one panel in device pixels, for a canvas of w x h.
export function panelRect(layoutId, index, w, h) {
  const rects = LAYOUTS[layoutId].rects;
  const r = rects[Math.min(index, rects.length - 1)];
  return { x: r[0] * w, y: r[1] * h, w: r[2] * w, h: r[3] * h };
}

export function panelCount(layoutId) {
  return LAYOUTS[layoutId].rects.length;
}

// Paint one photo into a rect, cover-fit, with a focal point (fx, fy in
// 0..1) and a zoom factor. Parts of the photo outside the rect are clipped.
function paintPhoto(ctx, img, rect, zoom, fx, fy) {
  if (!img || !img.naturalWidth) return;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  // Focal point: (0.5, 0.5) centres the photo; moving it slides the crop.
  const dx = rect.x + (rect.w - dw) / 2 - (fx - 0.5) * (dw - rect.w);
  const dy = rect.y + (rect.h - dh) / 2 - (fy - 0.5) * (dh - rect.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// Shrink a font until the text fits maxWidth; returns the fitted px size.
function fitSize(ctx, text, weight, family, startPx, maxWidth) {
  let px = startPx;
  while (px > 12) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    px -= 2;
  }
  return px;
}

function vignette(ctx, w, h) {
  const r = Math.hypot(w, h) / 2;
  const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.34)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// --- Caption lettering -------------------------------------------------

function spaced(ctx, text, cx, y) {
  // Draws text with manual letter spacing (canvas letterSpacing is not
  // honoured everywhere); returns the total width drawn.
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const gap = ctx.letterGap || 0;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (text.length - 1);
  let x = cx - total / 2;
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + gap;
  });
  return total;
}

function paintViceTitle(ctx, title, subtitle, w, h) {
  const pad = w * 0.045;
  const maxW = w - pad * 2;
  const baseY = h * 0.86;
  const titlePx = fitSize(ctx, title, 900, DISPLAY_FONT, h * 0.115, maxW);
  ctx.save();
  ctx.translate(w / 2, baseY);
  ctx.rotate(-0.022);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 ${titlePx}px ${DISPLAY_FONT}`;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160409';
  ctx.lineWidth = Math.max(3, titlePx * 0.09);
  ctx.strokeText(title, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = titlePx * 0.16;
  ctx.shadowOffsetY = titlePx * 0.04;
  ctx.fillText(title, 0, 0);
  ctx.restore();
  if (subtitle) {
    const subPx = Math.max(13, h * 0.028);
    ctx.save();
    ctx.font = `700 ${subPx}px ${SANS_FONT}`;
    ctx.letterGap = subPx * 0.42;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffe9a8';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = subPx * 0.35;
    spaced(ctx, subtitle.toUpperCase(), w / 2, baseY + subPx * 1.7);
    ctx.restore();
  }
}

function paintNeonTitle(ctx, title, subtitle, w, h) {
  const bandH = h * 0.2;
  const bandY = h - bandH;
  ctx.save();
  ctx.fillStyle = 'rgba(8, 4, 24, 0.72)';
  ctx.fillRect(0, bandY, w, bandH);
  ctx.fillStyle = 'rgba(0, 229, 255, 0.85)';
  ctx.fillRect(0, bandY, w, Math.max(2, h * 0.004));
  ctx.fillStyle = 'rgba(255, 0, 140, 0.85)';
  ctx.fillRect(0, h - Math.max(2, h * 0.004), w, Math.max(2, h * 0.004));
  const pad = w * 0.05;
  const titlePx = fitSize(ctx, title, 900, DISPLAY_FONT, h * 0.105, w - pad * 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${titlePx}px ${DISPLAY_FONT}`;
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = titlePx * 0.42;
  ctx.fillStyle = '#eafcff';
  ctx.fillText(title, w / 2, bandY + bandH * 0.38);
  ctx.shadowColor = '#ff008c';
  ctx.shadowBlur = titlePx * 0.22;
  ctx.fillStyle = '#ffd7ef';
  ctx.fillText(title, w / 2, bandY + bandH * 0.38);
  ctx.shadowBlur = 0;
  if (subtitle) {
    const subPx = Math.max(13, h * 0.026);
    ctx.font = `700 ${subPx}px ${SANS_FONT}`;
    ctx.letterGap = subPx * 0.5;
    ctx.fillStyle = '#9ff3ff';
    spaced(ctx, subtitle.toUpperCase(), w / 2, bandY + bandH * 0.78);
  }
  ctx.restore();
}

function paintChromeTitle(ctx, title, subtitle, w, h) {
  const bandH = h * 0.17;
  const bandY = h - bandH;
  const metal = ctx.createLinearGradient(0, bandY, 0, h);
  metal.addColorStop(0, '#f5f8fc');
  metal.addColorStop(0.35, '#aeb9c6');
  metal.addColorStop(0.55, '#e8edf3');
  metal.addColorStop(0.8, '#7c8896');
  metal.addColorStop(1, '#dfe5ec');
  ctx.save();
  ctx.fillStyle = metal;
  ctx.fillRect(0, bandY, w, bandH);
  ctx.fillStyle = 'rgba(16, 19, 26, 0.9)';
  ctx.fillRect(0, bandY, w, Math.max(2, h * 0.005));
  const pad = w * 0.05;
  const titlePx = fitSize(ctx, title, 900, DISPLAY_FONT, h * 0.1, w - pad * 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${titlePx}px ${DISPLAY_FONT}`;
  ctx.fillStyle = '#12151d';
  ctx.fillText(title, w / 2, bandY + bandH * 0.36);
  if (subtitle) {
    const subPx = Math.max(12, h * 0.024);
    ctx.font = `700 ${subPx}px ${SANS_FONT}`;
    ctx.letterGap = subPx * 0.46;
    ctx.fillStyle = '#3c4450';
    spaced(ctx, subtitle.toUpperCase(), w / 2, bandY + bandH * 0.76);
  }
  ctx.restore();
}

const TITLE_PAINTERS = { vice: paintViceTitle, neon: paintNeonTitle, chrome: paintChromeTitle };

// --- Main entry point --------------------------------------------------

// state: { layout, grade, lettering, title, subtitle, panels }
// panels[i]: { img, zoom, x, y } — img may be null (empty panel).
export function drawCover(ctx, state, w, h) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const gap = (GUTTER * w) / 1080;
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  // Paper-white gutters show between the panels.
  ctx.fillStyle = '#f4efe8';
  ctx.fillRect(0, 0, w, h);
  const count = panelCount(state.layout);
  for (let i = 0; i < count; i++) {
    const full = panelRect(state.layout, i, w, h);
    const rect = {
      x: full.x + gap / 2,
      y: full.y + gap / 2,
      w: full.w - gap,
      h: full.h - gap,
    };
    const p = state.panels[i];
    if (p && p.img) {
      ctx.filter = grade.photoFilter;
      paintPhoto(ctx, p.img, rect, p.zoom || 1, p.x ?? 0.5, p.y ?? 0.5);
      ctx.filter = 'none';
    } else {
      // Empty panel: a dark placeholder with a thin frame.
      ctx.fillStyle = '#241a2e';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = Math.max(1, w * 0.0015);
      ctx.strokeRect(rect.x + 8, rect.y + 8, rect.w - 16, rect.h - 16);
    }
  }
  grade.wash(ctx, w, h);
  vignette(ctx, w, h);
  const painter = TITLE_PAINTERS[state.lettering] || paintViceTitle;
  painter(ctx, (state.title || '').toUpperCase(), state.subtitle || '', w, h);
  ctx.restore();
}
