import { getActivePinia } from 'pinia';
import { useRegionLandingStore } from '@/store/modules/regionLanding';
import { useRegionRoutesStore } from '@/store/modules/regionRoutes';

export function isRegionCatalogAvailable() {
  return Boolean(getActivePinia());
}

/** Dashboard 切换 Region 或首屏：并行加载起降点列表 + 航线列表（各只请求一次） */
export async function loadRegionCatalog(regionId, { force = false } = {}) {
  const rid = typeof regionId === 'string' ? regionId.trim() : regionId;
  if (!rid || !isRegionCatalogAvailable()) return;

  const landingStore = useRegionLandingStore();
  const routesStore = useRegionRoutesStore();
  await Promise.all([
    landingStore.ensureLandingPoints(rid, { force }),
    routesStore.ensureRouteList(rid, { page: 1, size: 50, force }),
  ]);
}

export async function resolveLandingPoints(regionId, { force = false } = {}) {
  const rid = typeof regionId === 'string' ? regionId.trim() : regionId;
  if (!rid) return [];

  if (isRegionCatalogAvailable()) {
    return useRegionLandingStore().ensureLandingPoints(rid, { force });
  }

  const { apiGet } = await import('@/region-meteo/apiAdapter.js');
  const list = await apiGet('/landing-points?regionId=' + encodeURIComponent(rid));
  return Array.isArray(list) ? list : [];
}

export async function resolveRouteList(regionId, { page = 1, size = 50, force = false } = {}) {
  const rid = typeof regionId === 'string' ? regionId.trim() : regionId;
  if (!rid) return { records: [] };

  if (isRegionCatalogAvailable()) {
    return useRegionRoutesStore().ensureRouteList(rid, { page, size, force });
  }

  const { apiGet } = await import('@/region-meteo/apiAdapter.js');
  return apiGet(
    '/routes?regionId=' + encodeURIComponent(rid) + '&page=' + page + '&size=' + size,
  );
}

export async function resolveRouteDetails(records, { skipAnalyze = false, force = false } = {}) {
  const list = Array.isArray(records) ? records : [];

  if (isRegionCatalogAvailable()) {
    return useRegionRoutesStore().ensureRouteDetails(list, { skipAnalyze, force });
  }

  const { apiGet, apiPost } = await import('@/region-meteo/apiAdapter.js');
  const details = await Promise.all(
    list.map(async (item) => {
      const routeId = item?.routeId || item?.id;
      if (!routeId) return null;
      try {
        let detail = await apiGet('/routes/' + encodeURIComponent(routeId));
        if (!skipAnalyze && (!Array.isArray(detail?.dangers) || !detail.dangers.length)) {
          try {
            const analyzed = await apiPost('/routes/' + encodeURIComponent(routeId) + '/analyze', {});
            detail = { ...detail, ...analyzed };
          } catch {
            /* 无分析结果时使用默认风险色 */
          }
        }
        return detail;
      } catch (err) {
        console.warn('[region-meteo] 航路详情失败', routeId, err);
        return null;
      }
    }),
  );
  return details.filter(Boolean);
}
