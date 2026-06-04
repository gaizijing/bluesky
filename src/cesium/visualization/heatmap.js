/**
 * @deprecated 旧地图热力图已下线，请使用 MetViz GridFieldSliceLayer + met-viz/core/MetColorLayer
 */
export function initHeatVolume() {
  throw new Error(
    '[Heatmap] 旧热力图已移除，请使用 MetViz 气象填色（/weather/grid-field + MetColorLayer）'
  );
}

export function createReactiveHeatmapBridge() {
  throw new Error('[Heatmap] 旧热力图桥接已移除，请使用 MetVizEngine');
}
