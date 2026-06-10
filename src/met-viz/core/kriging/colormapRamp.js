import { getColormap, sampleColormap } from '../colormaps';

function rgbaToHex([r, g, b]) {
  const toHex = (n) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** 将 MetViz 固定色标展开为 Kriging plot 用的 hex 色带 */
export function buildColormapRamp(product, steps = 64) {
  const colormap = getColormap(product);
  const colors = [];
  for (let i = 0; i < steps; i++) {
    const t = i / Math.max(steps - 1, 1);
    colors.push(rgbaToHex(sampleColormap(t, colormap.stops)));
  }
  return { colors, zlim: [colormap.vmin, colormap.vmax] };
}
