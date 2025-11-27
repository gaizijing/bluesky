import { WindLayer } from 'cesium-wind-layer';
import { watch } from 'vue'

export const initWind = async (viewer, layerSettingsStore, windLayerRef) => {
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

  windLayerRef.value = new WindLayer(viewer, windData, dataConfigs.options);

  windLayerRef.value.addEventListener('dataChange', (data) => {
    console.log('Wind data updated:', data);
  });

  windLayerRef.value.addEventListener('optionsChange', (options) => {
    console.log('Options updated:', options);
  });

  watch(() => layerSettingsStore.windOptions, (newOptions) => {
    if (windLayerRef.value) {
      console.log('Updating wind layer options from store:', newOptions);
      windLayerRef.value.updateOptions(newOptions);
    }
  }, { deep: true });

  return windLayerRef.value
}