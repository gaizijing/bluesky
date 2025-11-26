// --------- 输入：把你给的 JSON 赋给 gribJson ---------
// const gribJson = [ { header:..., data:[...] }, { header:..., data:[...] } ];
// 我假设第0是 U，第1是 V；若顺序不同请调整。

/**
 * 双线性插值：把 src 数组 (srcW x srcH) 插值到 (dstW x dstH)
 * srcData: Float32Array or Array, 长度 = srcW*srcH，行主序 (y 从南到北，x 从西到东)
 */
function bilinearResize(srcData, srcW, srcH, dstW, dstH) {
  const dst = new Float32Array(dstW * dstH);
  const xRatio = (srcW - 1) / (dstW - 1);
  const yRatio = (srcH - 1) / (dstH - 1);

  for (let j = 0; j < dstH; j++) {
    const gy = j * yRatio;
    const y0 = Math.floor(gy);
    const y1 = Math.min(y0 + 1, srcH - 1);
    const fy = gy - y0;

    for (let i = 0; i < dstW; i++) {
      const gx = i * xRatio;
      const x0 = Math.floor(gx);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const fx = gx - x0;

      const v00 = srcData[y0 * srcW + x0];
      const v10 = srcData[y0 * srcW + x1];
      const v01 = srcData[y1 * srcW + x0];
      const v11 = srcData[y1 * srcW + x1];

      // bilinear interpolation
      const v0 = v00 * (1 - fx) + v10 * fx;
      const v1 = v01 * (1 - fx) + v11 * fx;
      const v = v0 * (1 - fy) + v1 * fy;

      dst[j * dstW + i] = v;
    }
  }
  return dst;
}

/**
 * 把 gribJson 转成 cesium-wind-layer 需要的 windData。
 * 参数:
 *   gribJson: 你给的数组（第0=U，第1=V）
 *   targetW, targetH: 目标放大分辨率（例如 60,60 或 100,100）
 */
function gribJsonToWindData(gribJson, targetW = 60, targetH = 60) {
  // 假设第0是U，第1是V
  const uObj = gribJson[0];
  const vObj = gribJson[1];
  const hdr = uObj.header;

  const srcW = hdr.nx;
  const srcH = hdr.ny;

  // 原始数组（可能是普通数组）
  const uRaw = Float32Array.from(uObj.data);
  const vRaw = Float32Array.from(vObj.data);

  // 如果原始数据的顺序不是行主序（南->北；西->东），根据你数据源调整这里。
  //（多数 GRIB->json 工具会按行主序输出，这里假设一致）
  // 双线性插值到目标分辨率
  const uResized = bilinearResize(uRaw, srcW, srcH, targetW, targetH);
  const vResized = bilinearResize(vRaw, srcW, srcH, targetW, targetH);

  // 求 min/max（可选）
  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  for (let k = 0; k < uResized.length; k++) {
    const uu = uResized[k], vv = vResized[k];
    if (uu < uMin) uMin = uu;
    if (uu > uMax) uMax = uu;
    if (vv < vMin) vMin = vv;
    if (vv > vMax) vMax = vv;
  }

  const bounds = {
    west: hdr.lo1,
    south: hdr.la1,
    east: hdr.lo2,
    north: hdr.la2
  };

  const windData = {
    u: { array: uResized, min: uMin, max: uMax },
    v: { array: vResized, min: vMin, max: vMax },
    width: targetW,
    height: targetH,
    bounds
  };

  return windData;
}

// ----------------- 导出函数 -----------------
export { gribJsonToWindData };

// ----------------- 用法示例 -----------------
// 假设 `gribJson` 就是你发的两个对象数组
// 比如 target 60x60
// const windData = gribJsonToWindData(gribJson, 60, 60);

// 然后把 windData 传给 WindLayer
/*
import { WindLayer } from 'cesium-wind-layer';
import { gribJsonToWindData } from './windDataUtil.js';
const windLayer = new WindLayer(viewer, windData, {
  particlesTextureSize: 128, // 粒子数量 = 128^2
  particleHeight: 500,
  lineLength: { min: 10, max: 40 },
  speedFactor: 1.0,
  dropRate: 0.003,
  colors: ['#ffffff'],
  flipY: false
});
windLayer.add();
windLayer.zoomTo();
*/

