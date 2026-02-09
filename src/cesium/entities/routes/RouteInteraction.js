// src/cesium/entities/routes/RouteInteraction.js
import * as Cesium from 'cesium'
import eventManager from '@/cesium/core/eventManager'
import { DangerLevel } from './DangerLevel'

export class RouteInteraction {
  constructor(viewer, routeManager) {
    this.viewer = viewer
    this.routeManager = routeManager
    this.dangerLevel = new DangerLevel()
    this.popup = null
    this.popupTitle = null
    this.popupContent = null
  }

  /**
   * 绑定航线事件
   */
  bindEvents() {
    if (!this.viewer) return;

    // 创建弹窗元素
    this.#createPopupElements();

    // 航线点击处理器函数
    const routeClickHandler = (viewer, movement) => {
      const pickedObject = viewer.scene.pick(movement.position);

      if (Cesium.defined(pickedObject) && pickedObject.id?.properties?.isRouteSegment) {
        const routeId = pickedObject.id.properties.routeId;
        const segmentIndex = pickedObject.id.properties.segmentIndex;
        const routeData = this.routeManager.routeEntities.get(routeId.getValue());

        if (routeData && this.popup && this.popupTitle && this.popupContent) {
          // 设置弹窗内容
          this.popupTitle.textContent = `航线 ${routeData.name} - 第${segmentIndex + 1}段`;

          // 根据危险等级设置样式类
          const dangerValue = routeData.dangers[segmentIndex] || 0;
          this.popup.className = '';
          if (dangerValue < 30) {
            this.popup.classList.add('popup-risk-low');
          } else if (dangerValue < 70) {
            this.popup.classList.add('popup-risk-medium');
          } else {
            this.popup.classList.add('popup-risk-high');
          }

          this.popupContent.innerHTML = `
            <div style="margin-bottom: 8px;">
              <span style="display: inline-block; font-weight: 500; min-width: 80px;">危险等级：</span>
              <span style="color: ${dangerValue < 30 ? '#10b981' : dangerValue < 70 ? '#f59e0b' : '#ef4444'};">
                ${this.dangerLevel.getDangerText(dangerValue)}
              </span>
            </div>
            <div style="margin-bottom: 8px;">
              <span style="display: inline-block; font-weight: 500; min-width: 80px;">天气提醒：</span>
              <span>${this.dangerLevel.getWeatherTips(dangerValue)}</span>
            </div>
            <div style="margin-bottom: 8px;">
              <span style="display: inline-block; font-weight: 500; min-width: 80px;">建议速度：</span>
              <span>${this.dangerLevel.getSpeedSuggestion(dangerValue)}</span>
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
              点击其他区域可关闭弹窗
            </div>
          `;

          // 计算航线分段中点的屏幕坐标
          const midPoint = Cesium.Cartesian3.midpoint(
            routeData.positions[segmentIndex],
            routeData.positions[segmentIndex + 1],
            new Cesium.Cartesian3()
          );
          const screenPos = viewer.scene.cartesianToCanvasCoordinates(midPoint);

          if (screenPos) {
            // 计算弹窗位置
            const popupX = screenPos.x;
            const popupY = screenPos.y + 10;

            // 边界检查
            const popupWidth = this.popup.offsetWidth || 300;
            const popupHeight = this.popup.offsetHeight || 200;
            const canvas = viewer.canvas;

            const safeX = Math.max(10, Math.min(canvas.clientWidth - popupWidth - 10, popupX));
            const safeY = Math.max(10, Math.min(canvas.clientHeight - popupHeight - 10, popupY));

            // 设置弹窗位置
            this.popup.style.left = `${safeX}px`;
            this.popup.style.top = `${safeY}px`;
            this.popup.style.bottom = 'auto';
            this.popup.style.right = 'auto';
            this.popup.style.opacity = '0';
            this.popup.style.transform = 'translateY(10px)';
            this.popup.style.display = 'block';

            setTimeout(() => {
              this.popup.style.opacity = '1';
              this.popup.style.transform = 'translateY(0)';
            }, 10);
          }

          return true;
        }
      } else if (this.popup) {
        this.popup.style.display = 'none';
      }

      return false;
    };

    // 注册航线点击处理器
    eventManager.registerClickHandler(routeClickHandler, 1);
  }

  /**
   * 创建弹窗元素
   */
  #createPopupElements() {
    // 辅助函数：安全获取DOM元素
    const getSafeElement = (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      return el;
    };

    // 创建弹窗元素
    this.popup = getSafeElement('routePopup') || document.createElement('div');
    this.popup.id = 'routePopup';
    this.popup.style.position = 'absolute';
    this.popup.style.background = 'rgba(255, 255, 255, 0.95)';
    this.popup.style.padding = '5px';
    this.popup.style.borderRadius = '8px';
    this.popup.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    this.popup.style.zIndex = '1000';
    this.popup.style.display = 'none';
    this.popup.style.minWidth = '280px';
    this.popup.style.maxWidth = '400px';
    this.popup.style.border = '1px solid rgba(229, 231, 235, 1)';
    this.popup.style.animation = 'fadeIn 0.3s ease-out';
    this.popup.style.transition = 'all 0.2s ease';
    this.popup.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    document.body.appendChild(this.popup);

    // 添加动画样式
    if (!document.getElementById('popupAnimationStyle')) {
      const style = document.createElement('style');
      style.id = 'popupAnimationStyle';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .popup-risk-low { border-left: 4px solid #10b981; }
        .popup-risk-medium { border-left: 4px solid #f59e0b; }
        .popup-risk-high { border-left: 4px solid #ef4444; }
      `;
      document.head.appendChild(style);
    }

    this.popupTitle = getSafeElement('popupTitle') || document.createElement('div');
    this.popupTitle.id = 'popupTitle';
    this.popupTitle.style.fontWeight = '600';
    this.popupTitle.style.fontSize = '16px';
    this.popupTitle.style.marginBottom = '12px';
    this.popupTitle.style.color = '#1f2937';
    this.popup.appendChild(this.popupTitle);

    this.popupContent = getSafeElement('popupContent') || document.createElement('div');
    this.popupContent.id = 'popupContent';
    this.popupContent.style.color = '#4b5563';
    this.popupContent.style.lineHeight = '1.5';
    this.popupContent.style.fontSize = '14px';
    this.popup.appendChild(this.popupContent);
  }
}