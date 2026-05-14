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
    this.eventListeners = new Map(); // 存储普通事件监听器
    // 矩形绘制相关状态
    this.rectangleDrawing = false;
    this.startPosition = null;
    this.currentPosition = null;
    this.rectanglePrimitive = null;
    this.viewer = null;
    this.drawCompleteCallback = null;
    // 相机控制模式
    this.originalCameraMode = true;
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
      return () => { };
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
   * 注销所有点击事件处理器
   */
  unregisterClickHandlers() {
    this.clickHandlers = [];
  }

  /**
   * 注册默认处理器（总是在其他处理器之后执行，无论事件是否被处理）
   * @param {Function} handler - 默认处理函数，接收viewer, movement, handled参数
   * @returns {Function} 注销该处理器的函数
   */
  registerDefaultHandler(handler) {
    if (typeof handler !== 'function') {
      console.warn('默认处理器必须是函数');
      return () => { };
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
    console.log('处理点击事件');
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

    this.viewer = viewer;

    // 注册统一的LEFT_CLICK事件处理器
    viewer.screenSpaceEventHandler.setInputAction((movement) => {
      this.handleClick(viewer, movement);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // 注册鼠标移动事件
    viewer.screenSpaceEventHandler.setInputAction((movement) => {
      this.handleMouseMove(viewer, movement);
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // 注册鼠标左键按下事件
    viewer.screenSpaceEventHandler.setInputAction((movement) => {
      this.handleLeftDown(viewer, movement);
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

    // 注册鼠标左键释放事件
    viewer.screenSpaceEventHandler.setInputAction((movement) => {
      this.handleLeftUp(viewer, movement);
    }, Cesium.ScreenSpaceEventType.LEFT_UP);

    this.initializedViewers.add(viewer);
  }

  /**
   * 开始绘制矩形
   * @param {Function} callback - 绘制完成后的回调函数
   */
  startRectangleDrawing(callback) {
    if (!this.viewer) {
      console.error('Viewer not initialized');
      return;
    }

    this.rectangleDrawing = true;
    this.drawCompleteCallback = callback;
    // 改变鼠标样式 - 确保应用到正确的DOM元素
    if (this.viewer.container) {
      this.viewer.container.style.cursor = 'crosshair';
    }
    
    // 同时设置document.body的鼠标样式作为备选
    document.body.style.cursor = 'crosshair';
    
    // 添加CSS类确保样式优先级
    this.viewer.container.classList.add('rectangle-drawing-mode');
    
    // 保存原始的相机控制模式
    this.originalCameraMode = this.viewer.scene.screenSpaceCameraController.enableInputs;
    // 禁用相机控制，防止拖动时地图移动
    this.viewer.scene.screenSpaceCameraController.enableInputs = false;
  }

  /**
   * 停止绘制矩形
   */
  stopRectangleDrawing() {
    this.rectangleDrawing = false;
    this.startPosition = null;
    this.currentPosition = null;
    this.removeRectanglePrimitive();
    
    if (this.viewer) {
      // 恢复鼠标样式
      if (this.viewer.container) {
        this.viewer.container.style.cursor = '';
        
        // 移除CSS类
        this.viewer.container.classList.remove('rectangle-drawing-mode');
      }
      
      // 恢复document.body的鼠标样式
      document.body.style.cursor = '';
      
      // 恢复原始的相机控制模式
      this.viewer.scene.screenSpaceCameraController.enableInputs = this.originalCameraMode;
      console.log('恢复相机控制模式');
    }
    
    this.drawCompleteCallback = null;
  }

  /**
   * 取消绘制矩形
   */
  cancelRectangleDrawing() {
    this.stopRectangleDrawing();
  }

  /**
   * 移除矩形绘制对象
   */
  removeRectanglePrimitive() {
    if (this.rectanglePrimitive && this.viewer) {
      this.viewer.scene.primitives.remove(this.rectanglePrimitive);
      this.rectanglePrimitive = null;
    }
  }

  handleMouseMove(viewer, movement) {
    if (!this.rectangleDrawing || !this.startPosition) {
      this.emit('mouse-move', { viewer, movement });
      return;
    }

    this.currentPosition = movement.endPosition;
    this.updateRectanglePrimitive();
  }

  /**
   * 处理鼠标左键按下事件
   * @param {Cesium.Viewer} viewer - Cesium viewer实例
   * @param {Object} movement - 鼠标按下信息
   */
  handleLeftDown(viewer, movement) {
    this.emit('left-down', { viewer, movement });
    if (!this.rectangleDrawing) {
      return;
    }

    this.startPosition = movement.position;
  }

  /**
   * 处理鼠标左键释放事件
   * @param {Cesium.Viewer} viewer - Cesium viewer实例
   * @param {Object} movement - 鼠标释放信息
   */
  handleLeftUp(viewer, movement) {
    this.emit('left-up', { viewer, movement });
    if (!this.rectangleDrawing || !this.startPosition) {
      return;
    }

    this.currentPosition = movement.position;
    
    // 计算矩形的边界框
    const rectangle = this.calculateRectangle();
    if (rectangle) {
      // 调用回调函数，传递矩形信息，将弧度转换为度
      if (this.drawCompleteCallback) {
        const bbox = {
          west: Cesium.Math.toDegrees(rectangle.west),
          south: Cesium.Math.toDegrees(rectangle.south),
          east: Cesium.Math.toDegrees(rectangle.east),
          north: Cesium.Math.toDegrees(rectangle.north)
        };
        this.drawCompleteCallback(bbox);
      }
    }

    this.stopRectangleDrawing();
  }

  /**
   * 更新矩形绘制对象
   */
  updateRectanglePrimitive() {
    if (!this.viewer || !this.startPosition || !this.currentPosition) {
      return;
    }

    const rectangle = this.calculateRectangle();
    if (!rectangle) {
      return;
    }

    // 移除旧的矩形
    this.removeRectanglePrimitive();

    // 创建新的矩形
    this.rectanglePrimitive = this.viewer.scene.primitives.add(new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.RectangleGeometry({
          rectangle: rectangle,
          vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            Cesium.Color.fromCssColorString('rgba(59, 130, 246, 0.3)')
          )
        }
      }),
      appearance: new Cesium.PerInstanceColorAppearance({
        translucent: true,
        closed: true,
        flat: true
      }),
      show: true
    }));
  }

  /**
   * 计算矩形的边界框
   * @returns {Cesium.Rectangle} 矩形边界框
   */
  calculateRectangle() {
    if (!this.viewer || !this.startPosition || !this.currentPosition) {
      return null;
    }

    // 将屏幕坐标转换为世界坐标
    const startCartesian = this.viewer.scene.pickPosition(this.startPosition);
    const endCartesian = this.viewer.scene.pickPosition(this.currentPosition);

    if (!startCartesian || !endCartesian) {
      return null;
    }

    // 将世界坐标转换为经纬度
    const startCartographic = Cesium.Cartographic.fromCartesian(startCartesian);
    const endCartographic = Cesium.Cartographic.fromCartesian(endCartesian);

    if (!startCartographic || !endCartographic) {
      return null;
    }

    // 计算矩形边界，并将弧度转换为度
    const west = Cesium.Math.toDegrees(Math.min(startCartographic.longitude, endCartographic.longitude));
    const east = Cesium.Math.toDegrees(Math.max(startCartographic.longitude, endCartographic.longitude));
    const south = Cesium.Math.toDegrees(Math.min(startCartographic.latitude, endCartographic.latitude));
    const north = Cesium.Math.toDegrees(Math.max(startCartographic.latitude, endCartographic.latitude));

    return new Cesium.Rectangle(Cesium.Math.toRadians(west), Cesium.Math.toRadians(south), Cesium.Math.toRadians(east), Cesium.Math.toRadians(north));
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
              pickedObject.id.id.startsWith('area_')))) {

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

  /**
   * 注册事件监听器
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 事件处理函数
   * @param {Object} context - 回调函数的上下文（可选）
   * @returns {Function} 注销该监听器的函数
   */
  on(eventName, callback, context = null) {
    if (typeof callback !== 'function') {
      console.warn('事件监听器必须是函数');
      return () => {};
    }

    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }

    const listeners = this.eventListeners.get(eventName);
    const listenerObj = { callback, context };
    listeners.push(listenerObj);

    // 返回注销函数
    return () => {
      const index = listeners.indexOf(listenerObj);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * 注册一次性事件监听器
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 事件处理函数
   * @param {Object} context - 回调函数的上下文（可选）
   * @returns {Function} 注销该监听器的函数
   */
  once(eventName, callback, context = null) {
    const wrappedCallback = (...args) => {
      callback.apply(context, args);
      // 执行后自动注销
      unregister();
    };

    const unregister = this.on(eventName, wrappedCallback, context);
    return unregister;
  }

  /**
   * 移除事件监听器
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 要移除的事件处理函数
   */
  off(eventName, callback) {
    if (!this.eventListeners.has(eventName)) return;

    const listeners = this.eventListeners.get(eventName);
    if (callback) {
      // 移除特定的监听器
      const index = listeners.findIndex(listener => listener.callback === callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    } else {
      // 移除所有监听器
      this.eventListeners.set(eventName, []);
    }
  }

  /**
   * 触发事件
   * @param {string} eventName - 事件名称
   * @param {*} data - 事件数据
   */
  emit(eventName, data) {
    if (!this.eventListeners.has(eventName)) {
      // 可以添加调试日志，方便调试
      console.debug(`事件 ${eventName} 没有监听器`);
      return;
    }

    const listeners = this.eventListeners.get(eventName);
    for (const listener of listeners) {
      try {
        listener.callback.call(listener.context, data);
      } catch (error) {
        console.error(`事件 ${eventName} 监听器执行错误:`, error);
      }
    }
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