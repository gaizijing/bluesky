import * as Cesium from 'cesium';
import kriging from './kriging.js';
import { buildColormapRamp } from './colormapRamp.js';

const DEFAULT_OPTS = {
  propname: 'value',
  krigingModel: 'exponential',
  krigingSigma2: 0,
  krigingAlpha: 100,
  alpha: 0.72,
  product: 'temperature',
  heightM: 100,
};

function calcExtent(polygons) {
  const extent = {
    xMin: Infinity,
    yMin: Infinity,
    xMax: -Infinity,
    yMax: -Infinity,
  };
  for (const ring of polygons) {
    for (const [lng, lat] of ring) {
      extent.xMin = Math.min(extent.xMin, lng);
      extent.xMax = Math.max(extent.xMax, lng);
      extent.yMin = Math.min(extent.yMin, lat);
      extent.yMax = Math.max(extent.yMax, lat);
    }
  }
  return extent;
}

/**
 * 用后端格点采样做 Kriging 插值，并在指定高度渲染水平切片
 */
export function drawKrigingPrimitive(viewer, geojson, polygons, options = {}) {
  const opts = { ...DEFAULT_OPTS, ...options };
  if (!viewer) throw new Error('缺少 Cesium viewer');
  if (!geojson?.features?.length) throw new Error('缺少采样点 GeoJSON');

  const values = [];
  const lngs = [];
  const lats = [];
  geojson.features.forEach((feature) => {
    values.push(feature.properties[opts.propname]);
    lngs.push(feature.geometry.coordinates[0]);
    lats.push(feature.geometry.coordinates[1]);
  });

  if (values.length < 4) {
    throw new Error('Kriging 至少需要 4 个采样点');
  }

  const extent = calcExtent(polygons);
  if (!opts.width) {
    opts.width =
      Math.round(
        Math.min(extent.xMax - extent.xMin, extent.yMax - extent.yMin) * 10000
      ) / 10000 / 400;
  }

  const { colors, zlim } = buildColormapRamp(opts.product);
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = Math.max(
    512,
    Math.round((2048 / (extent.xMax - extent.xMin)) * (extent.yMax - extent.yMin))
  );

  const variogram = kriging.train(
    values,
    lngs,
    lats,
    opts.krigingModel,
    opts.krigingSigma2,
    opts.krigingAlpha
  );
  const grid = kriging.grid(polygons, variogram, opts.width);
  if (!grid) throw new Error('Kriging 网格生成失败');

  kriging.plot(
    canvas,
    grid,
    [extent.xMin, extent.xMax],
    [extent.yMin, extent.yMax],
    colors,
    zlim
  );

  const heightM = Number(opts.heightM);
  const primitive = viewer.scene.primitives.add(
    new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.RectangleGeometry({
          rectangle: Cesium.Rectangle.fromDegrees(
            extent.xMin,
            extent.yMin,
            extent.xMax,
            extent.yMax
          ),
          height: Number.isFinite(heightM) ? heightM : 100,
          vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
        }),
      }),
      appearance: new Cesium.EllipsoidSurfaceAppearance({ aboveGround: true }),
      show: true,
    })
  );

  primitive.appearance.material = new Cesium.Material({
    fabric: {
      type: 'Image',
      uniforms: {
        color: { alpha: opts.alpha },
        image: canvas.toDataURL('image/png'),
      },
    },
  });

  return {
    primitive,
    extent,
    stats: {
      sampleCount: values.length,
      valueMin: Math.min(...values),
      valueMax: Math.max(...values),
      gridWidth: opts.width,
      bucketTime: opts.bucketTime,
    },
  };
}

export function removeKrigingPrimitive(viewer, primitive) {
  if (viewer && primitive && !viewer.isDestroyed()) {
    viewer.scene.primitives.remove(primitive);
  }
}
