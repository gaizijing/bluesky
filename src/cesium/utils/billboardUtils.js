import * as Cesium from 'cesium';

let canvas, context;

/**
 * 渲染自定义广告牌
 * @param {Object} options 配置选项
 * @param {Function} callback 回调函数
 * @returns {Promise<Object>} 包含image和pixelOffset的对象
 */
export function renderBillboard(options, callback) {
  let settings = {
    type: options.type || 'text-icon',
    paddingTo: options.paddingTo || 5,
    textPadding: options.textPadding || 20,
    textBcgWidth: options.textBcgWidth || 150,
    textBcgHeight: options.textBcgHeight || 40,
    iconWidth: options.iconWidth || 40,
    iconHeight: options.iconHeight || 50,
    textBcgUrl: options.textBcgUrl, // 文字背景图片地址
    iconUrl: options.iconUrl, // 图标图片地址
    text: options.text || '',
    textColor: options.textColor || '#ffffff',
    textFontSize: options.textFontSize || 16,
    textFontWeight: options.textFontWeight || 500,
    // 新增：支持直接绘制圆角背景，无需外部图片
    borderRadius: options.borderRadius || 8,
    backgroundColor: options.backgroundColor || 'rgba(33, 150, 243, 0.9)',
    drawBackground: options.drawBackground !== false // 默认绘制背景
  };

  // 初始化canvas
  if (!canvas) {
    canvas = document.createElement('canvas');
    context = canvas.getContext('2d', { willReadFrequently: true });
  }

  // 设置文字样式
  context.font = `${Number(settings.textFontWeight)} ${Number(settings.textFontSize)}px Microsoft Yahei`;
  context.fillStyle = settings.textColor;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.canvas.willReadFrequently = true;

  // 测量文字宽度，动态调整背景宽度
  const textMetrics = context.measureText(settings.text);
  settings.textBcgWidth = textMetrics.width + settings.textPadding;

  // 根据类型设置canvas尺寸
  if (settings.type === 'text-icon') {
    settings.textBcgWidth = settings.textBcgWidth > settings.iconWidth ? settings.textBcgWidth : settings.iconWidth;
    canvas.width = settings.textBcgWidth;
    canvas.height = settings.textBcgHeight + settings.paddingTo + settings.iconHeight;
  } else if (settings.type === 'text') {
    canvas.width = settings.textBcgWidth;
    canvas.height = settings.textBcgHeight;
  }

  return new Promise((resolve) => {
    // 处理图片加载
    const imagePromises = [];
    const images = {};

    // 如果提供了图标URL，加载图标
    if (settings.iconUrl && settings.type === 'text-icon') {
      const iconPromise = new Promise((resolveIcon) => {
        images.icon = new Image();
        images.icon.onload = () => resolveIcon();
        images.icon.onerror = () => resolveIcon(); // 容错处理
        images.icon.src = new URL(settings.iconUrl, import.meta.url).href;
      });
      imagePromises.push(iconPromise);
    }

    // 如果提供了文字背景URL，加载背景图片
    if (settings.textBcgUrl) {
      const bgPromise = new Promise((resolveBg) => {
        images.bg = new Image();
        images.bg.onload = () => resolveBg();
        images.bg.onerror = () => resolveBg(); // 容错处理
        images.bg.src = new URL(settings.textBcgUrl, import.meta.url).href;
      });
      imagePromises.push(bgPromise);
    }

    // 等待所有图片加载完成
    Promise.all(imagePromises).then(() => {
      // 清除画布
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.beginPath();

      // 绘制背景
      if (settings.drawBackground) {
        if (images.bg) {
          // 使用图片背景
          context.drawImage(images.bg, 0, 0, settings.textBcgWidth, settings.textBcgHeight);
        } else {
          // 绘制带圆角的纯色背景
          context.fillStyle = settings.backgroundColor;
          context.roundRect(0, 0, settings.textBcgWidth, settings.textBcgHeight, settings.borderRadius);
          context.fill();
        }
      }

      // 绘制图标
      if (images.icon && settings.type === 'text-icon') {
        context.drawImage(
          images.icon,
          (canvas.width / 2) - (settings.iconWidth / 2),
          (settings.textBcgHeight + settings.paddingTo),
          settings.iconWidth,
          settings.iconHeight
        );
      }

      // 绘制文字
      context.fillText(settings.text, settings.textBcgWidth / 2, settings.textBcgHeight / 2);

      // 准备返回结果
      const result = {
        image: canvas.toDataURL(),
        pixelOffset: new Cesium.Cartesian2(0, Math.round(-canvas.height / 2))
      };

      // 调用回调函数
      if (typeof callback === 'function') {
        callback(result);
      }

      // 解决Promise
      resolve(result);
    });
  });
}

/**
 * 生成带圆角的纯色背景图片URL
 * @param {number} width 宽度
 * @param {number} height 高度
 * @param {string} color 背景颜色
 * @param {number} radius 圆角半径
 * @returns {string} 图片URL
 */
export function generateRoundedBg(width, height, color = 'rgba(33, 150, 243, 0.9)', radius = 8) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // 绘制圆角矩形
  ctx.fillStyle = color;
  ctx.roundRect(0, 0, width, height, radius);
  ctx.fill();
  
  return canvas.toDataURL();
}
