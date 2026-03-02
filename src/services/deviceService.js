import { useAreaStore } from '@/store/modules/area';
import { useDeviceStore } from '@/store/modules/device';
import { getDeviceCount, getDeviceAlarms, getDeviceHistory } from '@/api';

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

    const deviceStatus = await getDeviceCount();
    this.getDeviceStore().setDeviceCount(deviceStatus);

  }

  async loadEquipmentAlarm() {
    const alarmDetails = await getDeviceAlarms({ limit: 20 });
    this.getDeviceStore().setEquipmentAlarm(alarmDetails);

  }

  async loadHistoryData() {

    const historyData = await getDeviceHistory();
    this.getDeviceStore().setHistoryData(historyData);
  }
}

// 导出类，不创建单例
export { DeviceService };
