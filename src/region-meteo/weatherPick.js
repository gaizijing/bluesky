import { apiGet } from './apiAdapter.js';

function fmtCoord(n) {
  return typeof n === 'number' && Number.isFinite(n) ? n.toFixed(5) : '—';
}

function fmtMetric(value, unit) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isFinite(n)) return n.toFixed(1) + (unit ? ' ' + unit : '');
  return String(value);
}

export function initWeatherPick(viewer, popup, getHeightM, getTimelineTime) {
  let enabled = false;
  let loading = false;

  async function handleMapClick(movement) {
    if (!enabled || loading) return;

    const picked = viewer.scene.pick(movement.position);
    if (picked?.id?.properties) {
      const props = picked.id.properties;
      const isRoute = props.isRouteSegment?.getValue?.(Cesium.JulianDate.now()) ?? props.isRouteSegment;
      const isRouteWp = props.isRouteWaypoint?.getValue?.(Cesium.JulianDate.now()) ?? props.isRouteWaypoint;
      if (isRoute || isRouteWp) return;
    }

    const cartesian = viewer.camera.pickEllipsoid(
      movement.position,
      viewer.scene.globe.ellipsoid,
    );
    if (!cartesian) {
      popup.hide();
      return;
    }

    const carto = Cesium.Cartographic.fromCartesian(cartesian);
    const lng = Cesium.Math.toDegrees(carto.longitude);
    const lat = Cesium.Math.toDegrees(carto.latitude);
    const heightM = getHeightM?.() ?? 100;
    const time = getTimelineTime?.() ?? 'now';

    popup.show(cartesian, {
      title: '拾取点气象',
      rows: [{ text: '查询中…' }],
    });

    loading = true;
    try {
      const q =
        '/weather/point?lng=' + encodeURIComponent(lng)
        + '&lat=' + encodeURIComponent(lat)
        + '&heightM=' + encodeURIComponent(heightM)
        + '&includeRisk=true'
        + '&time=now';
      const data = await apiGet(q, { time });
      const rows = [
        { text: '坐标：' + fmtCoord(lng) + ', ' + fmtCoord(lat) },
        { text: '高度层：' + heightM + ' m' },
        { text: '温度：' + fmtMetric(data?.temperature, '°C') },
        { text: '风速：' + fmtMetric(data?.windSpeed, 'm/s') },
        { text: '能见度：' + fmtMetric(data?.visibility, 'km') },
        { text: '湿度：' + fmtMetric(data?.humidity, '%') },
        { text: '降水：' + fmtMetric(data?.precipitation, 'mm/h') },
      ];
      if (data?.riskLevel || data?.rMet != null) {
        const risk = data.rMet != null ? fmtMetric(data.rMet, '') : (data.riskLevel || '—');
        rows.push({ html: '<span class="landing-popup__badge">R_met ' + risk + '</span>' });
      }
      if (data?.isStale) {
        rows.push({ text: '（数据可能滞后）' });
      }
      popup.show(cartesian, { title: '拾取点气象', rows });
    } catch (err) {
      popup.show(cartesian, {
        title: '拾取点气象',
        rows: [{ text: err.message || '查询失败' }],
      });
    } finally {
      loading = false;
      viewer.scene.requestRender();
    }
  }

  return {
    handleMapClick,
    setEnabled(on) {
      enabled = on;
      if (!on) popup.hide();
    },
  };
}
