import { getColormap, sampleColormap, valueToNormalized } from './colormaps';

const TEXTURE_SIZE = 256;
const OVERLAY_ALPHA = 0.72;

function bilinear(grid, x, y) {
  const { width, height, values } = grid;
  const fx = x * (width - 1);
  const fy = y * (height - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;

  const v00 = values[y0 * width + x0];
  const v10 = values[y0 * width + x1];
  const v01 = values[y1 * width + x0];
  const v11 = values[y1 * width + x1];

  const samples = [
    [v00, 1 - tx, 1 - ty],
    [v10, tx, 1 - ty],
    [v01, 1 - tx, ty],
    [v11, tx, ty],
  ];

  let sum = 0;
  let wsum = 0;
  for (const [v, wx, wy] of samples) {
    if (!Number.isFinite(v)) continue;
    const w = wx * wy;
    sum += v * w;
    wsum += w;
  }
  return wsum > 0 ? sum / wsum : NaN;
}

/**
 * 格点场 → RGBA Canvas（双线性插值 + 固定色标）
 * @param {{ width, height, values, west, east, south, north }} grid
 * @param {string} product
 * @returns {HTMLCanvasElement}
 */
export function gridToColorCanvas(grid, product) {
  const colormap = getColormap(product);
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);
  const data = imageData.data;

  for (let j = 0; j < TEXTURE_SIZE; j++) {
    for (let i = 0; i < TEXTURE_SIZE; i++) {
      const u = i / (TEXTURE_SIZE - 1);
      const v = j / (TEXTURE_SIZE - 1);
      const value = bilinear(grid, u, v);
      const idx = (j * TEXTURE_SIZE + i) * 4;

      if (!Number.isFinite(value)) {
        data[idx + 3] = 0;
        continue;
      }

      const t = valueToNormalized(value, colormap);
      const [r, g, b, a] = sampleColormap(t, colormap.stops);
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = Math.round(a * OVERLAY_ALPHA);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export { TEXTURE_SIZE };
