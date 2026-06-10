import { defineStore } from 'pinia';
import { setStorage } from '@/utils/storageUtils';
import { bucketFromIso, toShanghaiIso } from '@/utils/timeBucket';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';
import { useRegionStore } from '@/store/modules/region';
import { useRegionLandingStore } from '@/store/modules/regionLanding';
import { useRegionRoutesStore } from '@/store/modules/regionRoutes';
import { loadRegionCatalog } from '@/services/regionCatalog';
import { fetchWarnings } from '@/api/v2/warning';

const REGION_ID_KEY = 'currentRegionId';

export const useAppDashboardStore = defineStore('appDashboard', {
  state: () => ({
    view: 'home',
    focus: { type: 'none' },
    regionId: null,
    timelineTime: toShanghaiIso(new Date()),
    timelineBucket: null,
    routeIdForSim: null,
    simSessionId: null,
    simConnected: false,
    cameraMode: 'thirdPerson',
    panelsHidden: false,
    legendOpen: false,
    pickMode: false,
    warningDrawerOpen: false,
    warningDrawerFocusId: null,
    pickPopup: null,
    initialized: false,
    /** 未处理预警数 NEW+ACKNOWLEDGED，控制首页预警摘要面板显隐 */
    activeWarningCount: 0,
    /** 未读预警数 NEW，控制 Header 铃铛角标 */
    unreadWarningCount: 0,
    /** 总览 landing-matrix 缓存，供下钻 1H 适飞与卡片色条对齐 */
    landingMatrixCache: null,
  }),

  getters: {
    currentViewId: (state) => state.view,
    showHomeWarningSummary: (state) =>
      state.view === 'home' && state.activeWarningCount > 0,
    /** 右侧无面板占位时，工具栏贴屏幕右缘 */
    homeRightPanelCollapsed: (state) =>
      state.view === 'home' && state.activeWarningCount === 0,
  },

  actions: {
    async initialize() {
      if (this.initialized) return;
      const regionStore = useRegionStore();
      try {
        await regionStore.fetchRegions();
        if (regionStore.regionId) {
          this.regionId = regionStore.regionId;
          const region = regionStore.regions.find(
            (r) => (r.regionId || r.id) === regionStore.regionId
          );
          if (region) regionStore.applyRegionVo(region);
        } else if (regionStore.regions.length) {
          const def = regionStore.regions.find((r) => r.isDefault) || regionStore.regions[0];
          const id = def.regionId || def.id;
          this.regionId = id;
          regionStore.applyRegionVo(def);
        }
      } catch (err) {
        console.warn('[appDashboard] initialize region failed', err);
      }

      if (this.regionId) {
        try {
          await loadRegionCatalog(this.regionId);
        } catch (err) {
          console.warn('[appDashboard] load region catalog failed', err);
        }
      }

      this.timelineBucket = bucketFromIso(this.timelineTime);
      this.initialized = true;
      if (this.regionId) {
        await this.refreshWarningCounts();
      }
    },

    async refreshWarningCounts() {
      if (!this.regionId) {
        this.activeWarningCount = 0;
        this.unreadWarningCount = 0;
        return;
      }
      try {
        const list = await fetchWarnings({
          regionId: this.regionId,
          statuses: 'NEW,ACKNOWLEDGED',
        });
        const items = Array.isArray(list) ? list : [];
        this.activeWarningCount = items.length;
        this.unreadWarningCount = items.filter((w) => w.status === 'NEW').length;
      } catch (err) {
        console.warn('[appDashboard] refreshWarningCounts failed', err);
      }
    },

    async setRegion(id, options = { resetView: true }) {
      if (!id) return;
      this.regionId = id;
      setStorage(REGION_ID_KEY, id);
      if (options.resetView !== false) {
        this.view = 'home';
        this.focus = { type: 'none' };
        this.routeIdForSim = null;
      }

      const regionStore = useRegionStore();
      await regionStore.switchRegion(id);

      const landingStore = useRegionLandingStore();
      const routesStore = useRegionRoutesStore();
      landingStore.clearLandingPoints();
      routesStore.clearRoutes();
      await loadRegionCatalog(id, { force: true });

      this.clearLandingMatrixCache();
      dashboardEventBus.emit(DASHBOARD_EVENTS.REGION_CHANGED, { regionId: id });
      await this.refreshWarningCounts();
    },

    setTimelineTime(time) {
      const iso = time instanceof Date ? toShanghaiIso(time) : String(time);
      this.timelineTime = iso;
      this.timelineBucket = bucketFromIso(iso);
      dashboardEventBus.emit(DASHBOARD_EVENTS.MET_TIME_CHANGED, {
        timelineTime: iso,
        bucket: this.timelineBucket,
      });
    },

    backToNow() {
      this.setTimelineTime(new Date());
    },

    setView(view) {
      if (this.view === 'simFlight' && view !== 'simFlight') {
        this.cameraMode = 'free';
      }
      this.view = view;
      if (view === 'home') {
        this.focus = { type: 'none' };
        dashboardEventBus.emit(DASHBOARD_EVENTS.VIEW_CHANGED, {
          view: 'home',
          focus: this.focus,
        });
      }
    },

    /** 工具栏「首页」：非 home 则切回；已在 home 则重置地图默认视角 */
    goHome() {
      if (this.view === 'simFlight') this.cameraMode = 'free';
      if (this.view === 'home') {
        dashboardEventBus.emit(DASHBOARD_EVENTS.RESET_HOME_CAMERA);
        return;
      }
      this.setView('home');
    },

    drillLanding(id) {
      if (this.view === 'simFlight') this.cameraMode = 'free';
      this.view = 'drillLanding';
      this.focus = { type: 'landingPoint', id };
      dashboardEventBus.emit(DASHBOARD_EVENTS.VIEW_CHANGED, {
        view: 'drillLanding',
        focus: this.focus,
      });
    },

    drillRoute(id) {
      if (this.view === 'simFlight') this.cameraMode = 'free';
      this.view = 'drillRoute';
      this.focus = { type: 'route', id };
      this.routeIdForSim = id;
      dashboardEventBus.emit(DASHBOARD_EVENTS.VIEW_CHANGED, {
        view: 'drillRoute',
        focus: this.focus,
      });
    },

    enterSimFlight(routeId) {
      const resolved =
        routeId || (this.focus.type === 'route' ? this.focus.id : null) || this.routeIdForSim;
      if (resolved) this.routeIdForSim = resolved;
      this.view = 'simFlight';
      this.cameraMode = 'thirdPerson';
    },

    setCameraMode(mode) {
      if (['thirdPerson', 'firstPerson', 'free'].includes(mode)) {
        this.cameraMode = mode;
      }
    },

    togglePanelsHidden() {
      this.panelsHidden = !this.panelsHidden;
    },

    toggleLegend() {
      this.legendOpen = !this.legendOpen;
    },

    togglePickMode() {
      this.pickMode = !this.pickMode;
      if (!this.pickMode) this.pickPopup = null;
    },

    setPickPopup(payload) {
      this.pickPopup = payload;
    },

    closePickPopup() {
      this.pickPopup = null;
    },

    openWarningDrawer(focusId = null) {
      this.warningDrawerOpen = true;
      this.warningDrawerFocusId = focusId;
    },

    closeWarningDrawer() {
      this.warningDrawerOpen = false;
      this.warningDrawerFocusId = null;
    },

    setLandingMatrixCache(response, hours) {
      if (!response?.matrix?.length) {
        this.landingMatrixCache = null;
        return;
      }
      this.landingMatrixCache = {
        regionId: this.regionId,
        timelineTime: this.timelineTime,
        hours,
        response,
      };
    },

    getLandingMatrixCache(hours) {
      const cache = this.landingMatrixCache;
      if (!cache?.response?.matrix?.length) return null;
      if (cache.regionId !== this.regionId) return null;
      if (cache.timelineTime !== this.timelineTime) return null;
      if (cache.hours !== hours) return null;
      return cache.response;
    },

    clearLandingMatrixCache() {
      this.landingMatrixCache = null;
    },
  },
});
