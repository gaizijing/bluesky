import * as Cesium from 'cesium';

/**
 * Cesium全局事件管理器
 * 负责统一管理Cesium场景中的各类事件，支持事件优先级和事件冒泡机制
 */
class EventManager {
  constructor() {
    this.clickHandlers = []; // 存储点击事件处理器
    this.defaultHandlers = []; // 存储默认处理器，总是在最后执行
    this.initializedViewers = new Set(); // 已初始化的viewer实例集合
  }

  /**
   * 注册点击事件处理器
   * @param {Function} handler - 事件处理函数，返回true表示事件已处理
   * @param {number} priority - 优先级，数字越大优先级越高
   * @returns {Function} 注销该处理器的函数
   */
  registerClickHandler(handler, priority = 0) {
    if (typeof handler !== 'function') {
      console.warn('事件处理器必须是函数');
      return () => {};
    }
    
    const handlerObj = { handler, priority };
    this.clickHandlers.push(handlerObj);
    // 按优先级排序，优先级高的先执行
    this.clickHandlers.sort((a, b) => b.priority - a.priority);
    
    // 返回注销函数
    return () => this.unregisterClickHandler(handler);
  }

  /**
   * 注销点击事件处理器
   * @param {Function} handler - 要注销的处理器函数
   */
  unregisterClickHandler(handler) {
    this.clickHandlers = this.clickHandlers.filter(item => item.handler !== handler);
  }

  /**
   * 注册默认处理器（总是在其他处理器之后执行，无论事件是否被处理）
   * @param {Function} handler - 默认处理函数，接收viewer, movement, handled参数
   * @returns {Function} 注销该处理器的函数
   */
  registerDefaultHandler(handler) {
    if (typeof handler !== 'function') {
      console.warn('默认处理器必须是函数');
      return () => {};
    }
    
    this.defaultHandlers.push(handler);
    
    // 返回注销函数
    return () => this.unregisterDefaultHandler(handler);
  }

  /**
   * 注销默认处理器
   * @param {Function} handler - 要注销的默认处理器函数
   */
  unregisterDefaultHandler(handler) {
    this.defaultHandlers = this.defaultHandlers.filter(h => h !== handler);
  }

  /**
   * 处理点击事件
   * @param {Cesium.Viewer} viewer - Cesium viewer实例
   * @param {Object} movement - 鼠标移动信息
   * @returns {boolean} 事件是否被处理
   */
  handleClick(viewer, movement) {
    let handled = false;
    
    // 先执行所有注册的点击处理器
    this.clickHandlers.forEach(({ handler }) => {
      try {
        if (!handled) {
          handled = handler(viewer, movement) || handled;
        }
      } catch (e) {
        console.warn('点击处理器执行错误：', e);
      }
    });
    
    // 然后执行所有默认处理器（无论事件是否被处理）
    this.defaultHandlers.forEach(handler => {
      try {
        handler(viewer, movement, handled);
      } catch (e) {
        console.warn('默认处理器执行错误：', e);
      }
    });
    
    return handled;
  }

  /**
   * 初始化viewer的事件处理
   * @param {Cesium.Viewer} viewer - Cesium viewer实例
   */
  initializeViewerEvents(viewer) {
    if (!viewer || this.initializedViewers.has(viewer)) {
      return;
    }
    
    // 注册统一的LEFT_CLICK事件处理器
    viewer.screenSpaceEventHandler.setInputAction((movement) => {
      this.handleClick(viewer, movement);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    
    this.initializedViewers.add(viewer);
  }

  /**
   * 清理viewer的事件处理
   * @param {Cesium.Viewer} viewer - Cesium viewer实例
   */
  cleanupViewerEvents(viewer) {
    if (viewer && this.initializedViewers.has(viewer)) {
      // 这里可以添加清理逻辑，但通常不需要移除默认的事件处理器
      this.initializedViewers.delete(viewer);
    }
  }

  /**
   * 注册全局默认处理器，用于处理点击空白区域等通用逻辑
   * @returns {Function} 注销该处理器的函数
   */
  registerGlobalDefaultHandler() {
    const globalDefaultHandler = (viewer, movement, handled) => {
      // 如果事件未被处理，检查是否点击了空白区域
      if (!handled) {
        const pickedObject = viewer.scene.pick(movement.position);
        
        // 如果没有拾取到任何对象，或者拾取到的对象不是我们关心的类型
        if (!Cesium.defined(pickedObject) || 
            (!pickedObject.id?.properties?.isRouteSegment && 
             !(pickedObject.id?.id && 
               typeof pickedObject.id.id === 'string' && 
               pickedObject.id.id.startsWith('monitor_')))) {
          
          // 触发全局点击空白区域事件，可以通过自定义事件系统通知其他模块
          const customEvent = new CustomEvent('cesium-click-blank', {
            detail: {
              viewer: viewer,
              movement: movement
            }
          });
          document.dispatchEvent(customEvent);
        }
      }
    };
    
    return this.registerDefaultHandler(globalDefaultHandler);
  }
}

// 创建单例实例
const eventManager = new EventManager();

// 自动注册全局默认处理器
let unregisterGlobalHandler = null;
if (!unregisterGlobalHandler) {
  unregisterGlobalHandler = eventManager.registerGlobalDefaultHandler();
}

export default eventManager;
export { EventManager };