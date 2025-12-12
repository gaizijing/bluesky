import { WindLayer } from 'cesium-wind-layer';
import { watch } from 'vue'

export const initWind = async (viewer, layerSettingsStore) => {
  const windOptions = layerSettingsStore.windOptions;
  const dataConfigs = {
    file: import.meta.env.VITE_WIND_DATA_URL,
    options: windOptions
  };

  const res = await fetch(dataConfigs.file);
  const data = await res.json();

  const windData = {
    ...data,
    bounds: {
      west: 120.0,
      south: 35.5,
      east: 121.0,
      north: 37.0
    }
  };

  let windLayerRef = new WindLayer(viewer, windData, dataConfigs.options);

  windLayerRef.addEventListener('dataChange', (data) => {
  });

  windLayerRef.addEventListener('optionsChange', (options) => {
  });

  watch(() => layerSettingsStore.windOptions, (newOptions) => {
    if (windLayerRef) {
      windLayerRef.updateOptions(newOptions);
    }
  }, { deep: true });

  return windLayerRef
}