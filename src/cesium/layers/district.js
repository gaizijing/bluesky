import * as Cesium from 'cesium'
import request from '@/utils/request'

let districtPrimitive = null
//青岛之外加了遮罩，有区划分
export const addDistrictInfo = async () => {

  try {
    const geoJSONData = await request.get('/cesium/shp/bound.geojson')

    const holeList = []

    geoJSONData.features.forEach((feature) => {
      const { type, coordinates } = feature.geometry
      const processCoords = (coord) => {
        const outer = coord[0]
        const holes = coord.slice(1)
        return new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArray(outer.flat()),
          holes.map(h => new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArray(h.flat())
          ))
        )
      }

      if (type === "MultiPolygon") {
        coordinates.forEach(coord => holeList.push(processCoords(coord)))
      } else if (type === "Polygon") {
        holeList.push(processCoords(coordinates))
      }
    })

    const outerRectangle = Cesium.Cartesian3.fromDegreesArray([
      80, 15, 80, 46, 135, 46, 135, 15, 80, 15
    ])

    const instance = new Cesium.GeometryInstance({
      geometry: new Cesium.PolygonGeometry({
        polygonHierarchy: new Cesium.PolygonHierarchy(outerRectangle, holeList)
      }),
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          new Cesium.Color(10 / 255, 25 / 255, 47 / 255, 1)
        )
      }
    })

    districtPrimitive = new Cesium.GroundPrimitive({
      geometryInstances: instance,
      appearance: new Cesium.PerInstanceColorAppearance({ translucent: true })
    })

  } catch (error) {
    console.error('创建区域遮罩失败:', error)
  }
}
//边缘拉伸高度
export const loadAdministrativeArea = async (viewerInstance) => {
  try {
    // 替换为你的行政区划GeoJSON地址（如湖北省/某市的行政区数据）
    const geoJsonUrl = '/cesium/shp/bound.geojson';
    const response = await fetch(geoJsonUrl);
    const geoJsonData = await response.json();

    // 加载GeoJSON数据到Cesium
    const dataSource = await Cesium.GeoJsonDataSource.load(geoJsonData, {
      clampToGround: false // 不贴地，允许设置高度
    });
    viewerInstance.dataSources.add(dataSource);

    // 遍历每个行政区划实体，设置3D立体属性
    dataSource.entities.values.forEach(entity => {
      if (entity.polygon) {
        // 核心：设置3D高度（拉伸为立体面）
        entity.polygon.height = 0; // 底面高度（0=地面）
        entity.polygon.extrudedHeight = 3000; // 拉伸高度（300米，可按需调整）

        // 立体面样式（可选，优化视觉效果）
        entity.polygon.material = Cesium.Color.fromRandom({
          alpha: 0.5 // 随机颜色+70%不透明度，也可固定颜色（如蓝色：Cesium.Color.BLUE.withAlpha(0.7)）
        });
        entity.polygon.outline = true; // 显示区域轮廓线
        entity.polygon.outlineColor = Cesium.Color.WHITE; // 轮廓线颜色（白色）
        entity.polygon.outlineWidth = 2; // 轮廓线粗细
      }
    });

    // 使用dataSource自带的zoomTo方法，更加稳定

  } catch (error) {
    console.error('加载行政区划数据失败：', error);
  }
};
//区划分边框从阿里云上加载  https://datav.aliyun.com/portal/school/atlas/area_selector
export const addBoundGeo = (viewerInstance) => {
  // 加载GeoJSON数据
  Cesium.GeoJsonDataSource.load("https://geo.datav.aliyun.com/areas_v3/bound/370200_full.json", {
    stroke: Cesium.Color.fromCssColorString('rgba(255, 72, 0, 0)'),
    strokeWidth: 40,
  }).then((dataSource) => {

    // 将数据源添加到视图
   viewerInstance.dataSources.add(dataSource);

    // 获取所有实体
    var entities = dataSource.entities.values;

    // 遍历所有实体
    for (var entityIndex = 0; entityIndex < entities.length; entityIndex++) {
      var entity = entities[entityIndex];
      if (Cesium.defined(entity.polygon)) {
        // 设置多边形样式
        entity.polygon.material = Cesium.Color.fromRandom({
          red: 0.1,
          maximumGreen: 0.5,
          minimumBlue: 0.5,
          alpha: 1
        });

        entity.polygon.classificationType = Cesium.ClassificationType.TERRAIN;

        var hierarchy = entity.polygon.hierarchy.getValue(Cesium.JulianDate.now());
        if (hierarchy && hierarchy.positions) {
          // 计算多边形中心点和边界球
          var boundingSphere = Cesium.BoundingSphere.fromPoints(hierarchy.positions);
          var polyCenter = Cesium.Ellipsoid.WGS84.scaleToGeocentricSurface(boundingSphere.center);

          // 设置实体位置
          entity.position = polyCenter;

          // 只有当地块足够大时才显示标签（阈值：1000米）
          var isLargePolygon = boundingSphere.radius > 1000;

          // 设置标签
          entity.label = {
            text: entity.name,
            show: isLargePolygon,
            font: 'bold 14px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            showBackground: true,
            backgroundColor: new Cesium.Color(0.2, 0.2, 0.4, 0.6),
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            scale: 1.0,
            // 确保标签始终可见
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 100000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          };
        }
      }
    }
  });
}

export const getDistrictPrimitive = () => districtPrimitive