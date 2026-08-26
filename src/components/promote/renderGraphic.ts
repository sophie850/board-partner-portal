/* ============================================================
   Drawing the promotional graphic

   The preview and the exported PNG are the same drawing at
   different scales, so what a partner downloads is what they saw.
   Everything is drawn on a canvas rather than screenshotted from
   the DOM: a canvas gives exact pixel dimensions for each platform,
   and does not depend on a rasteriser that may render the page's
   fonts differently.

   All measurements below are in "design units" for a 1080-wide
   graphic and are scaled by `width / 1080`, so one set of numbers
   serves every format and every export size.
   ============================================================ */

export interface GraphicConfig {
  format: string;
  width: number;
  height: number;
  /** An image path, or 'black'. */
  background: string;
  logoUrl: string;
  eyebrow: string;
  headline: string;
  sub: string;
  detail: string;
  tagline: string;
  url: string;
}

const AMBER = '#C8763C';
const AQUA = '#31F9E5';
const BONE = '#F1F1E4';

/** Ambit if it has loaded; the same stack the app uses otherwise. */
const FAMILY = "'Ambit', 'Helvetica Neue', Arial, sans-serif";

function font(size: number, weight = 300): string {
  return `${weight} ${size}px ${FAMILY}`;
}

/** Load an image, resolving to null rather than throwing when it fails. */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    // Everything is served from this origin, so the canvas stays
    // untainted and toBlob keeps working.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Cover-fit, the canvas equivalent of `background-size: cover`. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/** Break text to a width, returning the lines. */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 99,
): string[] {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }

  if (line && lines.length < maxLines) lines.push(line);

  // A silently cropped headline would be worse than an obvious one.
  if (lines.length === maxLines && words.length) {
    const last = lines[maxLines - 1];
    if (ctx.measureText(last).width > maxWidth) {
      lines[maxLines - 1] = `${last.slice(0, -1)}…`;
    }
  }

  return lines;
}

/**
 * Draw the graphic onto a canvas at its natural size.
 *
 * Returns the canvas so the caller can either export it or scale it
 * into a preview.
 */
export async function drawGraphic(
  config: GraphicConfig,
): Promise<HTMLCanvasElement> {
  const { width: W, height: H } = config;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const isBanner = config.format === 'banner';
  const isBadge = config.format === 'badge';
  const isStory = config.format === 'story';

  /*
   * One design unit.
   *
   * Sized from the width for the tall formats, but a LinkedIn banner
   * is four times wider than it is high — scaling its type by width
   * would ask for a headline taller than the banner itself. So wide,
   * short formats are sized from their height instead. The badge has
   * its own layout, tuned to its own proportions.
   */
  const u = isBadge ? W / 1080 : Math.min(W, H * 2.4) / 1080;

  /* ---- background ---- */

  if (config.background === 'black') {
    const glow = ctx.createRadialGradient(W * 0.2, 0, 0, W * 0.2, 0, Math.max(W, H) * 1.2);
    glow.addColorStop(0, '#14171D');
    glow.addColorStop(1, '#000000');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  } else {
    const bg = await loadImage(config.background);
    if (bg) {
      drawCover(ctx, bg, W, H);
    } else {
      ctx.fillStyle = '#050608';
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ---- scrim, so text stays legible over any gradient ---- */

  if (isBadge) {
    const across = ctx.createLinearGradient(0, 0, W, 0);
    across.addColorStop(0, 'rgba(5,6,8,0.90)');
    across.addColorStop(0.55, 'rgba(5,6,8,0.72)');
    across.addColorStop(1, 'rgba(5,6,8,0.50)');
    ctx.fillStyle = across;
    ctx.fillRect(0, 0, W, H);
  } else if (isStory) {
    const down = ctx.createLinearGradient(0, 0, 0, H);
    down.addColorStop(0, 'rgba(5,6,8,0.70)');
    down.addColorStop(0.35, 'rgba(5,6,8,0.25)');
    down.addColorStop(0.62, 'rgba(5,6,8,0.55)');
    down.addColorStop(1, 'rgba(5,6,8,0.92)');
    ctx.fillStyle = down;
    ctx.fillRect(0, 0, W, H);
  } else {
    const diagonal = ctx.createLinearGradient(0, 0, W, H * 0.6);
    diagonal.addColorStop(0, 'rgba(5,6,8,0.90)');
    diagonal.addColorStop(0.42, 'rgba(5,6,8,0.66)');
    diagonal.addColorStop(1, 'rgba(5,6,8,0.35)');
    ctx.fillStyle = diagonal;
    ctx.fillRect(0, 0, W, H);

    const bottom = ctx.createLinearGradient(0, H, 0, H * 0.58);
    bottom.addColorStop(0, 'rgba(5,6,8,0.85)');
    bottom.addColorStop(1, 'rgba(5,6,8,0)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, 0, W, H);
  }

  const logo = await loadImage(config.logoUrl);

  /* ---- email badge: a horizontal signature ---- */

  if (isBadge) {
    const pad = 44 * u;
    const leftW = 260 * u;
    let y = pad;

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = font(46 * u);
    ctx.fillText('BOARD', pad, pad + 40 * u);

    ctx.fillStyle = 'rgba(241,241,228,0.7)';
    ctx.font = font(20 * u, 400);
    ctx.fillText('MONACO 2027', pad, pad + 74 * u);

    if (logo) {
      const maxH = 70 * u;
      const maxW = leftW;
      const scale = Math.min(maxW / logo.width, maxH / logo.height);
      ctx.drawImage(logo, pad, pad + 100 * u, logo.width * scale, logo.height * scale);
    }

    ctx.strokeStyle = 'rgba(241,241,228,0.2)';
    ctx.lineWidth = Math.max(1, u);
    ctx.beginPath();
    ctx.moveTo(pad + leftW + 30 * u, pad);
    ctx.lineTo(pad + leftW + 30 * u, H - pad);
    ctx.stroke();

    const x = pad + leftW + 66 * u;
    const textW = W - x - pad;
    y = pad + 34 * u;

    ctx.fillStyle = AMBER;
    ctx.font = font(21 * u, 400);
    ctx.fillText(config.eyebrow.toUpperCase(), x, y);

    y += 52 * u;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = font(46 * u);
    wrap(ctx, config.headline, textW, 1).forEach((line) => {
      ctx.fillText(line, x, y);
      y += 52 * u;
    });

    y += 6 * u;
    ctx.fillStyle = BONE;
    ctx.font = font(24 * u);
    wrap(ctx, config.detail, textW, 2).forEach((line) => {
      ctx.fillText(line, x, y);
      y += 32 * u;
    });

    y += 16 * u;
    ctx.fillStyle = AQUA;
    ctx.font = font(24 * u, 400);
    ctx.fillText(config.url, x, y);
    const urlW = ctx.measureText(config.url).width;

    ctx.fillStyle = 'rgba(241,241,228,0.85)';
    ctx.fillText(`  ·  ${config.tagline}`, x + urlW, y);

    return canvas;
  }

  /* ---- square, banner and story share one column layout ---- */

  const pad = isBanner ? 58 * u : 76 * u;
  const contentW = W - pad * 2;

  // header: BOARD lockup left, partner logo right
  ctx.fillStyle = '#FFFFFF';
  ctx.font = font(isBanner ? 40 * u : 46 * u);
  ctx.fillText('BOARD', pad, pad + (isBanner ? 34 : 40) * u);

  const boardW = ctx.measureText('BOARD').width;
  ctx.fillStyle = 'rgba(241,241,228,0.7)';
  ctx.font = font(18 * u, 400);
  ctx.fillText('MONACO 2027', pad + boardW + 22 * u, pad + (isBanner ? 30 : 34) * u);

  if (logo) {
    const maxH = (isBanner ? 66 : 92) * u;
    const maxW = 400 * u;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const lw = logo.width * scale;
    const lh = logo.height * scale;
    ctx.drawImage(logo, W - pad - lw, pad, lw, lh);
  }

  /* ---- footer first, so the body knows where it must stop ---- */

  const footerY = H - pad;

  ctx.strokeStyle = 'rgba(241,241,228,0.25)';
  ctx.lineWidth = Math.max(1, u);
  ctx.beginPath();
  ctx.moveTo(pad, footerY - 46 * u);
  ctx.lineTo(W - pad, footerY - 46 * u);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = font((isBanner ? 22 : 26) * u, 400);
  ctx.textAlign = 'left';
  ctx.fillText(config.url, pad, footerY);

  ctx.fillStyle = AQUA;
  ctx.font = font((isBanner ? 20 : 23) * u, 400);
  ctx.textAlign = 'right';
  ctx.fillText(config.tagline.toUpperCase(), W - pad, footerY);
  ctx.textAlign = 'left';

  /* ---- body, measured upward from the footer ---- */

  const bodyW = isBanner ? contentW * 0.62 : contentW;
  const headTop = pad + (isBanner ? 96 : 148) * u;
  // Never negative: a format too small for any of this still has to
  // draw something rather than loop to the smallest size and overlap.
  const available = Math.max(footerY - 92 * u - headTop, 60 * u);

  /**
   * Lay the block out at a given type scale.
   *
   * The graphic has to hold whatever the partner types, and a
   * LinkedIn banner is barely a quarter as tall as it is wide — so
   * rather than trusting one set of sizes, the block is measured and
   * the type shrunk until it fits. Text running under the header or
   * off the bottom would be worse than text a little smaller.
   */
  function layout(scale: number) {
    const headSize = (isBanner ? 54 : isStory ? 62 : 82) * u * scale;
    const subSize = (isBanner ? 26 : 32) * u * scale;
    const eyebrowSize = 22 * u * scale;
    const detailSize = 24 * u * scale;

    ctx!.font = font(headSize);
    const headLines = wrap(ctx!, config.headline.toUpperCase(), bodyW, isBanner ? 2 : 3);

    ctx!.font = font(subSize);
    const subLines = wrap(ctx!, config.sub, bodyW, isBanner ? 2 : 4);

    const headLead = headSize * 1.06;
    const subLead = subSize * 1.4;

    const height =
      (config.eyebrow ? eyebrowSize * 2 : 0) +
      headLines.length * headLead +
      (subLines.length ? 10 * u * scale + subLines.length * subLead : 0) +
      (config.detail ? detailSize * 1.8 : 0);

    return {
      headSize,
      subSize,
      eyebrowSize,
      detailSize,
      headLines,
      subLines,
      headLead,
      subLead,
      height,
    };
  }

  let block = layout(1);
  for (let scale = 0.95; block.height > available && scale >= 0.45; scale -= 0.05) {
    block = layout(scale);
  }

  const { headSize, subSize, eyebrowSize, detailSize, headLines, subLines } = block;

  // Sits on the footer when there is room to spare, so the graphic
  // reads bottom-weighted rather than floating in the middle.
  let y = footerY - 92 * u - block.height + headSize;

  if (config.eyebrow) {
    ctx.fillStyle = AMBER;
    ctx.font = font(eyebrowSize, 400);
    ctx.fillText(config.eyebrow.toUpperCase(), pad, y - headSize + eyebrowSize);
    y += eyebrowSize * 2;
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.font = font(headSize);
  headLines.forEach((line) => {
    ctx.fillText(line, pad, y);
    y += block.headLead;
  });

  if (subLines.length) {
    y += 10 * u;
    ctx.fillStyle = BONE;
    ctx.font = font(subSize);
    subLines.forEach((line) => {
      ctx.fillText(line, pad, y);
      y += block.subLead;
    });
  }

  if (config.detail) {
    y += detailSize * 0.6;
    ctx.fillStyle = 'rgba(241,241,228,0.85)';
    ctx.font = font(detailSize, 400);
    ctx.fillText(config.detail, pad, y);
  }

  return canvas;
}

/**
 * Render and hand the file to the browser.
 *
 * Waits for fonts first: a canvas drawn before Ambit has loaded
 * silently falls back, and the download would not match the preview.
 */
export async function downloadGraphic(config: GraphicConfig, filename: string) {
  if (document.fonts?.ready) await document.fonts.ready;

  const canvas = await drawGraphic(config);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (!blob) throw new Error('The image could not be created.');

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Freed on the next tick so the click has taken the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
