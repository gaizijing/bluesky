# 航线风险分析接口契约

本文档对应当前已经落地的前后端联调版本，用于说明 `RouterRisk`、航线列表、航线详情与后端 `/routes` 接口的真实返回口径。

## 已实现接口

- `GET /routes`
- `GET /routes/{routeId}`
- `POST /routes`
- `POST /routes/{routeId}/analyze`
- `DELETE /routes/clear-history`

统一说明：

- 风险值 `risk / averageRisk / overallRisk` 统一为 `0 ~ 1`
- Cesium 着色数组 `dangers` 统一为 `0 ~ 10`
- 顶层响应仍通过后端 `Result.success(...)` 包裹，业务数据在 `data`

## 数据来源

当前后端已经改为真实微尺度天气采样，不再使用随机数模拟：

- 航线按途经点拆分为多个航段
- 每个航段沿线做多点采样
- 每个采样点匹配覆盖该区域的监测点
- 从 `MicroscaleWeather` 最新可用格点快照中插值获取
  - `riskLevel`
  - `windSpeed`
  - `windShear`
  - `turbulence`
  - `reason`

当前仍未接入的独立接口：

- `windDir`
- `rainfall`

这两个字段当前不会伪造真实值，统一返回：

- `windDir = 0`
- `rainfall = 0`

同时会在 `dataCompleteness.missingInterfaces` 中明确声明缺失项。

## `GET /routes`

返回最近的历史航线列表。每条数据已经包含首屏可直接使用的航段信息。

列表项当前字段：

- `id`
- `routeId`
- `name`
- `routeName`
- `startName`
- `endName`
- `length`
- `distance`
- `segments`
- `segmentCount`
- `averageRisk`
- `overallRisk`
- `riskLevel`
- `highestRisk`
- `highestRiskSegment`
- `segmentData`
- `dangers`
- `waypoints`
- `aircraftModel`
- `flightHeight`
- `estimatedMinutes`
- `estimatedTime`
- `startTime`
- `endTime`
- `dataCompleteness`

## `GET /routes/{routeId}`

返回单条航线完整详情，当前实现与列表项字段保持同口径，并额外返回：

- `success`
- `message`（仅失败时）

航线不存在时返回：

```json
{
  "success": false,
  "message": "航线不存在",
  "routeId": "route-xxx"
}
```

## `POST /routes`

请求体当前支持：

```json
{
  "startName": "起点 A",
  "startLon": 117.125,
  "startLat": 36.652,
  "endName": "终点 B",
  "endLon": 117.288,
  "endLat": 36.758,
  "waypoints": [
    {
      "name": "途经点 1",
      "lon": 117.202,
      "lat": 36.706
    }
  ],
  "aircraftModel": "DJI Mavic 3",
  "flightHeight": 300,
  "startTime": "2026-04-20T08:00:00",
  "endTime": "2026-04-20T09:00:00"
}
```

成功返回：

- `success`
- `routeId`
- `message`
- `route`

其中 `route` 已经是完整航线 payload，可直接用于前端回填详情与首屏渲染。

## `POST /routes/{routeId}/analyze`

请求体支持：

```json
{
  "currentTime": "2026-04-20T08:30:00.000Z"
}
```

`currentTime` 可为空；为空时优先使用航线起飞时间，否则退回当前时间。

当前已实现返回字段：

- `success`
- `routeId`
- `routeName`
- `analysisTime`
- `currentAnalysisTime`
- `averageRisk`
- `overallRisk`
- `riskLevel`
- `highestRisk`
- `highestRiskSegment`
- `segmentData`
- `segments`
- `dangers`
- `waypoints`
- `flightHeight`
- `aircraftModel`
- `estimatedMinutes`
- `estimatedTime`
- `riskDimensions`
- `overallAssessment`
- `segmentAnalysis`
- `measures`
- `recommendations`
- `alternativeRoutes`
- `alternatives`
- `riskChart`
- `dataCompleteness`
- `routeStartTime`
- `routeEndTime`
- `startTime`
- `endTime`

## `segmentData[]`

这是风险图表、地图高亮、提示框和统计面板的核心数据。

当前字段：

- `segment`
- `distance`
- `segmentLength`
- `risk`
- `riskLevel`
- `windSpeed`
- `windDir`
- `windShear`
- `turbulence`
- `rainfall`
- `startCoordinates`
- `endCoordinates`
- `pathCoordinates`
- `reason`

说明：

- `distance` 是累计距离
- `segmentLength` 是当前航段长度
- `pathCoordinates` 是用于地图绘制的沿线坐标

## `measures[]`

当前字段：

- `id`
- `title`
- `description`
- `priority`
- `level`
- `content`

说明：

- `priority` 与 `level` 含义一致，都是 `low | medium | high`
- `content` 为 `description` 的兼容字段

## `alternativeRoutes[]`

备选航线当前不是数据库表查询结果，而是基于主航线高风险段自动生成的绕飞方案。

生成规则：

- 主航线至少有两个航点
- 存在有效最高风险航段
- `highestRisk >= 0.3` 才生成

当前字段：

- `id`
- `routeId`
- `name`
- `startName`
- `endName`
- `distance`
- `length`
- `estimatedMinutes`
- `estimatedTime`
- `flightHeight`
- `averageRisk`
- `overallRisk`
- `riskLevel`
- `segmentCount`
- `description`
- `advantage`
- `waypoints`
- `segmentData`
- `segments`
- `dangers`
- `dataCompleteness`

兼容说明：

- 备选航线里的 `segments` 当前仍保留为数组，兼容前端已有读取逻辑
- 主航线 payload 里的 `segments` 为数量

## `riskChart`

当前后端会基于航线时间窗口按多个时间点重新采样，返回：

- `timeLabels`
- `riskValues`
- `stats.max`
- `stats.min`
- `stats.average`
- `stats.durationMinutes`

## `dataCompleteness`

当前返回结构：

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

## 当前缺的后端气象接口

如果要把组件里的所有字段都补成真实数据，当前还需要至少补这两类源：

- 沿航线风向格点或矢量风场接口
- 沿航线降水格点接口

补齐后建议直接替换：

- `segmentData[].windDir`
- `segmentData[].rainfall`

其余主链路字段目前都已经接到真实微尺度天气采样逻辑上。
