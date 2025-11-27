import * as Cesium from 'cesium'

export const configureCamera = (viewerInstance) => {
  const controller = viewerInstance.scene.screenSpaceCameraController
  controller.minimumZoomDistance = 0
  controller.maximumZoomDistance = 30000
  viewerInstance.scene.camera.constrainedAxis = Cesium.Cartesian3.UNIT_Z
}

export const getCurrentCameraParams = (viewer) => {
  if (!viewer) return null;

  const camera = viewer.camera;
  const position = camera.position;
  const cartographic = Cesium.Cartographic.fromCartesian(position);

  return {
    position: {
      x: position.x,
      y: position.y,
      z: position.z,
      longitude: Cesium.Math.toDegrees(cartographic.longitude),
      latitude: Cesium.Math.toDegrees(cartographic.latitude),
      height: cartographic.height
    },
    orientation: {
      heading: Cesium.Math.toDegrees(camera.heading),
      pitch: Cesium.Math.toDegrees(camera.pitch),
      roll: Cesium.Math.toDegrees(camera.roll)
    }
  };
};

export const getFlyToOptions = (options) => ({
  duration: options.duration || (options.isRegion ? 1.5 : 2),
  orientation: {
    heading: Cesium.Math.toRadians(options.heading || 0),
    pitch: Cesium.Math.toRadians(options.pitch || (options.isRegion ? -30 : -45)),
    roll: Cesium.Math.toRadians(options.roll || 0)
  },
  easingFunction: options.easingFunction || Cesium.EasingFunction.CUBIC_IN_OUT,
  convert: options.convert || true
})

export const flyToRegion = (viewer, region) => {
  console.log('flyToRegion', region);
  
  if (!viewer || !region) return

  try {
    if (region.coordinates?.length >= 2) {
      const [longitude, latitude] = region.coordinates
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 500),
        ...getFlyToOptions({ ...region, isRegion: true })
      })
    } else {
      console.warn('无效的区域坐标数据:', region)
    }
  } catch (error) {
    console.error('视角切换失败:', error)
  }
}

export const flyToRectangle = (viewer, region) => {
  if (!viewer || !region) return

  try {
    const rectangle = Cesium.Rectangle.fromDegrees(
      region.west, region.south, region.east, region.north
    )
    viewer.camera.flyTo({
      destination: rectangle,
      ...getFlyToOptions({ ...region, isRegion: false })
    })
  } catch (error) {
    console.error('视角切换失败:', error)
  }
}