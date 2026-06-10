/**
 * 等值面填色：按数值分级，每级均匀填色（离散色斑）
 * 与连续渐变相对，边界呈阶梯状
 */
export function plotIsobands(canvas, gridData, xlim, ylim, colors, zlim, bandCount = 8) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const data = gridData.data;
  const zlimUsed = zlim ?? gridData.zlim;
  const width = gridData.width;
  const range = [xlim[1] - xlim[0], ylim[1] - ylim[0], zlimUsed[1] - zlimUsed[0]];
  const n = data.length;
  const m = data[0].length;
  const wx = Math.ceil((width * canvas.width) / (xlim[1] - xlim[0]));
  const wy = Math.ceil((width * canvas.height) / (ylim[1] - ylim[0]));
  const bands = Math.max(2, bandCount);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (data[i][j] === undefined) continue;
      const x = (canvas.width * (i * width + gridData.xlim[0] - xlim[0])) / range[0];
      const y = canvas.height * (1 - (j * width + gridData.ylim[0] - ylim[0]) / range[1]);
      let z = (data[i][j] - zlimUsed[0]) / range[2];
      z = Math.max(0, Math.min(1, z));
      const bandIdx = Math.min(bands - 1, Math.floor(z * bands));
      const t = (bandIdx + 0.5) / bands;
      ctx.fillStyle = colors[Math.floor((colors.length - 1) * t)];
      ctx.fillRect(Math.round(x - wx / 2), Math.round(y - wy / 2), wx, wy);
    }
  }
}
