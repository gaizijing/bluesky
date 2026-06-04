import { defineStore } from 'pinia';
import { setStorage } from '@/utils/storageUtils';
import { bucketFromIso, toShanghaiIso } from '@/utils/timeBucket';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';
import { useRegionStore } from '@/store/modules/region';
import { useRegionLandingStore } from '@/store/modules/regionLanding';

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
  }),

  getters: {
    currentViewId: (state) => state.view,
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
          const landingStore = useRegionLandingStore();
          await landingStore.loadLandingPoints(this.regionId);
        } catch (err) {
          console.warn('[appDashboard] load landing points failed', err);
        }
      }

      this.timelineBucket = bucketFromIso(this.timelineTime);
      this.initialized = true;
      if (this.regionId) {
        dashboardEventBus.emit(DASHBOARD_EVENTS.MET_VIZ_CONFIG_CHANGED, {
          regionId: this.regionId,
          timelineTime: this.timelineTime,
        });
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
      landingStore.clearLandingPoints();
      await landingStore.loadLandingPoints(id);

      dashboardEventBus.emit(DASHBOARD_EVENTS.REGION_CHANGED, { regionId: id });
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
      this.view = view;
      if (view === 'home') {
        this.focus = { type: 'none' };
        dashboardEventBus.emit(DASHBOARD_EVENTS.VIEW_CHANGED, {
          view: 'home',
          focus: this.focus,
        });
      }
    },

    drillLanding(id) {
      this.view = 'drillLanding';
      this.focus = { type: 'landingPoint', id };
      dashboardEventBus.emit(DASHBOARD_EVENTS.VIEW_CHANGED, {
        view: 'drillLanding',
        focus: this.focus,
      });
    },

    drillRoute(id) {
      this.view = 'drillRoute';
      this.focus = { type: 'route', id };
      this.routeIdForSim = id;
    },

    enterSimFlight(routeId) {
      if (routeId) this.routeIdForSim = routeId;
      this.view = 'simFlight';
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
  },
});
