import * as Cesium from 'cesium'
import h337 from 'heatmap.js';
import { useHeatmapStore } from '@/store/modules/heatmap';
import { useLayerSettingsStore } from '@/store/modules/layerSettings';
import { watch } from 'vue';
import { getCitywideHeatmap, getWeatherHeatmapGeo } from '@/api';
/**
 * 👉 加载热力图数据（根据当前模式）
 */
const loadHeatmapData = async (heatmapMode, currentPointId = null) => {
  try {
    let heatmapData = null;
    
    if (heatmapMode === 'citywide') {
      const response = await getCitywideHeatmap();
    
      if (response) {
        heatmapData = {
          points: response.points
        };
      } 
    } else {
      // 区域模式 - 使用API获取区域热力图数据
      if (currentPointId) {
        const response = await getWeatherHeatmapGeo({
          pointId: currentPointId,
          time: new Date()
        });
        
        if (response && response.data && response.data.points) {
          heatmapData = {
            points: response.data.points
          };
        } 
      } 
    }
    
    return heatmapData;
  } catch (error) {
    console.error('[热力图] 加载热力图数据失败:', error);
  }
};

/**
 * 👉 生成热力图
 */
export const initHeatVolume = async (viewer) => {
  try {
    const heatmapStore = useHeatmapStore();
    const layerSettingsStore = useLayerSettingsStore();
    
    const data = heatmapStore.heatmapData;
    
    // 创建3D热力图
    let heatMapInstance;
    let heatmapPoints = [];
    
    // 如果有数据，转换数据格式
    if(data && data.points && Array.isArray(data.points)) {
      heatmapPoints = data.points.map(point => ({
        lnglat: [point.lon, point.lat],
        value: point.value
      }));
    } else {
      // 如果没有数据，使用默认的空数据
      heatmapPoints = [];
    }

    // 创建3D热力图
    heatMapInstance = create3DHeatmap(viewer, {
      dataPoints: heatmapPoints,
      radius: 15,
      baseElevation: 100,
      primitiveType: "TRIANGLES",
      colorGradient: {
        ".3": "blue",
        ".5": "green",
        ".7": "yellow",
        ".95": "red",
      },
    });
    
    // 存储热力图实例到store（关键修复）
    if (heatMapInstance) {
      heatmapStore.setHeatmapLayer(heatMapInstance);
    }
    
    // 监听热力图数据变化，使用updateData方法更新热力图
    if (heatMapInstance) {
      watch(
        [
          () => heatmapStore.heatmapData, 
          () => layerSettingsStore.layers.temperature?.visible,
          () => heatmapStore.heatmapMode,  // 监听模式变化
          () => heatmapStore.currentPointId  // 新增：监听区域ID变化
        ],
        async ([newData, isHeatmapVisible, newMode, newPointId], [oldData, oldVisible, oldMode, oldPointId]) => {
          // 1. 模式变化时处理数据（优先级最高）
          if (newMode !== oldMode) {
            try {
              // 销毁当前热力图实例，避免叠加绘制
              const currentInstance = heatmapStore.heatmapLayer;
              if (currentInstance && currentInstance.destroy) {
                currentInstance.destroy();
                heatmapStore.setHeatmapLayer(null);
              }
              
              // 加载新数据
              let heatmapData = null;
              if (newMode === 'area' && heatmapStore.lastAreaHeatmapData && 
                  heatmapStore.lastAreaPointId === newPointId) {
                heatmapData = heatmapStore.lastAreaHeatmapData;
              } else {
                // 调用API加载数据
                heatmapData = await loadHeatmapData(newMode, newPointId);
              }
              
              // 如果有数据，创建新的热力图实例
              if (heatmapData && heatmapData.points && heatmapData.points.length > 0) {
                // 转换数据格式
                const heatmapPoints = heatmapData.points.map(point => ({
                  lnglat: [point.lon, point.lat],
                  value: point.value
                }));
                
                // 创建新的热力图实例
                const newHeatMapInstance = create3DHeatmap(viewer, {
                  dataPoints: heatmapPoints,
                  radius: 15,
                  baseElevation: 100,
                  primitiveType: "TRIANGLES",
                  colorGradient: {
                    ".3": "blue",
                    ".5": "green",
                    ".7": "yellow",
                    ".95": "red",
                  },
                });
                
                // 存储到store
                heatmapStore.setHeatmapLayer(newHeatMapInstance);
                // 更新store数据（确保一致性）
                heatmapStore.setHeatmapData(heatmapData);
              } else {
                // 设置空数据，避免显示旧数据
                heatmapStore.setHeatmapData(null);
              }
            } catch (error) {
              console.error('[热力图] 模式切换时处理数据失败:', error);
            }
            return; // 模式切换处理完毕，不执行下面的数据更新逻辑
          }
          
          // 2. 区域ID变化时处理（仅在区域模式下）
          if (newPointId !== oldPointId && newMode === 'area') {
            try {
              // 销毁当前实例
              const currentInstance = heatmapStore.heatmapLayer;
              if (currentInstance && currentInstance.destroy) {
                currentInstance.destroy();
                heatmapStore.setHeatmapLayer(null);
              }
              
              // 加载新数据
              let heatmapData = null;
              if (heatmapStore.lastAreaHeatmapData && heatmapStore.lastAreaPointId === newPointId) {
                heatmapData = heatmapStore.lastAreaHeatmapData;
              } else {
                heatmapData = await loadHeatmapData('area', newPointId);
              }
              
              if (heatmapData && heatmapData.points && heatmapData.points.length > 0) {
                const heatmapPoints = heatmapData.points.map(point => ({
                  lnglat: [point.lon, point.lat],
                  value: point.value
                }));
                
                const newHeatMapInstance = create3DHeatmap(viewer, {
                  dataPoints: heatmapPoints,
                  radius: 15,
                  baseElevation: 100,
                  primitiveType: "TRIANGLES",
                  colorGradient: {
                    ".3": "blue",
                    ".5": "green",
                    ".7": "yellow",
                    ".95": "red",
                  },
                });
                
                heatmapStore.setHeatmapLayer(newHeatMapInstance);
                heatmapStore.setHeatmapData(heatmapData);
              } else {
                heatmapStore.setHeatmapData(null);
              }
            } catch (error) {
              console.error('[热力图] 区域切换时处理数据失败:', error);
            }
            return; // 区域切换处理完毕
          }
          
          // 3. 同模式下数据更新（非模式切换，非区域切换）
          if (isHeatmapVisible && newData && newData.points && newData.points.length > 0) {
            // 转换数据格式
            const newHeatmapPoints = newData.points.map(point => ({
              lnglat: [point.lon, point.lat],
              value: point.value
            }));
            
            // 使用store中的热力图实例进行更新
            const instance = heatmapStore.heatmapLayer;
            if (instance && instance.updateData) {
              try {
                instance.updateData(newHeatmapPoints);
              } catch (error) {
                console.error('[热力图] 更新失败：', error);
              }
            }
          }
        },
        { deep: true }
      );
    }
    
    return heatMapInstance;
  } catch (error) {
    console.error('热力图加载失败:', error);
  }
}

export const create3DHeatmap = (viewer, options = {}) => {
  const heatmapState = {
    viewer,
    options,
    dataPoints: options.dataPoints || [],
    containerElement: undefined,
    instanceId: Number(
      `${new Date().getTime()}${Number(Math.random() * 1000).toFixed(0)}`
    ),
    canvasWidth: 200,
    boundingBox: undefined,
    boundingRect: {},
    xAxis: undefined,
    yAxis: undefined,
    xAxisLength: 0,
    yAxisLength: 0,
    baseElevation: options.baseElevation || 0,
    heatmapPrimitive: undefined,
    positionHierarchy: [],
    heatmapInstance: null,
    gridSize: options.canvasWidth || 200,
    heightMultiplier: options.heightMultiplier || 1000
  };

  // 如果没有数据点，创建一个空的热力图实例
  if (!heatmapState.dataPoints || heatmapState.dataPoints.length < 2) {
    console.log("热力图点位不足，创建空实例");
    
    // 创建容器
    createHeatmapContainer(heatmapState);
    
    // 创建热力图配置
    const heatmapConfig = {
      container: document.getElementById(`heatmap-${heatmapState.instanceId}`),
      radius: options.radius || 20,
      maxOpacity: 0.7,
      minOpacity: 0,
      blur: 0.75,
      gradient: options.colorGradient || {
        ".1": "blue",
        ".5": "yellow",
        ".7": "red",
        ".99": "white",
      },
    };
    
    // 创建热力图实例
    heatmapState.heatmapInstance = h337.create(heatmapConfig);
    
    // 返回一个空的实例对象，包含必要的方法
    return {
      destroy: () => {
        if (heatmapState.containerElement) {
          heatmapState.containerElement.remove();
        }
      },
      updateData: (newDataPoints) => {
        // 当数据更新时，重新创建完整的热力图
        if (newDataPoints && newDataPoints.length >= 2) {
          // 先销毁当前实例
          if (heatmapState.heatmapPrimitive) {
            heatmapState.viewer.scene.primitives.remove(heatmapState.heatmapPrimitive);
          }
          if (heatmapState.containerElement) {
            heatmapState.containerElement.remove();
          }
          
          // 重新创建热力图
          return create3DHeatmap(viewer, {
            ...options,
            dataPoints: newDataPoints
          });
        }
      }
    };
  }

  createHeatmapContainer(heatmapState);

  const heatmapConfig = {
    container: document.getElementById(`heatmap-${heatmapState.instanceId}`),
    radius: options.radius || 20,
    maxOpacity: 0.7,
    minOpacity: 0,
    blur: 0.75,
    gradient: options.colorGradient || {
      ".1": "blue",
      ".5": "yellow",
      ".7": "red",
      ".99": "white",
    },
  };

  heatmapState.primitiveType = options.primitiveType || "TRIANGLES";
  heatmapState.heatmapInstance = h337.create(heatmapConfig);

  initializeHeatmap(heatmapState);

  return {
    destroy: () => destroyHeatmap(heatmapState),
    heatmapState,
    updateData: (newDataPoints) => updateHeatmapData(heatmapState, newDataPoints)
  };
}

function initializeHeatmap(heatmapState) {
  for (const [index, dataPoint] of heatmapState.dataPoints.entries()) {
    const cartesianPosition = Cesium.Cartesian3.fromDegrees(
      dataPoint.lnglat[0],
      dataPoint.lnglat[1],
      0
    );
    heatmapState.positionHierarchy.push(cartesianPosition);
  }

  computeBoundingBox(heatmapState.positionHierarchy, heatmapState);

  const heatmapPoints = heatmapState.positionHierarchy.map(
    (position, index) => {
      const normalizedCoords = computeNormalizedCoordinates(
        position,
        heatmapState
      );
      return {
        x: normalizedCoords.x,
        y: normalizedCoords.y,
        value: heatmapState.dataPoints[index].value,
      };
    }
  );

  const values = heatmapPoints.map(p => p.value);
  const maxValue = values.length ? Math.max(...values) : 1;
  const minValue = values.length ? Math.min(...values) : 0;

  heatmapState.heatmapInstance.setData({
    max: maxValue,
    min: minValue,
    data: heatmapPoints
  });

  const geometryInstance = new Cesium.GeometryInstance({
    geometry: createHeatmapGeometry(heatmapState),
  });

  heatmapState.heatmapPrimitive = heatmapState.viewer.scene.primitives.add(
    new Cesium.Primitive({
    geometryInstances: geometryInstance,
    appearance: new Cesium.MaterialAppearance({
      material: new Cesium.Material({
        fabric: {
          type: "Image",
          uniforms: {
            image: heatmapState.heatmapInstance.getDataURL(),
          },
        },
      }),
      vertexShaderSource: `
      in vec3 position3DHigh;
      in vec3 position3DLow;
      in vec2 st;
      in float batchId;
      uniform sampler2D image_0; 
      out vec3 v_positionEC;
      in vec3 normal;
      out vec3 v_normalEC;
      out vec2 v_st; 
      void main(){
          vec4 p = czm_computePosition();
          
          v_normalEC = czm_normal * normal;   
          v_positionEC = (czm_modelViewRelativeToEye * p).xyz;
          vec4 positionWC=czm_inverseModelView* vec4(v_positionEC,1.0);
          v_st = st; 
          vec4 color = texture(image_0, v_st); 
          vec3 upDir = normalize(positionWC.xyz); 
          p += vec4(color.r *upDir * 1000., 0.0); 
          gl_Position = czm_modelViewProjectionRelativeToEye * p; 
      }`,
      translucent: true,
      flat: true,
    }),
      asynchronous: false,
      show: true
    })
  );
  heatmapState.heatmapPrimitive.id = "heatmap3d";
}

function destroyHeatmap(heatmapState) {
  const containerElement = document.getElementById(
    `heatmap-${heatmapState.instanceId}`
  );
  if (containerElement) containerElement.remove();
  if (heatmapState.heatmapPrimitive) {
      heatmapState.viewer.scene.primitives.remove(heatmapState.heatmapPrimitive);
    heatmapState.heatmapPrimitive = undefined;
  }
}

function computeNormalizedCoordinates(position, heatmapState) {
  if (!position) return;
  const cartographic = Cesium.Cartographic.fromCartesian(position.clone());
  cartographic.height = 0;
  position = Cesium.Cartographic.toCartesian(cartographic.clone());

  const originVector = Cesium.Cartesian3.subtract(
    position.clone(),
    heatmapState.boundingBox.leftTop,
    new Cesium.Cartesian3()
  );
  const xOffset = Cesium.Cartesian3.dot(originVector, heatmapState.xAxis);
  const yOffset = Cesium.Cartesian3.dot(originVector, heatmapState.yAxis);

  return {
    x: Number(
      (xOffset / heatmapState.xAxisLength) * heatmapState.canvasWidth
    ).toFixed(0),
    y: Number(
      (yOffset / heatmapState.yAxisLength) * heatmapState.canvasWidth
    ).toFixed(0),
  };
}

function cartesiansToLnglats(cartesians, viewer) {
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

function cartesianToLnglat(cartesian, viewer) {
  if (!cartesian) return [];
  viewer = viewer || window.viewer;
  var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  var latitude = Cesium.Math.toDegrees(cartographic.latitude);
  var longitude = Cesium.Math.toDegrees(cartographic.longitude);
  var height = cartographic.height;
  return [longitude, latitude, height];
}

function computeBoundingBox(positions, heatmapState) {
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

function createHeatmapGeometry(heatmapState) {
  const meshData = generateMeshData(heatmapState);
  const geometry = new Cesium.Geometry({
    attributes: new Cesium.GeometryAttributes({
      position: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: meshData.positions,
      }),
      st: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        values: new Float32Array(meshData.textureCoords),
      }),
    }),
    indices: new Uint16Array(meshData.indices),
    primitiveType: Cesium.PrimitiveType[heatmapState.primitiveType],
    boundingSphere: Cesium.BoundingSphere.fromVertices(meshData.positions),
  });
  return geometry;
}

function generateMeshData(heatmapState) {
  const gridWidth = heatmapState.canvasWidth || 200;
  const gridHeight = heatmapState.canvasWidth || 200;
  const { maxLongitude, maxLatitude, minLongitude, minLatitude } = 
    heatmapState.boundingRect;

  const longitudeStep = (maxLongitude - minLongitude) / gridWidth;
  const latitudeStep = (maxLatitude - minLatitude) / gridHeight;
  const positions = [];
  const textureCoords = [];
  const indices = [];

  for (let i = 0; i < gridWidth; i++) {
    const currentLongitude = minLongitude + longitudeStep * i;

    for (let j = 0; j < gridHeight; j++) {
      const currentLatitude = minLatitude + latitudeStep * j;
      const heatValue = heatmapState.heatmapInstance.getValueAt({
        x: i,
        y: j,
      });
      const cartesian3 = Cesium.Cartesian3.fromDegrees(
        currentLongitude,
        currentLatitude,
        heatmapState.baseElevation + heatValue
      );
      positions.push(cartesian3.x, cartesian3.y, cartesian3.z);
      textureCoords.push(i / gridWidth, j / gridHeight);
      if (j !== gridHeight - 1 && i !== gridWidth - 1) {
        indices.push(
          i * gridHeight + j,
          i * gridHeight + j + 1,
          (i + 1) * gridHeight + j
        );
        indices.push(
          (i + 1) * gridHeight + j,
          (i + 1) * gridHeight + j + 1,
          i * gridHeight + j + 1
        );
      }
    }
  }

  return {
    positions,
    textureCoords,
    indices,
  };
}

function createHeatmapContainer(heatmapState) {
  heatmapState.containerElement = window.document.createElement("div");
  heatmapState.containerElement.id = `heatmap-${heatmapState.instanceId}`;
  heatmapState.containerElement.className = `heatmap`;
  heatmapState.containerElement.style.width = `${heatmapState.canvasWidth}px`;
  heatmapState.containerElement.style.height = `${heatmapState.canvasWidth}px`;
  heatmapState.containerElement.style.position = "absolute";
  heatmapState.containerElement.style.top = "-9999px";
  heatmapState.containerElement.style.left = "-9999px";
  document.body.appendChild(heatmapState.containerElement);
}

/**
 * 更新热力图数据
 * @param {Object} heatmapState - 热力图状态对象
 * @param {Array} newDataPoints - 新的数据点数组，格式：[{lnglat: [lon, lat], value: number}, ...]
 */
export function updateHeatmapData(heatmapState, newDataPoints) {
  if (!heatmapState || !newDataPoints || newDataPoints.length < 2) {
    console.log("热力图更新失败：数据点不足或状态无效");
    return;
  }

  console.log('热力图更新数据点数量:', newDataPoints.length);
  console.log('热力图数据点示例:', newDataPoints.slice(0, 3));

  // 1. 更新数据点
  heatmapState.dataPoints = newDataPoints;
  
  // 2. 重新计算位置层次结构，确保使用新的数据点位置
  heatmapState.positionHierarchy = [];
  for (const [index, dataPoint] of heatmapState.dataPoints.entries()) {
    const cartesianPosition = Cesium.Cartesian3.fromDegrees(
      dataPoint.lnglat[0],
      dataPoint.lnglat[1],
      0
    );
    heatmapState.positionHierarchy.push(cartesianPosition);
  }

  // 3. 重新计算边界框
  computeBoundingBox(heatmapState.positionHierarchy, heatmapState);
  
  // 4. 转换数据格式为热力图所需格式
  const heatmapPoints = heatmapState.positionHierarchy.map(
    (position, index) => {
      const normalizedCoords = computeNormalizedCoordinates(
        position,
        heatmapState
      );
      return {
        x: normalizedCoords.x,
        y: normalizedCoords.y,
        value: heatmapState.dataPoints[index].value,
      };
    }
  );

  // 5. 更新热力图数据范围
  const values = heatmapPoints.map(p => p.value);
  const maxValue = values.length ? Math.max(...values) : 1;
  const minValue = values.length ? Math.min(...values) : 0;

  console.log('热力图数据范围:', { min: minValue, max: maxValue });

  // 6. 设置新数据到热力图实例
  heatmapState.heatmapInstance.setData({
    max: maxValue,
    min: minValue,
    data: heatmapPoints
  });

  // 7. 重新创建图元，确保位置和范围正确更新
  if (heatmapState.heatmapPrimitive) {
    heatmapState.viewer.scene.primitives.remove(heatmapState.heatmapPrimitive);
  }

  // 创建新的图元
  const geometryInstance = new Cesium.GeometryInstance({
    geometry: createHeatmapGeometry(heatmapState),
  });

  heatmapState.heatmapPrimitive = heatmapState.viewer.scene.primitives.add(
    new Cesium.Primitive({
    geometryInstances: geometryInstance,
    appearance: new Cesium.MaterialAppearance({
      material: new Cesium.Material({
        fabric: {
          type: "Image",
          uniforms: {
            image: heatmapState.heatmapInstance.getDataURL(),
          },
        },
      }),
      vertexShaderSource: `
      in vec3 position3DHigh;
      in vec3 position3DLow;
      in vec2 st;
      in float batchId;
      uniform sampler2D image_0; 
      out vec3 v_positionEC;
      in vec3 normal;
      out vec3 v_normalEC;
      out vec2 v_st; 
      void main(){
          vec4 p = czm_computePosition();
          
          v_normalEC = czm_normal * normal;   
          v_positionEC = (czm_modelViewRelativeToEye * p).xyz;
          vec4 positionWC=czm_inverseModelView* vec4(v_positionEC,1.0);
          v_st = st; 
          vec4 color = texture(image_0, v_st); 
          vec3 upDir = normalize(positionWC.xyz); 
          p += vec4(color.r *upDir * 1000., 0.0); 
          gl_Position = czm_modelViewProjectionRelativeToEye * p; 
      }`,
      translucent: true,
      flat: true,
    }),
      asynchronous: false,
      show: true
    })
  );
  heatmapState.heatmapPrimitive.id = "heatmap3d";
  
  console.log('热力图更新完成，图元已重新创建');
}