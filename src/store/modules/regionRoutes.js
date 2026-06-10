import { defineStore } from 'pinia';
import {
  analyzeRouteRisk,
  fetchRoutes,
  getRouteDetail,
} from '@/api/v2/route';

let listLoadPromise = null;
let listLoadRegionId = null;
const detailLoadPromises = new Map();

/** 区域航线列表 + 详情缓存，供 Dashboard 面板与 RegionMeteo 共用 */
export const useRegionRoutesStore = defineStore('regionRoutes', {
  state: () => ({
    loadedRegionId: null,
    listPage: 1,
    listSize: 50,
    routeRecords: [],
    routeDetailsById: {},
  }),

  getters: {
    hasRouteList: (state) => state.routeRecords.length > 0,
  },

  actions: {
    clearRoutes() {
      this.loadedRegionId = null;
      this.listPage = 1;
      this.listSize = 50;
      this.routeRecords = [];
      this.routeDetailsById = {};
      listLoadPromise = null;
      listLoadRegionId = null;
      detailLoadPromises.clear();
    },

    async ensureRouteList(regionId, { page = 1, size = 50, force = false } = {}) {
      const rid = typeof regionId === 'string' ? regionId.trim() : regionId;
      if (!rid) {
        throw new Error('尚未选择区域，无法加载航线');
      }

      if (
        !force
        && this.loadedRegionId === rid
        && this.listPage === page
        && this.listSize === size
        && this.routeRecords.length
      ) {
        return { records: this.routeRecords, page, size };
      }

      if (!force && listLoadPromise && listLoadRegionId === rid) {
        return listLoadPromise;
      }

      listLoadRegionId = rid;
      listLoadPromise = (async () => {
        const pageData = await fetchRoutes(rid, page, size);
        const records = Array.isArray(pageData?.records) ? pageData.records : [];
        this.loadedRegionId = rid;
        this.listPage = page;
        this.listSize = size;
        this.routeRecords = records;
        return pageData;
      })();

      try {
        return await listLoadPromise;
      } finally {
        listLoadPromise = null;
      }
    },

    async ensureRouteDetail(routeId, { routeVersionId, skipAnalyze = false, force = false } = {}) {
      const id = routeId != null ? String(routeId).trim() : '';
      if (!id) return null;

      if (!force && this.routeDetailsById[id]) {
        return this.routeDetailsById[id];
      }

      if (!force && detailLoadPromises.has(id)) {
        return detailLoadPromises.get(id);
      }

      const promise = (async () => {
        let detail = await getRouteDetail(id, routeVersionId);
        if (!skipAnalyze && (!Array.isArray(detail?.dangers) || !detail.dangers.length)) {
          try {
            const analyzed = await analyzeRouteRisk(id, {});
            detail = { ...detail, ...analyzed };
          } catch {
            /* 无分析结果时使用默认风险色 */
          }
        }
        this.routeDetailsById[id] = detail;
        return detail;
      })();

      detailLoadPromises.set(id, promise);
      try {
        return await promise;
      } finally {
        detailLoadPromises.delete(id);
      }
    },

    async ensureRouteDetails(records, { skipAnalyze = false, force = false } = {}) {
      const list = Array.isArray(records) ? records : [];
      const details = await Promise.all(
        list.map(async (item) => {
          const routeId = item?.routeId || item?.id;
          if (!routeId) return null;
          try {
            return await this.ensureRouteDetail(routeId, {
              routeVersionId: item.routeVersionId || item.currentVersionId,
              skipAnalyze,
              force,
            });
          } catch (err) {
            console.warn('[regionRoutes] 航路详情失败', routeId, err);
            return null;
          }
        }),
      );
      return details.filter(Boolean);
    },
  },
});
