# DEMO-1: Cesium MC 风险云团验证

Phase 0 技术验证页，**不接业务后端**。

## 启动

```bash
cd web
npm run dev
# 浏览器打开 http://localhost:8081/demos/cesium-mc-demo
# 或 npm run dev:mc-demo
```

## 验证项（对照 v2.3 §14）

| 项 | 实现 |
|----|------|
| 假 R_met | `core/fakeRMetVolume.js` — 3 个移动高斯团 |
| Marching Cubes | `core/marchingCubes.js`（Paul Bourke / mikolalysenko） |
| Cesium Primitive | `McRiskLayer` — PerInstanceColorAppearance |
| 时间轴 | 12 步 + Cesium Timeline + 播放 |
| 分块 | 4×4 = 16 chunk，视锥裁剪可开关 |
| destroy/update | HUD 按钮 + 相机 moveEnd 增量更新 |
| FPS / 内存 | HUD + 「内存压测 ×20」 |

## 目录

```text
core/
  McRiskLayer.js      # initialize / update / destroy
  marchingCubes.js
  fakeRMetVolume.js
  spatialChunks.js
  demoViewer.js
McDemoPage.vue
```

## 通过标准（建议）

- 单 MC 层 FPS ≥ 30（1920×1080，独显）
- 时间轴 10+ 步切换无明显泄漏
- destroy() 后 Primitive 计数归零

验证报告模板：`docs/tech-validation/DEMO-1-mc.md`（手动填写截图与结论）
