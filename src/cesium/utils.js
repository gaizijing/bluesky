import * as Cesium from 'cesium'

export const cartesianToLnglat = (cartesian, viewer) => {
  if (!cartesian) return [];
  viewer = viewer || window.viewer;
  var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  var latitude = Cesium.Math.toDegrees(cartographic.latitude);
  var longitude = Cesium.Math.toDegrees(cartographic.longitude);
  var height = cartographic.height;
  return [longitude, latitude, height];
}

export const cartesiansToLnglats = (cartesians, viewer) => {
  if (!cartesians || cartesians.length < 1) return;
  viewer = viewer || window.viewer;
  if (!viewer) {
    console.log("请传入viewer对象");
    return;
  }
  var coordinates = [];
  for (var i = 0; i < cartesians.length; i++) {
    coordinates.push(cartesianToLnglat(cartesians[i], viewer));
  }
  return coordinates;
}

export const computeBoundingBox = (positions, heatmapState) => {
  if (!positions) return;
  const boundingSphere = Cesium.BoundingSphere.fromPoints(
    positions,
    new Cesium.BoundingSphere()
  );
  const centerPoint = boundingSphere.center;
  const sphereRadius = boundingSphere.radius;

  const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
    centerPoint.clone()
  );
  const modelMatrixInverse = Cesium.Matrix4.inverse(
    modelMatrix.clone(),
    new Cesium.Matrix4()
  );
  const yAxisVector = new Cesium.Cartesian3(0, 1, 0);

  const boundingVertices = [];
  for (let angle = 45; angle <= 360; angle += 90) {
    const rotationMatrix = Cesium.Matrix3.fromRotationZ(
      Cesium.Math.toRadians(angle),
      new Cesium.Matrix3()
    );
    let rotatedYAxis = Cesium.Matrix3.multiplyByVector(
      rotationMatrix,
      yAxisVector,
      new Cesium.Cartesian3()
    );
    rotatedYAxis = Cesium.Cartesian3.normalize(
      rotatedYAxis,
      new Cesium.Cartesian3()
    );
    const scaledVector = Cesium.Cartesian3.multiplyByScalar(
      rotatedYAxis,
      sphereRadius,
      new Cesium.Cartesian3()
    );
    const vertex = Cesium.Matrix4.multiplyByPoint(
      modelMatrix,
      scaledVector.clone(),
      new Cesium.Cartesian3()
    );

    boundingVertices.push(vertex);
  }

  const coordinates = cartesiansToLnglats(
    boundingVertices,
    heatmapState.viewer
  );
  let minLatitude = Number.MAX_VALUE,
    maxLatitude = Number.MIN_VALUE,
    minLongitude = Number.MAX_VALUE,
    maxLongitude = Number.MIN_VALUE;
  const vertexCount = boundingVertices.length;

  coordinates.forEach((coordinate) => {
    if (coordinate[0] < minLongitude) minLongitude = coordinate[0];
    if (coordinate[0] > maxLongitude) maxLongitude = coordinate[0];
    if (coordinate[1] < minLatitude) minLatitude = coordinate[1];
    if (coordinate[1] > maxLatitude) maxLatitude = coordinate[1];
  });

  const latitudeRange = maxLatitude - minLatitude;
  const longitudeRange = maxLongitude - minLongitude;

  heatmapState.boundingRect = {
    minLatitude: minLatitude - latitudeRange / vertexCount,
    maxLatitude: maxLatitude + latitudeRange / vertexCount,
    minLongitude: minLongitude - longitudeRange / vertexCount,
    maxLongitude: maxLongitude + longitudeRange / vertexCount,
  };

  heatmapState.boundingBox = {
    leftTop: Cesium.Cartesian3.fromDegrees(
      heatmapState.boundingRect.minLongitude,
      heatmapState.boundingRect.maxLatitude
    ),
    leftBottom: Cesium.Cartesian3.fromDegrees(
      heatmapState.boundingRect.minLongitude,
      heatmapState.boundingRect.minLatitude
    ),
    rightTop: Cesium.Cartesian3.fromDegrees(
      heatmapState.boundingRect.maxLongitude,
      heatmapState.boundingRect.maxLatitude
    ),
    rightBottom: Cesium.Cartesian3.fromDegrees(
      heatmapState.boundingRect.maxLongitude,
      heatmapState.boundingRect.minLatitude
    ),
  };

  heatmapState.xAxis = Cesium.Cartesian3.subtract(
    heatmapState.boundingBox.rightTop,
    heatmapState.boundingBox.leftTop,
    new Cesium.Cartesian3()
  );
  heatmapState.xAxis = Cesium.Cartesian3.normalize(
    heatmapState.xAxis,
    new Cesium.Cartesian3()
  );
  heatmapState.yAxis = Cesium.Cartesian3.subtract(
    heatmapState.boundingBox.leftBottom,
    heatmapState.boundingBox.leftTop,
    new Cesium.Cartesian3()
  );
  heatmapState.yAxis = Cesium.Cartesian3.normalize(
    heatmapState.yAxis,
    new Cesium.Cartesian3()
  );
  heatmapState.xAxisLength = Cesium.Cartesian3.distance(
    heatmapState.boundingBox.rightTop,
    heatmapState.boundingBox.leftTop
  );
  heatmapState.yAxisLength = Cesium.Cartesian3.distance(
    heatmapState.boundingBox.leftBottom,
    heatmapState.boundingBox.leftTop
  );
}