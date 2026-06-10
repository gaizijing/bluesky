/** 旧地图热力图（heatmap/geo）已移除，气象填色由 MetViz GridFieldSliceLayer 负责 */
export const MAP_HEATMAP_ENABLED = false;

/** MetViz 总开关（独立气象页等） */
export const MET_VIZ_ENABLED = true;

/** 主大屏 Dashboard 是否启用 MetViz（false = 隐藏工具栏且不挂载引擎，减轻卡顿） */
export const MET_VIZ_ON_DASHBOARD = false;

/** 主大屏 Dashboard 是否启用 RegionMeteo（Kriging 标量 + 静态 GFS 风场） */
export const REGION_METEO_ON_DASHBOARD = true;
