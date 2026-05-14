import { WindLayer } from '@/cesium/vendors/cesium-wind-layer/index.mjs';
import { watch } from 'vue';
import { useWindStore } from '@/store/modules/wind';
/**
 * 初始化风场图层
 * @param {Cesium.Viewer} viewer - Cesium Viewer实例
 * @param {Object} layerSettingsStore - 图层设置存储
 * @returns {Array<WindLayer>} 风场图层数组
 */
export const initWind = async (viewer, layerSettingsStore) => {
  const windOptions = layerSettingsStore.windOptions;
  const windStore = useWindStore();
  // 获取风场数据
  const data = windStore.windData;
  // 创建风场图层数组
  const windLayerRefs = [];


  // 监听图层设置变化，更新所有风场图层
  watch(
    () => layerSettingsStore.windOptions,
    (newOptions) => {
      windLayerRefs.forEach((windLayer, index) => {
        if (windLayer && data?.layers?.[index]) {
          const layerHeight = data.layers[index].height;

          windLayer.updateOptions({
            ...newOptions,
            particleHeight: layerHeight,
            opacity: 0.8 - (index * 0.1)
          });
        }
      });
    },
    { deep: true }
  );

  // 监听风场数据变化，使用updateWindData方法更新风场
  watch(
    () => windStore.windData,
    (newData) => {
      if (newData && windLayerRefs.length > 0) {
        console.log('风场数据更新，使用updateWindData方法更新风场图层...', newData);
        // 使用updateWindData方法更新每个风场图层的数据
        newData.layers.forEach((layer, index) => {
          const { windData } = layer;
          if (windLayerRefs[index]) {
            try {
              // 使用updateWindData方法更新风场数据
              windLayerRefs[index].updateWindData(windData);
              console.log(`成功更新高度 ${layer.height} 的风场数据`);
            
            } catch (error) {
              console.error(`更新风场数据失败：`, error);
            }
          }
        });
      } else if (newData  && windLayerRefs.length === 0) {
        // 如果还没有风场图层，直接创建
        console.log('风场数据已获取，开始创建风场图层...', newData);
        newData.layers.forEach((layer, index) => {
          const { height, windData } = layer;
          console.log('gzj，创建高度', height, '的风场图层...');
          const layerOptions = {
            ...windOptions,
            particleHeight: height,
            opacity: 0.8 - (index * 0.1)
          };

          const windLayer = new WindLayer(viewer, windData, layerOptions);
        
          windLayerRefs.push(windLayer);
        });
      }
      windStore.setWindLayer(windLayerRefs)
    },
    { deep: true,immediate:true }
  );

  // 为风场图层数组添加destroy方法，便于统一销毁
  windLayerRefs.destroy = () => {
    windLayerRefs.forEach(layer => layer.destroy());
  };

  return windLayerRefs;
};
