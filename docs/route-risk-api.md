# 航线风险分析接口契约

本文档对应当前 V2 后端 `/routes` 接口实现，供 `RouterRisk`、航线列表、航线详情与风险分析面板联调使用。

## 已实现接口

- `GET /routes?regionId=&page=&size=`
- `GET /routes/{routeId}?routeVersionId=`
- `GET /routes/{routeId}/versions`
- `POST /routes?regionId=`
- `POST /routes/import?regionId=`
- `POST /routes/{routeId}/analyze`
- `DELETE /routes?regionId=`
- `DELETE /routes/{routeId}`

统一说明：

- 风险值 `risk / averageRisk / overallRisk` 统一为 `0 ~ 1`
- Cesium 着色数组 `dangers` 统一为 `0 ~ 10`
- 顶层响应通过后端 `Result.success(...)` 包裹，业务数据在 `data`

## 数据来源

航线分析从 **`risk_field_cache`** 格点快照双线性插值采样（V1 的 `microscale_weather` 表已废弃）：

- 航线按途经点拆分为多个航段
- 每个航段沿线做 7 点采样（`SEGMENT_SAMPLE_COUNT = 7`）
- 每个采样点匹配覆盖该区域的起降点 bbox
- 从对应 Region 的 `risk_field_cache` 最新 bucket 插值获取：
  - `risk`（由 `value` 归一化到 0~1）
  - `reason`

**缓存来源（二选一）：**

1. **调度任务**（`RiskCacheJob`）：基于 Open-Meteo API 按 Region 边界格点采样后写入，`rule_version` 不含 `-seed`
2. **Flyway 种子**（V4/V22）：公式生成的演示格点，`rule_version` 含 `RS001-v1-seed`

开发环境若未执行调度重算，默认读到的是种子数据。触发真实采样：

```bash
POST /api/scheduler/recompute?regionId=R2
```

### 当前未接入 / 未填充的字段

| 字段 | 当前返回值 | 原因 |
|------|------------|------|
| `windDir` | `0` | 无独立风向格点接口 |
| `rainfall` | `0` | 无沿航线降水格点接口 |
| `windSpeed` | `0` | `buildGridSnapshot` 未从缓存填充该维度 |
| `windShear` | `0` | 同上 |
| `turbulence` | `0` | 同上 |

上述缺失会在 `dataCompleteness.missingInterfaces` 与 `notes` 中声明。

## `GET /routes`

按 Region 分页返回航路列表。演示数据含 Flyway V15 种子「顺丰-黄岛保税」（`route-sf-huangdao`）。

列表项主要字段：

- `id` / `routeId` / `name` / `routeName`
- `startName` / `endName`
- `length` / `distance` / `segments` / `segmentCount`
- `averageRisk` / `overallRisk` / `riskLevel`
- `highestRisk` / `highestRiskSegment`
- `segmentData` / `dangers` / `waypoints`
- `aircraftModel` / `flightHeight`
- `estimatedMinutes` / `estimatedTime`
- `startTime` / `endTime`
- `dataCompleteness`

## `GET /routes/{routeId}`

返回单条航线完整详情，字段与列表项同口径。

航线不存在时：

```json
{
  "success": false,
  "message": "航线不存在",
  "routeId": "route-xxx"
}
```

## `POST /routes?regionId=`

请求体示例：

```json
{
  "startName": "起点 A",
  "startLon": 117.125,
  "startLat": 36.652,
  "endName": "终点 B",
  "endLon": 117.288,
  "endLat": 36.758,
  "waypoints": [
    { "name": "途经点 1", "lon": 117.202, "lat": 36.706 }
  ],
  "aircraftModel": "DJI Mavic 3",
  "flightHeight": 300,
  "startTime": "2026-04-20T08:00:00",
  "endTime": "2026-04-20T09:00:00"
}
```

成功返回 `success`、`routeId`、`message`、`route`（完整 payload）。

## `POST /routes/{routeId}/analyze`

请求体：

```json
{
  "currentTime": "2026-04-20T08:30:00.000Z"
}
```

`currentTime` 可为空；为空时优先使用航线起飞时间，否则退回当前时间。

主要返回字段：

- `success` / `routeId` / `routeName` / `analysisTime` / `currentAnalysisTime`
- `averageRisk` / `overallRisk` / `riskLevel`
- `highestRisk` / `highestRiskSegment`
- `segmentData` / `segments` / `dangers` / `waypoints`
- `flightHeight` / `aircraftModel` / `estimatedMinutes` / `estimatedTime`
- `riskDimensions` / `overallAssessment` / `segmentAnalysis`
- `measures` / `recommendations`
- `alternativeRoutes` / `alternatives`
- `riskChart` / `dataCompleteness`
- `routeStartTime` / `routeEndTime` / `startTime` / `endTime`

## `segmentData[]`

风险图表、地图高亮、提示框的核心数据。

| 字段 | 说明 |
|------|------|
| `segment` | 航段序号 |
| `distance` | 累计距离 |
| `segmentLength` | 当前航段长度 |
| `risk` / `riskLevel` | 来自 risk_field_cache 插值 |
| `windSpeed` / `windShear` / `turbulence` | 当前为 0 |
| `windDir` / `rainfall` | 当前为 0 |
| `startCoordinates` / `endCoordinates` / `pathCoordinates` | 地图绘制坐标 |
| `reason` | 风险原因文案 |

## `measures[]`

- `id` / `title` / `description`
- `priority` / `level`（`low` \| `medium` \| `high`）
- `content`（`description` 的兼容字段）

## `alternativeRoutes[]`

非数据库查询，基于主航线高风险段算法生成的绕飞方案。

生成条件：

- 主航线至少两个航点
- 存在有效最高风险航段
- `highestRisk >= 0.3`

## `riskChart`

基于航线时间窗口多时间点重新采样：

- `timeLabels` / `riskValues`
- `stats.max` / `stats.min` / `stats.average` / `stats.durationMinutes`

## `dataCompleteness`

```json
{
  "isRealtimeWeather": true,
  "supportsRouteSampling": true,
  "supportsAlternativeRouteSimulation": true,
  "missingInterfaces": ["windDir", "rainfall"],
  "notes": [
    "风向暂未接入独立格点接口，当前统一返回 0。",
    "降水暂未接入沿航线格点接口，当前统一返回 0。",
    "备选航线为基于主航线高风险段的算法绕飞结果，不依赖独立数据库表。"
  ]
}
```

## 后续补齐建议

若要补全 segment 上的风/降水字段，建议：

1. 在 `RouteService.buildGridSnapshot` 中从 `risk_field_cache.factors_json` 或独立气象格点填充 `windSpeed` 等
2. 接入沿航线风向矢量场（可复用 `/wind-field` NetCDF 插值）
3. 接入降水格点（可复用 `/weather/grid-field?product=precip`）

## 相关文档

- [后端 API 与数据来源](../../server/doc/API-接口与数据来源.md)
- [后端接口文档 V2](../../server/doc/后端接口文档.md)
