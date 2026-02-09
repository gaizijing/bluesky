// src/cesium/entities/routes/DangerLevel.js
import * as Cesium from 'cesium'

export class DangerLevel {
  /**
   * 根据危险指数获取颜色（红黄绿三色）
   * @param {Number} danger 危险指数(0-10)
   * @returns {Cesium.Color} 对应的颜色
   */
  getColorByDangerLevel(danger) {
    const normalized = Cesium.Math.clamp(danger, 0, 10);
    let meterial = new Cesium.PolylineGlowMaterialProperty()
    // 危险等级分三段：安全(绿)、警告(黄)、危险(红)
    if (normalized < 3) {
      meterial.color = Cesium.Color.GREEN.withAlpha(1); // 安全
    } else if (normalized < 7) {
      meterial.color = Cesium.Color.YELLOW.withAlpha(1); // 警告
    } else {
      meterial.color = Cesium.Color.RED.withAlpha(1); // 危险
    }
    return meterial
  }

  /**
   * 危险等级文本描述
   */
  getDangerText(danger) {
    if (danger < 3) return '安全（绿色）';
    if (danger < 7) return '警告（黄色）';
    return '危险（红色）';
  }

  /**
   * 天气提醒
   */
  getWeatherTips(danger) {
    const tips = [
      '天气晴朗，能见度佳，适合飞行',
      '局部有薄雾，注意保持航线',
      '风力较大，建议降低飞行高度',
      '有雷暴预警，建议暂停飞行'
    ];
    return danger < 3 ? tips[0] : danger < 7 ? tips[1] : tips[danger > 8 ? 3 : 2];
  }

  /**
   * 速度建议
   */
  getSpeedSuggestion(danger) {
    return danger < 3 ? '正常速度（800km/h）' : danger < 7 ? '减速至600km/h' : '紧急减速至400km/h';
  }
}