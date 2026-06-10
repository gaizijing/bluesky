import * as Cesium from 'cesium';

/**
 * 将格点纹理贴到区域矩形（Ventusky 式连续填色）
 */
export function createGridFieldImageryLayer(viewer) {
  let entity = null;
  let visible = true;

  const removeEntity = () => {
    if (entity && viewer && !viewer.isDestroyed()) {
      viewer.entities.remove(entity);
    }
    entity = null;
  };

  return {
    /**
     * @param {HTMLCanvasElement|string} image
     * @param {{ west, south, east, north }} bounds
     */
    setImage(image, bounds) {
      if (!viewer || viewer.isDestroyed()) return;
      removeEntity();

      const { west, south, east, north } = bounds;
      if (
        !Number.isFinite(west) ||
        !Number.isFinite(east) ||
        !Number.isFinite(south) ||
        !Number.isFinite(north)
      ) {
        return;
      }

      entity = viewer.entities.add({
        show: visible,
        rectangle: {
          coordinates: Cesium.Rectangle.fromDegrees(west, south, east, north),
          material: new Cesium.ImageMaterialProperty({
            image,
            transparent: true,
          }),
          height: 1,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          classificationType: Cesium.ClassificationType.BOTH,
        },
      });
    },

    setVisible(v) {
      visible = Boolean(v);
      if (entity) entity.show = visible;
    },

    clear() {
      removeEntity();
    },

    destroy() {
      removeEntity();
    },
  };
}
