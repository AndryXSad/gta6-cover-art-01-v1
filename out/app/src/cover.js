// Vice Cover Studio — cover renderer (pure canvas, no network).
// Draws the multi-panel poster: photo panels with per-panel crop, a colour
// grade wash, and bold caption lettering. main.js owns state and DOM; this
// module only knows how to paint a given state at a given pixel size.

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

export const LAYOUT_NAMES = ['trio', 'strip', 'hero', 'quad'];
export const GRADE_NAMES = ['sunset', 'neon', 'dusk', 'mono'];

// Layout geometry: fractions of the canvas, [x, y, w, h] per panel.
// trio  = three upright columns; strip = one wide banner over two halves;
// hero  = one big feature panel with two stacked beside it;
// quad  = four equal corners.
export const LAYOUTS = {
  trio(W, H) {
    const third = W / 3;
    return [
      [0, 0, third, H],
      [third, 0, third, H],
      [third * 2, 0, third, H],
    ];
  },
  strip(W, H) {
    const top = H * 0.58;
    return [
      [0, 0, W, top],
      [0, top, W / 2, H - top],
      [W / 2, top, W / 2, H - top],
    ];
  },
  hero(W, H) {
    const left = W * 0.62;
    return [
      [0, 0, left, H],
      [left, 0, W - left, H / 2],
      [left, H / 2, W - left, H / 2],
    ];
  },
  quad(W, H) {
    return [
      [0, 0, W / 2, H / 2],
      [W / 2, 0, W / 2, H / 2],
      [0, H / 2, W / 2, H / 2],
      [W / 2, H / 2, W / 2, H / 2],
    ];
  },
};

export const GRADES = {
  sunset: {
    wash: ['rgba(255,122,26,0.20)', 'rgba(255,45,120,0.26)'],
    glow: 'rgba(255,170,60,0.30)',
    mono: false,
    captionInk: '#ffffff',
    captionBar: '#ff2e7e',
  },
  neon: {
    wash: ['rgba(190,30,255,0.24)', 'rgba(0,220,255,0.20)'],
    glow: 'rgba(0,230,255,0.26)',
    mono: false,
    captionInk: '#f2fbff',
    captionBar: '#00e5ff',
  },
  dusk: {
    wash: ['rgba(90,30,160,0.26)', 'rgba(255,140,50,0.18)'],
    glow: 'rgba(255,150,70,0.22)',
    mono: false,
    captionInk: '#fff6ea',
    captionBar: '#ffb347',
  },
  mono: {
    wash: ['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.22)'],
    glow: 'rgba(255,255,255,0.10)',
    mono: true,
    captionInk: '#ffffff',
    captionBar: '#e8e8e8',
  },
};

// Paint one photo into one panel rect, cover-fit, with the panel's own
// zoom and focal point (x, y in 0..1). Empty panels get a dusk gradient
// and a "drop a photo" hint so the poster never shows a hole.
function paintPanel(ctx, rect, panel, grade) {
  const [rx, ry, rw, rh] = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();
  const img = panel && panel.img;
  if (img && img.naturalWidth > 0) {
    if (grade.mono) ctx.filter = 'grayscale(1) contrast(1.12) brightness(1.04)';
    const zoom = Math.max(1, panel.zoom || 1);
    const base = Math.max(rw / img.naturalWidth, rh / img.naturalHeight) * zoom;
    const dw = img.naturalWidth * base;
    const dh = img.naturalHeight * base;
    const fx = panel.x == null ? 0.5 : panel.x;
    const fy = panel.y == null ? 0.5 : panel.y;
    const dx = rx + (rw - dw) * fx;
    const dy = ry + (rh - dh) * fy;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
  } else {
    const g = ctx.createLinearGradient(rx, ry, rx, ry + rh);
    g.addColorStop(0, '#3a1654');
    g.addColorStop(1, '#12081c');
    ctx.fillStyle = g;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `700 ${Math.max(14, rw * 0.045)}px "ViceSans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD PHOTO', rx + rw / 2, ry + rh / 2);
  }
  ctx.restore();
}

// Thin pale gutters between panels, GTA-poster style.
function paintGutters(ctx, rects, W, H) {
  const g = Math.max(3, Math.round(W * 0.005));
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  for (const [rx, ry, rw, rh] of rects) {
    if (rx > 0) ctx.fillRect(rx - g / 2, 0, g, H);
    if (ry > 0) ctx.fillRect(0, ry - g / 2, W, g);
  }
}

function paintGradeWash(ctx, grade, W, H) {
  const wash = ctx.createLinearGradient(0, 0, W * 0.35, H);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const glow = ctx.createRadialGradient(W * 0.78, H * 0.08, 0, W * 0.78, H * 0.08, W * 0.55);
  glow.addColorStop(0, grade.glow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function fitFont(ctx, text, family, weight, startPx, maxWidth) {
  let px = startPx;
  while (px > 12) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return px;
    px -= 2;
  }
  return px;
}

// The caption block: big title + sub-caption, anchored to the bottom with
// a translucent scrim so lettering stays readable over any photo.
function paintCaption(ctx, state, grade, W, H) {
  const title = (state.title || 'VICE CITY').toUpperCase();
  const sub = (state.sub || '').toUpperCase();
  const bandH = H * 0.235;
  const bandY = H - bandH;
  const scrim = ctx.createLinearGradient(0, bandY - H * 0.05, 0, H);
  scrim.addColorStop(0, 'rgba(8,2,16,0)');
  scrim.addColorStop(0.35, 'rgba(8,2,16,0.62)');
  scrim.addColorStop(1, 'rgba(8,2,16,0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY - H * 0.05, W, bandH + H * 0.05);

  const pad = W * 0.045;
  const maxW = W - pad * 2;
  const titlePx = fitFont(ctx, title, '"ViceDisplay", sans-serif', 800, Math.round(H * 0.105), maxW);
  const titleY = H - H * 0.085;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';

  if (state.style === 'neon') {
    ctx.save();
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = titlePx * 0.45;
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = Math.max(2, titlePx * 0.045);
    ctx.strokeText(title, pad, titleY);
    ctx.shadowColor = '#ff2e9d';
    ctx.shadowBlur = titlePx * 0.28;
    ctx.fillStyle = grade.captionInk;
    ctx.fillText(title, pad, titleY);
    ctx.restore();
  } else if (state.style === 'chrome') {
    const bandTop = titleY - titlePx * 0.92;
    ctx.fillStyle = 'rgba(10,6,18,0.72)';
    ctx.fillRect(pad, bandTop, maxW, titlePx * 1.12);
    ctx.fillStyle = grade.captionBar;
    ctx.fillRect(pad, bandTop, maxW, Math.max(3, titlePx * 0.05));
    ctx.fillRect(pad, bandTop + titlePx * 1.07, maxW, Math.max(3, titlePx * 0.05));
    const chrome = ctx.createLinearGradient(0, bandTop, 0, bandTop + titlePx * 1.1);
    chrome.addColorStop(0, '#ffffff');
    chrome.addColorStop(0.45, '#c9d4dd');
    chrome.addColorStop(0.55, '#5f6b76');
    chrome.addColorStop(1, '#f2f6f8');
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = Math.max(2, titlePx * 0.05);
    ctx.strokeText(title, pad, titleY);
    ctx.fillStyle = chrome;
    ctx.fillText(title, pad, titleY);
  } else {
    // vice: tall condensed white title, heavy dark outline, pink bar.
    ctx.strokeStyle = 'rgba(10,2,18,0.9)';
    ctx.lineWidth = Math.max(3, titlePx * 0.09);
    ctx.strokeText(title, pad, titleY);
    ctx.fillStyle = grade.captionInk;
    ctx.fillText(title, pad, titleY);
    const barW = Math.min(maxW, ctx.measureText(title).width);
    ctx.fillStyle = grade.captionBar;
    ctx.fillRect(pad, titleY + H * 0.012, barW, Math.max(4, H * 0.008));
  }

  if (sub) {
    const subPx = fitFont(ctx, sub, '"ViceSans", sans-serif', 700, Math.round(H * 0.028), maxW);
    ctx.font = `700 ${subPx}px "ViceSans", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(sub, pad, titleY + H * 0.052);
  }
}

export function drawCover(ctx, state, W, H) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layoutFn = LAYOUTS[state.layout] || LAYOUTS.trio;
  const rects = layoutFn(W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#12081c';
  ctx.fillRect(0, 0, W, H);
  rects.forEach((rect, i) => paintPanel(ctx, rect, state.panels[i], grade));
  paintGutters(ctx, rects, W, H);
  paintGradeWash(ctx, grade, W, H);
  paintCaption(ctx, state, grade, W, H);
}
