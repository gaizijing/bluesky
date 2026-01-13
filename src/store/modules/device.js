import { defineStore } from 'pinia';

export const useDeviceStore = defineStore('deviceCount', {
  state: () => ({
    deviceCount:[],
    equipmentAlarm:[],
    historyData:{}
  }),
  
  actions: {
    setDeviceCount(count) {
      this.deviceCount = count;
    },
    getDeviceCount() {
      return this.deviceCount;
    },
    setEquipmentAlarm(alarm) {
      this.equipmentAlarm = alarm;
    },
    getEquipmentAlarm() {
      return this.equipmentAlarm; 
    },
    setHistoryData(data) {
      this.historyData = data;
    },
    getHistoryData() {
      return this.historyData;  
    }
  },
  
  
});