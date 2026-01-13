import { fetchAreaList, fetchCurrentSelectedArea, addNewArea } from '@/api';
import { useAreaStore } from '@/store/modules/area';
import { updateSelectedArea } from "@/api";

// 使用延迟初始化模式解决循环依赖问题
class AreaService {
  constructor() {
    this.areaStore = useAreaStore();
    // 延迟初始化，不在构造函数中创建依赖实例
    this.initializationService = null;
  }
  
  // 获取InitializationService实例（懒加载）
  getInitializationService() {
    if (!this.initializationService) {
      // 动态导入解决循环依赖
      const { InitializationService } = require('./initialization');
      this.initializationService = new InitializationService();
    }
    return this.initializationService;
  }

  async loadAreaList() {
    try {
      const areasData = await fetchAreaList();
      this.areaStore.setAreaList(areasData);
      return areasData;
    } catch (error) {
      console.error('加载区域列表数据失败:', error);
      throw error;
    }
  }

  async loadCurrentSelectedArea() {
    try {
      const currentArea = await fetchCurrentSelectedArea();
      console.log('currentArea', currentArea);
      this.areaStore.setSelectedArea(currentArea);
      return currentArea;
    } catch (error) {
      console.error('加载当前选中区域数据失败:', error);
      throw error;
    }
  }

  async createArea(areaData) {
    try {
      const newAreaData = {
        name: areaData.name,
        type: areaData.type,
        location: `${areaData.bbox.west.toFixed(2)}, ${areaData.bbox.south.toFixed(2)}`,
        coordinates: [
          (areaData.bbox.west + areaData.bbox.east) / 2,
          (areaData.bbox.south + areaData.bbox.north) / 2
        ],
        bbox: areaData.bbox
      };

      const newArea = await addNewArea(newAreaData);
      const updatedList = [newAreaData, ...this.areaStore.areaList];
      this.areaStore.setAreaList(updatedList);
      return newArea;
    } catch (error) {
      console.error('创建重点关注区域失败:', error);
      throw error;
    }
  }

  async updateSelectedArea(areaData) {
    try {
      await updateSelectedArea(areaData);
      this.areaStore.setSelectedArea(areaData);
      await Promise.all([
        this.getInitializationService().initializeAreaWeatherData(),
        this.getInitializationService().initializeMapWeatherLayer(),
        this.getInitializationService().initializeModuleData(),
      ]); 
    } catch (error) {
      console.error('更新当前选中区域失败:', error);
      throw error;
    }
  }
}

export { AreaService };