import { WindLayer } from 'cesium-wind-layer';
import { watch } from 'vue';
import { getWindData } from '@/api';

/**
 * 初始化风场图层
 * @param {Cesium.Viewer} viewer - Cesium Viewer实例
 * @param {Object} layerSettingsStore - 图层设置存储
 * @returns {Array<WindLayer>} 风场图层数组
 */
export const initWind = async (viewer, layerSettingsStore) => {
  const windOptions = layerSettingsStore.windOptions;

  // 获取风场数据
  const data = await getWindData();

  // 创建风场图层数组
  const windLayerRefs = [];

  // 为每个高度层创建风场图层
  data.layers.forEach((layer, index) => {
    const { height, windData } = layer;

    // 配置风场图层选项
    const layerOptions = {
      ...windOptions,
      particleHeight: height, // 设置粒子高度
      opacity: 0.8 - (index * 0.1) // 高度越高，透明度越低
    };
    console.log(windData);
    

    // 创建风场图层
    const windLayer = new WindLayer(viewer, windData, layerOptions);
    windLayerRefs.push(windLayer);

    // 添加事件监听
    windLayer.addEventListener('dataChange', (layerData) => {
      console.log(`Height ${height} wind data changed:`, layerData);
    });

    windLayer.addEventListener('optionsChange', (options) => {
      console.log(`Height ${height} wind options changed:`, options);
    });
  });

  // 监听图层设置变化，更新所有风场图层
  watch(
    () => layerSettingsStore.windOptions,
    (newOptions) => {
      windLayerRefs.forEach((windLayer, index) => {
        if (windLayer) {
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

  // 为风场图层数组添加destroy方法，便于统一销毁
  windLayerRefs.destroy = () => {
    windLayerRefs.forEach(layer => layer.destroy());
  };

  return windLayerRefs;
};
