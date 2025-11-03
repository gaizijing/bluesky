<template>
  <div class="setting-page">
    <screen-panel title="系统设置">
      <el-tabs v-model="activeTab" type="card" class="setting-tabs">
        <!-- 主题设置 -->
        <el-tab-pane label="主题设置" name="theme">
          <el-form :model="themeForm" label-width="120px" class="setting-form">
            <el-form-item label="主题颜色">
              <el-radio-group v-model="themeForm.themeColor">
                <el-radio label="blue">蓝色主题</el-radio>
                <el-radio label="dark">深色主题</el-radio>
                <el-radio label="light">浅色主题</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="面板透明度">
              <el-slider 
                v-model="themeForm.panelOpacity" 
                :min="0.1" 
                :max="1" 
                :step="0.1"
                show-input
              />
            </el-form-item>
            <el-form-item label="字体大小">
              <el-select v-model="themeForm.fontSize">
                <el-option label="小" value="small" />
                <el-option label="中" value="medium" />
                <el-option label="大" value="large" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Cesium设置 -->
        <el-tab-pane label="地图设置" name="cesium">
          <el-form :model="cesiumForm" label-width="120px" class="setting-form">
            <el-form-item label="基础图层">
              <el-select v-model="cesiumForm.baseLayer">
                <el-option label="OpenStreetMap" value="osm" />
                <el-option label="卫星地图" value="satellite" />
                <el-option label="地形地图" value="terrain" />
              </el-select>
            </el-form-item>
            <el-form-item label="粒子密度">
              <el-slider 
                v-model="cesiumForm.particleDensity" 
                :min="0.1" 
                :max="2" 
                :step="0.1"
                show-input
              />
            </el-form-item>
            <el-form-item label="动画速度">
              <el-slider 
                v-model="cesiumForm.animationSpeed" 
                :min="0.5" 
                :max="3" 
                :step="0.1"
                show-input
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 数据设置 -->
        <el-tab-pane label="数据设置" name="data">
          <el-form :model="dataForm" label-width="120px" class="setting-form">
            <el-form-item label="自动刷新频率">
              <el-select v-model="dataForm.refreshInterval">
                <el-option label="30秒" value="30" />
                <el-option label="1分钟" value="60" />
                <el-option label="5分钟" value="300" />
                <el-option label="关闭" value="0" />
              </el-select>
            </el-form-item>
            <el-form-item label="数据缓存">
              <el-switch v-model="dataForm.enableCache" />
              <span class="form-hint">开启后可减少重复请求，提高加载速度</span>
            </el-form-item>
            <el-form-item label="数据精度">
              <el-select v-model="dataForm.precision">
                <el-option label="低（快速加载）" value="low" />
                <el-option label="中（平衡）" value="medium" />
                <el-option label="高（精细）" value="high" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <div class="setting-actions">
        <el-button type="primary" @click="handleSave">保存设置</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>
    </screen-panel>
  </div>
</template>

<script setup>
import { ref, reactive, toRefs } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/store/modules/app'
import { useCesiumStore } from '@/store/modules/cesium'
import ScreenPanel from '@/layout/components/ScreenPanel.vue'

// 状态管理
const appStore = useAppStore()
const cesiumStore = useCesiumStore()
const router = useRouter()

// 当前激活的标签页
const activeTab = ref('theme')

// 主题设置表单
const themeForm = reactive({
  themeColor: appStore.themeColor,
  panelOpacity: appStore.panelOpacity,
  fontSize: appStore.fontSize
})

// Cesium设置表单
const cesiumForm = reactive({
  baseLayer: cesiumStore.baseLayer,
  particleDensity: cesiumStore.visualizationParams.particleDensity,
  animationSpeed: cesiumStore.visualizationParams.animationSpeed
})

// 数据设置表单
const dataForm = reactive({
  refreshInterval: appStore.refreshInterval,
  enableCache: appStore.enableCache,
  precision: appStore.dataPrecision
})

// 保存设置
const handleSave = () => {
  // 更新主题设置
  appStore.setTheme({
    themeColor: themeForm.themeColor,
    panelOpacity: themeForm.panelOpacity,
    fontSize: themeForm.fontSize
  })
  
  // 更新Cesium设置
  cesiumStore.setBaseLayer(cesiumForm.baseLayer)
  cesiumStore.updateVisualizationParams({
    particleDensity: cesiumForm.particleDensity,
    animationSpeed: cesiumForm.animationSpeed
  })
  
  // 更新数据设置
  appStore.setDataConfig({
    refreshInterval: dataForm.refreshInterval,
    enableCache: dataForm.enableCache,
    dataPrecision: dataForm.precision
  })
  
  ElMessage.success('设置保存成功')
  router.push('/dashboard')
}

// 重置设置
const handleReset = () => {
  // 重置为当前存储的设置
  Object.assign(themeForm, {
    themeColor: appStore.themeColor,
    panelOpacity: appStore.panelOpacity,
    fontSize: appStore.fontSize
  })
  
  Object.assign(cesiumForm, {
    baseLayer: cesiumStore.baseLayer,
    particleDensity: cesiumStore.visualizationParams.particleDensity,
    animationSpeed: cesiumStore.visualizationParams.animationSpeed
  })
  
  Object.assign(dataForm, {
    refreshInterval: appStore.refreshInterval,
    enableCache: appStore.enableCache,
    precision: appStore.dataPrecision
  })
}
</script>

<style scoped lang="scss">
.setting-page {
  width: 100%;
  height: 100%;
}

.setting-tabs {
  margin-bottom: 20px;

  .el-tabs__content {
    padding: 20px 0;
  }
}

.setting-form {
  max-width: 600px;

  .el-form-item {
    margin-bottom: 20px;
    color: #fff;

    .form-hint {
      margin-left: 10px;
      color: #999;
      font-size: 12px;
    }
  }
}

.setting-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 30px;
}
</style>