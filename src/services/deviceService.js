import { useAreaStore } from '@/store/modules/area';
import { useDeviceStore } from '@/store/modules/device';
class DeviceService {
  constructor() {
  }

  // 获取store实例
  getAreaStore() {
    return useAreaStore();
  }
  getDeviceStore() {
    return useDeviceStore();
  }
  async loadDeviceCount() {
    // 设备状态数据
    const deviceStatus = [
      {
        type: "weatherStation",
        name: "自动气象站",
        online: 3,
        total: 4,
        status: "normal",
        icon: "btn_img2",
      },
      {
        type: "windLidarSmall",
        name: "激光测风雷达",
        online: 4,
        total: 4,
        status: "normal",
        icon: "btn_img3",
      },
      {
        type: "windLidar3D",
        name: "三维激光测风雷达",
        online: 1,
        total: 1,
        status: "normal",
        icon: "btn_img4",
      },
      {
        type: "weatherRadar",
        name: "小型天气雷达",
        online: 1,
        total: 1,
        status: "normal",
        icon: "btn_img2",
      },
    ];
    this.getDeviceStore().setDeviceCount(deviceStatus);
  }
  async loadEquipmentAlarm() {
    const alarmDetails = [
      { date: '10-29', deviceType: '气象站', deviceName: '自动气象站01', alarmContent: '风速超限', alarmTime: '2023-10-29 08:30:15' },
      { date: '10-29', deviceType: '雷达', deviceName: '小型天气雷达', alarmContent: '信号异常', alarmTime: '2023-10-29 14:22:45' },
      { date: '10-30', deviceType: '激光雷达', deviceName: '测风雷达02', alarmContent: '数据缺失', alarmTime: '2023-10-30 09:15:30' },
      { date: '10-31', deviceType: '气象站', deviceName: '自动气象站03', alarmContent: '温度传感器故障', alarmTime: '2023-10-31 11:45:20' },
      { date: '10-31', deviceType: '激光雷达', deviceName: '三维激光雷达', alarmContent: '电源波动', alarmTime: '2023-10-31 16:10:05' },
      { date: '10-31', deviceType: '气象站', deviceName: '自动气象站02', alarmContent: '湿度超限', alarmTime: '2023-10-31 18:55:40' },
      { date: '11-01', deviceType: '雷达', deviceName: '小型天气雷达', alarmContent: '天线故障', alarmTime: '2023-11-01 07:20:10' },
      { date: '11-02', deviceType: '激光雷达', deviceName: '测风雷达01', alarmContent: '通信中断', alarmTime: '2023-11-02 13:35:55' },
      { date: '11-03', deviceType: '气象站', deviceName: '自动气象站01', alarmContent: '气压异常', alarmTime: '2023-11-03 10:40:25' },
      { date: '11-04', deviceType: '激光雷达', deviceName: '三维激光雷达', alarmContent: '激光器温度过高', alarmTime: '2023-11-04 15:15:35' },
      { date: '11-04', deviceType: '气象站', deviceName: '自动气象站04', alarmContent: '降水传感器堵塞', alarmTime: '2023-11-04 17:30:50' },
      { date: '11-04', deviceType: '气象站', deviceName: '自动气象站05', alarmContent: '风向传感器异常', alarmTime: '2023-11-04 19:45:12' },
      { date: '11-04', deviceType: '激光雷达', deviceName: '测风雷达03', alarmContent: '激光功率下降', alarmTime: '2023-11-04 21:30:45' }
    ];
    this.getDeviceStore().setEquipmentAlarm(alarmDetails);
  }
  async loadHistoryData() {
    const timeLabels = Array.from({ length: 12 }, (_, i) => {
      const time = new Date(Date.now() - (11 - i) * 3600000);
      return time.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    });

    // 折线图数据
    const trendData = {
      temperature: [
        25.1, 25.3, 24.9, 24.7, 25.0, 25.5, 26.1, 26.3, 25.9, 25.6, 25.3, 25.0,
      ],
      humidity: [62, 63, 65, 66, 64, 63, 61, 60, 62, 64, 65, 63],
      windSpeed: [4.2, 4.5, 4.8, 5.1, 4.7, 4.3, 4.0, 3.8, 4.1, 4.4, 4.6, 4.3],
    };

    // 时序图数据
    const timelineData = {
      radialSpeed: [8.2, 8.5, 8.3, 8.7, 8.4, 8.6, 8.8, 8.5, 8.3, 8.1, 8.4, 8.6],
      speedStd: [1.2, 1.3, 1.1, 1.4, 1.2, 1.3, 1.1, 1.2, 1.3, 1.1, 1.2, 1.3],
      snr: [35, 36, 37, 36, 35, 34, 33, 34, 35, 36, 37, 36],
    };

    // 雷达图数据
    const radarData = [
      { name: "温度", value: 25.5 },
      { name: "湿度", value: 64 },
      { name: "风速", value: 4.5 },
      { name: "风向", value: 180 },
      { name: "气压", value: 1012.0 },
    ];

    // 天气雷达图数据
    const weatherRadarData = [
      { value: 30, name: "弱回波" },
      { value: 60, name: "中回波" },
      { value: 90, name: "强回波" },
    ];

    // 历史数据
    const historyData = {
      timeLabels,
      trendData,
      timelineData,
      radarData,
      weatherRadarData
    };

    this.getDeviceStore().setHistoryData(historyData);
  }
}

// 导出类，不创建单例
export { DeviceService };