/** 高德 JS API（联飞小地图） */
export const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || '';
export const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE || '';

export function applyAmapSecurityConfig() {
  if (typeof window === 'undefined' || !AMAP_SECURITY_CODE) return;
  window._AMapSecurityConfig = {
    securityJsCode: AMAP_SECURITY_CODE,
  };
}
