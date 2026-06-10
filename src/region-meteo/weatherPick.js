import { apiGet } from './apiAdapter.js';
import {
  evaluateWeatherFlyability,
  metricLevelClass,
  riskBadgeClass,
} from '@/utils/flyabilityEvaluate.js';

function fmtCoord(n) {
  return typeof n === 'number' && Number.isFinite(n) ? n.toFixed(5) : '—';
}

function fmtMetric(value, unit) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isFinite(n)) return n.toFixed(1) + (unit ? ' ' + unit : '');
  return String(value);
}

function metricRow(label, valueText, level) {
  const cls = metricLevelClass(level);
  const valueHtml = cls
    ? '<span class="' + cls + '">' + valueText + '</span>'
    : valueText;
  return { html: label + '：' + valueHtml };
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
      const levels = evaluateWeatherFlyability(data);
      const rows = [
        { text: '坐标：' + fmtCoord(lng) + ', ' + fmtCoord(lat) },
        { text: '高度层：' + heightM + ' m' },
        metricRow('温度', fmtMetric(data?.temperature, '°C'), levels.temperatureC),
        metricRow('风速', fmtMetric(data?.windSpeed, 'm/s'), levels.windSpeedMs),
        metricRow('能见度', fmtMetric(data?.visibility, 'km'), levels.visibilityKm),
        { text: '湿度：' + fmtMetric(data?.humidity, '%') },
        metricRow('降水', fmtMetric(data?.precipitation, 'mm/h'), levels.precipMmH),
      ];
      const risk = data?.risk;
      if (risk?.level || risk?.value != null) {
        const riskText = risk.value != null ? fmtMetric(risk.value, '') : (risk.level || '—');
        const badgeCls = 'landing-popup__badge ' + riskBadgeClass(risk.level);
        rows.push({ html: '<span class="' + badgeCls.trim() + '">R_met ' + riskText + '</span>' });
      } else if (data?.riskLevel || data?.rMet != null) {
        const riskText = data.rMet != null ? fmtMetric(data.rMet, '') : (data.riskLevel || '—');
        rows.push({ html: '<span class="landing-popup__badge">R_met ' + riskText + '</span>' });
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
