import * as Cesium from 'cesium'
import request from '@/utils/request'

let districtPrimitive = null
//青岛之外加了遮罩，有区划分
export const addDistrictInfo = async (viewerInstance) => {
  try {
    const geoJSONData = await request.get('/cesium/shp/bound.geojson')
    const countiesJSONData = await request.get('/cesium/shp/counties.geojson')
    const dataSource = new Cesium.GeoJsonDataSource()
    dataSource.load(countiesJSONData, {
      stroke: Cesium.Color.WHITE,
      strokeWidth: 2,
      fill: Cesium.Color.TRANSPARENT
    })

    viewerInstance.dataSources.add(dataSource)
    createDistrictMask(viewerInstance, geoJSONData)
  } catch (error) {
    console.error('加载行政区划数据失败:', error)
  }
}

export const createDistrictMask = (viewerInstance, geoJSONData) => {
  try {
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
          new Cesium.Color(10 / 255, 25 / 255, 47 / 255, 0.9)
        )
      }
    })

    districtPrimitive = new Cesium.GroundPrimitive({
      geometryInstances: instance,
      appearance: new Cesium.PerInstanceColorAppearance({ translucent: true })
    })

    viewerInstance.scene.primitives.add(districtPrimitive)
  } catch (error) {
    console.error('创建区域遮罩失败:', error)
  }
}

export const getDistrictPrimitive = () => districtPrimitive