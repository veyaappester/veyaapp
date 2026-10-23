/**
 * Image clean-up before OCR, written as pure functions on grey pixel arrays so the
 * exact same steps run in the browser (via canvas) and in the Node OCR test.
 */

export interface GrayImage {
  width: number;
  height: number;
  data: Uint8ClampedArray; // one byte per pixel, 0 = black, 255 = white
}

export function rgbaToGray(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number): GrayImage {
  const data = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; p < data.length; i += 4, p++) {
    data[p] = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
  }
  return { width, height, data };
}

/** Applies an EXIF orientation (1–8) so the receipt is upright. */
export function applyOrientation(img: GrayImage, orientation: number): GrayImage {
  if (orientation <= 1 || orientation > 8) return img;
  const { width: w, height: h, data } = img;
  const swap = orientation >= 5;
  const W = swap ? h : w;
  const H = swap ? w : h;
  const out = new Uint8ClampedArray(W * H);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let nx: number, ny: number;
      switch (orientation) {
        case 2: nx = w - 1 - x; ny = y; break;
        case 3: nx = w - 1 - x; ny = h - 1 - y; break;
        case 4: nx = x; ny = h - 1 - y; break;
        case 5: nx = y; ny = x; break;
        case 6: nx = h - 1 - y; ny = x; break;
        case 7: nx = h - 1 - y; ny = w - 1 - x; break;
        default: nx = y; ny = w - 1 - x; break; // 8
      }
      out[ny * W + nx] = data[y * w + x];
    }
  }
  return { width: W, height: H, data: out };
}

/** Scales so the long side is `target` px: area averaging down, bilinear up. */
export function resizeLong(img: GrayImage, target: number): GrayImage {
  const scale = target / Math.max(img.width, img.height);
  if (Math.abs(scale - 1) < 0.02) return img;
  const W = Math.max(1, Math.round(img.width * scale));
  const H = Math.max(1, Math.round(img.height * scale));
  const out = new Uint8ClampedArray(W * H);
  const { width: w, height: h, data } = img;
  if (scale < 1) {
    const fx = w / W;
    const fy = h / H;
    for (let y = 0; y < H; y++) {
      const y0 = Math.floor(y * fy);
      const y1 = Math.max(y0 + 1, Math.floor((y + 1) * fy));
      for (let x = 0; x < W; x++) {
        const x0 = Math.floor(x * fx);
        const x1 = Math.max(x0 + 1, Math.floor((x + 1) * fx));
        let sum = 0;
        for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) sum += data[yy * w + xx];
        out[y * W + x] = sum / ((y1 - y0) * (x1 - x0));
      }
    }
  } else {
    for (let y = 0; y < H; y++) {
      const sy = Math.min(h - 1, (y + 0.5) / scale - 0.5);
      const y0 = Math.max(0, Math.floor(sy));
      const y1 = Math.min(h - 1, y0 + 1);
      const fy = sy - y0;
      for (let x = 0; x < W; x++) {
        const sx = Math.min(w - 1, (x + 0.5) / scale - 0.5);
        const x0 = Math.max(0, Math.floor(sx));
        const x1 = Math.min(w - 1, x0 + 1);
        const fx = sx - x0;
        const top = data[y0 * w + x0] * (1 - fx) + data[y0 * w + x1] * fx;
        const bottom = data[y1 * w + x0] * (1 - fx) + data[y1 * w + x1] * fx;
        out[y * W + x] = top * (1 - fy) + bottom * fy;
      }
    }
  }
  return { width: W, height: H, data: out };
}

export function crop(img: GrayImage, x: number, y: number, w: number, h: number): GrayImage {
  const out = new Uint8ClampedArray(w * h);
  for (let row = 0; row < h; row++) out.set(img.data.subarray((y + row) * img.width + x, (y + row) * img.width + x + w), row * w);
  return { width: w, height: h, data: out };
}

/** Otsu's threshold: the grey level that best separates dark and light pixels. */
export function otsu(data: Uint8ClampedArray): number {
  const hist = new Array<number>(256).fill(0);
  for (const v of data) hist[v]++;
  const total = data.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/**
 * Finds the light receipt on a darker background and crops to it: Otsu on a small
 * copy, largest bright connected region, its bounding box plus a small margin.
 * Leaves the image untouched when there is no clear dark background.
 */
export function cropToReceipt(img: GrayImage): { image: GrayImage; cropped: boolean } {
  const small = resizeLong(img, 320);
  const { width: w, height: h, data } = small;
  const t = otsu(data);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < data.length; i++) mask[i] = data[i] > t ? 1 : 0;

  // Close small dark gaps (text) so the receipt is one region: dilate bright pixels 2 px.
  const filled = new Uint8Array(mask);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) continue;
      let bright = 0;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const yy = y + dy;
          const xx = x + dx;
          if (yy >= 0 && yy < h && xx >= 0 && xx < w && mask[yy * w + xx]) bright++;
        }
      if (bright >= 13) filled[y * w + x] = 1;
    }
  }

  const label = new Int32Array(w * h).fill(-1);
  let bestArea = 0;
  let box = { x0: 0, y0: 0, x1: w - 1, y1: h - 1 };
  const stack: number[] = [];
  for (let start = 0; start < filled.length; start++) {
    if (!filled[start] || label[start] !== -1) continue;
    let area = 0;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    stack.push(start);
    label[start] = start;
    while (stack.length) {
      const p = stack.pop()!;
      area++;
      const x = p % w;
      const y = (p - x) / w;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (const q of [p - 1, p + 1, p - w, p + w]) {
        if (q < 0 || q >= filled.length || !filled[q] || label[q] !== -1) continue;
        if ((q === p - 1 && x === 0) || (q === p + 1 && x === w - 1)) continue;
        label[q] = start;
        stack.push(q);
      }
    }
    if (area > bestArea) {
      bestArea = area;
      box = { x0, y0, x1, y1 };
    }
  }

  const boxArea = (box.x1 - box.x0 + 1) * (box.y1 - box.y0 + 1);
  const share = boxArea / (w * h);
  // No dark surroundings (already cropped / white table) or no clear receipt: keep everything.
  if (share > 0.92 || share < 0.08) return { image: img, cropped: false };

  const sx = img.width / w;
  const sy = img.height / h;
  const mx = Math.round((box.x1 - box.x0) * 0.02 * sx);
  const my = Math.round((box.y1 - box.y0) * 0.01 * sy);
  const x = Math.max(0, Math.floor(box.x0 * sx) - mx);
  const y = Math.max(0, Math.floor(box.y0 * sy) - my);
  const x2 = Math.min(img.width, Math.ceil((box.x1 + 1) * sx) + mx);
  const y2 = Math.min(img.height, Math.ceil((box.y1 + 1) * sy) + my);
  return { image: crop(img, x, y, x2 - x, y2 - y), cropped: true };
}

/** Contrast stretch: maps the 1st–99th percentile to black–white. */
export function normalize(img: GrayImage): GrayImage {
  const hist = new Array<number>(256).fill(0);
  for (const v of img.data) hist[v]++;
  const n = img.data.length;
  let lo = 0;
  let hi = 255;
  for (let acc = 0, i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= n * 0.01) {
      lo = i;
      break;
    }
  }
  for (let acc = 0, i = 255; i >= 0; i--) {
    acc += hist[i];
    if (acc >= n * 0.01) {
      hi = i;
      break;
    }
  }
  if (hi - lo < 10) return img;
  const out = new Uint8ClampedArray(n);
  const k = 255 / (hi - lo);
  for (let i = 0; i < n; i++) out[i] = (img.data[i] - lo) * k;
  return { ...img, data: out };
}

/**
 * Adaptive threshold (Bradley–Roth): a pixel turns black when it is clearly darker
 * than the mean of its neighbourhood. Handles shadows and uneven light on photos.
 */
export function binarize(img: GrayImage, window = 0, t = 0.15): GrayImage {
  const { width: w, height: h, data } = img;
  const s = window || Math.max(15, Math.round(w / 24) | 1);
  const half = s >> 1;
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 1; y <= h; y++) {
    let row = 0;
    for (let x = 1; x <= w; x++) {
      row += data[(y - 1) * w + (x - 1)];
      integral[y * (w + 1) + x] = integral[(y - 1) * (w + 1) + x] + row;
    }
  }
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - half);
    const y1 = Math.min(h, y + half + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - half);
      const x1 = Math.min(w, x + half + 1);
      const count = (y1 - y0) * (x1 - x0);
      const sum = integral[y1 * (w + 1) + x1] - integral[y0 * (w + 1) + x1] - integral[y1 * (w + 1) + x0] + integral[y0 * (w + 1) + x0];
      out[y * w + x] = data[y * w + x] * count <= sum * (1 - t) ? 0 : 255;
    }
  }
  return { width: w, height: h, data: out };
}

/** Rotates around the centre by `degrees` (positive = clockwise), filling with white. */
export function rotate(img: GrayImage, degrees: number): GrayImage {
  if (Math.abs(degrees) < 0.05) return img;
  const { width: w, height: h, data } = img;
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Inverse mapping: where does this output pixel come from?
      const sx = cos * (x - cx) + sin * (y - cy) + cx;
      const sy = -sin * (x - cx) + cos * (y - cy) + cy;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      if (x0 < 0 || y0 < 0 || x0 >= w - 1 || y0 >= h - 1) {
        out[y * w + x] = 255;
        continue;
      }
      const fx = sx - x0;
      const fy = sy - y0;
      const i = y0 * w + x0;
      out[y * w + x] = (data[i] * (1 - fx) + data[i + 1] * fx) * (1 - fy) + (data[i + w] * (1 - fx) + data[i + w + 1] * fx) * fy;
    }
  }
  return { width: w, height: h, data: out };
}

/**
 * Estimates how many degrees the text is tilted: the angle whose rotation makes the
 * horizontal ink profile sharpest (text lines line up with pixel rows).
 */
export function estimateSkew(img: GrayImage, maxDegrees = 8): number {
  const small = binarize(normalize(resizeLong(img, 700)));
  let best = 0;
  let bestScore = -1;
  const scoreAt = (deg: number) => {
    const r = rotate(small, deg);
    let score = 0;
    let prev = 0;
    for (let y = 0; y < r.height; y++) {
      let ink = 0;
      for (let x = 0; x < r.width; x++) if (r.data[y * r.width + x] === 0) ink++;
      score += (ink - prev) ** 2;
      prev = ink;
    }
    return score;
  };
  for (let deg = -maxDegrees; deg <= maxDegrees; deg += 1) {
    const s = scoreAt(deg);
    if (s > bestScore) [best, bestScore] = [deg, s];
  }
  for (let deg = best - 0.75; deg <= best + 0.75; deg += 0.25) {
    const s = scoreAt(deg);
    if (s > bestScore) [best, bestScore] = [deg, s];
  }
  return best;
}

export const OCR_LONG_SIDE = 1800;

export interface PreparedImages {
  /** Cropped, scaled, grey and contrast-stretched. */
  gray: GrayImage;
  /** Same, then adaptively thresholded to black/white. */
  binary: GrayImage;
  cropped: boolean;
  /** Degrees the photo was rotated to straighten the text lines. */
  skew: number;
}

/** The full clean-up: crop away the background, straighten, scale to ~1800 px, grey, more contrast. */
export function prepareForOcr(img: GrayImage): PreparedImages {
  const { image, cropped } = cropToReceipt(img);
  const skew = estimateSkew(image);
  const gray = normalize(resizeLong(rotate(image, skew), OCR_LONG_SIDE));
  return { gray, binary: binarize(gray), cropped, skew };
}
