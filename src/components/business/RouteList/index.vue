<template>
  <div class="route-list-container">
    <!-- 航线列表 -->
    <div class="routes-table">
      <div class="table-header">
        <div class="table-column route-name">航线名称</div>
        <div class="table-column route-length">总长(km)</div>
        <div class="table-column segment-count">航段数</div>
        <div class="table-column avg-risk">平均风险</div>
        <div class="table-column max-risk">最高风险段</div>
        <div class="table-column actions">操作</div>
      </div>
      
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>加载航线数据中...</p>
      </div>
      
      <!-- 空状态 -->
      <div v-if="!isLoading && filteredRoutes?.length === 0" class="empty-state">
        <p>没有找到匹配的航线数据</p>
      </div>
      
      <!-- 航线列表项 -->
      <div 
        v-for="route in filteredRoutes" 
        :key="route.id" 
        class="route-item"
        :class="{ 
          'high-risk': route.highestRisk >= 0.7, 
          'medium-risk': route.highestRisk >= 0.3 && route.highestRisk < 0.7,
          'low-risk': route.highestRisk < 0.3
        }"
        @doubleclick="openAnalysis(route)"
      >
        <!-- 第一行：基本信息 -->
        <div class="route-basic-info">
          <div class="table-column route-name">
            <div class="route-title">{{ route.name }}</div>
            <div class="route-subtitle">{{ route.segments }}段航程</div>
          </div>
          
          <div class="table-column route-length">
            <div class="primary-text">{{ route.length.toFixed(1) }}</div>
          </div>
          <div class="table-column segment-count">
            <div class="primary-text">{{ route.segments }}</div>
          </div>
          <div class="table-column avg-risk">
            <div class="risk-badge" :class="getRiskClass(route.averageRisk)">
              <span class="risk-dot" :style="{ backgroundColor: getRiskColor(route.averageRisk) }"></span>
              <span class="risk-value">{{ route.averageRisk.toFixed(2) }}</span>
            </div>
            <div class="risk-label">{{ getRiskText(route.averageRisk) }}</div>
          </div>
          <div class="table-column max-risk">
            <div class="segment-info">
              <span class="segment-number">第{{ route.highestRiskSegment }}段</span>
            </div>
            <div class="risk-badge" :class="getRiskClass(route.highestRisk)">
              <span class="risk-value">{{ route.highestRisk.toFixed(2) }}</span>
            </div>
          </div>
          <div class="table-column actions">
            <button class="analyze-btn" @click="openAnalysis(route)">
              <span>分析</span>
            </button>
          </div>
        </div>
        
        <!-- 第二行：航程可视化 -->
        <div class="route-visual-info" v-if="route.segmentData && route.segmentData.length > 0">
          <div class="visual-container">
            <!-- 分段风险条（长度=公里数占比，颜色=风险等级） -->
            <div class="segment-bars">
              <div 
                v-for="(segment, idx) in route.segmentData"
                :key="idx"
                class="segment-bar"
                :style="{ 
                  width: `${getSegmentWidth(segment, route)}%`, // 长度对应公里数占比
                  backgroundColor: getRiskColor(segment.risk), // 颜色对应风险
                  marginRight: idx < route.segmentData.length - 1 ? '2px' : '0'
                }"
                @mouseenter="showSegmentTooltip = true; currentSegment = segment; setTooltipPos(idx, route.id)"
                @mouseleave="showSegmentTooltip = false"
              >
                <!-- 航段序号（hover显示） -->
                <div class="segment-number">{{ segment.segment }}</div>
              </div>
            </div>
            <!-- 可视化图例（精简） -->
            <div class="visual-legend">
              <span class="legend-item">
                <span class="legend-dot" style="background-color: #10b981;"></span>低
              </span>
              <span class="legend-item">
                <span class="legend-dot" style="background-color: #f59e0b;"></span>中
              </span>
              <span class="legend-item">
                <span class="legend-dot" style="background-color: #ef4444;"></span>高
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 航段详情悬浮tooltip -->
    <div
      v-if="showSegmentTooltip && currentSegment"
      class="segment-tooltip"
      :style="{ left: tooltipLeft + 'px', top: tooltipTop + 'px' }"
    >
      <div class="tooltip-header">
        <h4>第{{ currentSegment.segment }}航段</h4>
      </div>
      <div class="tooltip-content">
        <p><span>距离：</span>{{ currentSegment.distance ? currentSegment.distance.toFixed(1) : 'N/A' }}km</p>
        <p><span>风险等级：</span>{{ getRiskText(currentSegment.risk) }}</p>
        <p><span>风速：</span>{{ currentSegment.windSpeed || 'N/A' }}m/s</p>
        <p><span>风切变：</span>{{ currentSegment.windShear ? currentSegment.windShear.toFixed(1) : 'N/A' }}</p>
        <p><span>湍流：</span>{{ currentSegment.turbulence ? currentSegment.turbulence.toFixed(1) : 'N/A' }}</p>
      </div>
    </div>
    
    <!-- 航线分析弹窗 -->
    <div v-if="showAnalysisModal" class="modal-overlay" @click="closeModal">
      <div class="dialog-container" @click.stop>
        <div class="dialog-header">
          <h3>航线分析 - {{ currentRoute.name }}</h3>
          <button class="dialog-close" @click="closeModal">×</button>
        </div>
        <div class="dialog-conten">
          <RouterRisk 
            :current-route="currentRoute" 
            :route-data="currentRouteData"
          />
        </div>
        <div class="modal-footer">
          <button class="export-btn" @click="exportAnalysis">导出分析报告</button>
          <button class="close-modal-btn" @click="closeModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import RouterRisk from "@/components/business/RouterRisk/index.vue"; 

// 状态管理
const routes = ref([]);
const isLoading = ref(true);
const isRefreshing = ref(false);
const searchKeyword = ref("");
const showAnalysisModal = ref(false);
const currentRoute = ref(null);
const currentRouteData = ref([]);
// 航段tooltip状态
const showSegmentTooltip = ref(false);
const currentSegment = ref(null);
const tooltipLeft = ref(0);
const tooltipTop = ref(0);

// 过滤后的航线列表
const filteredRoutes = computed(() => {
  if (!searchKeyword.value) return routes.value;
  const keyword = searchKeyword.value.toLowerCase();
  return routes.value.filter(route => 
    route.name.toLowerCase().includes(keyword)
  );
});

// 生成模拟航线列表数据
const generateRoutes = () => {
  const routeCount = 5 + Math.floor(Math.random() * 6);
  const result = [];
  
  for (let i = 0; i < routeCount; i++) {
    const segments = 3 + Math.floor(Math.random() * 8); // 3-10段（便于可视化）
    const length = 10 + Math.random() * 40; // 10-50km
    
    const segmentData = generateRouteData(segments, length);
    const risks = segmentData.map(s => s.risk);
    const averageRisk = risks.reduce((sum, r) => sum + r, 0) / risks.length;
    const highestRisk = Math.max(...risks);
    const highestRiskSegment = risks.indexOf(highestRisk) + 1;
    
    // 生成贴合截图的航线名称
    const locationPairs = [
      "万达天健湖站-柳树塘公交站",
      "血液中心站-华安脑科医院站",
      "合肥三院-滨湖站",
      "合肥妇保东区站-南院站",
      "基地X-作业区1",
      "机场A-作业区2",
      "作业区3-机场B"
    ];
    const randomName = locationPairs[Math.floor(Math.random() * locationPairs.length)];
    
    result.push({
      id: `route-${i + 1}`,
      name: randomName,
      length,
      segments,
      averageRisk,
      highestRisk,
      highestRiskSegment,
      segmentData
    });
  }
  return result;
};

// 生成单个航线的详细数据（优化航段距离计算）
const generateRouteData = (segments, totalLength) => {
  const segmentData = [];
  let accumulatedDistance = 0;
  
  for (let i = 0; i < segments; i++) {
    // 随机生成单个航段长度（总和=总长度）
    const segmentLength = i === segments - 1 
      ? totalLength - accumulatedDistance 
      : (totalLength - accumulatedDistance) * (0.1 + Math.random() * 0.2);
    
    accumulatedDistance += segmentLength;
    const baseRisk = 0.2 + Math.sin(i * 0.6) * 0.3 + Math.random() * 0.4;
    const risk = Math.min(1, Math.max(0, baseRisk));
    
    segmentData.push({
      segment: i + 1,
      distance: accumulatedDistance,
      segmentLength, // 新增：单个航段长度（用于可视化）
      risk,
      windSpeed: +(3 + Math.random() * 12).toFixed(1),
      windDir: Math.floor(Math.random() * 360),
      windShear: risk * 10,
      turbulence: +(risk * 8 + Math.random() * 2).toFixed(1),
      rainfall: +(risk * 4 + Math.random() * 1).toFixed(1),
      coordinates: [116.3 + i * 0.06, 39.9 + i * 0.04],
    });
  }
  return segmentData;
};

// 计算航段可视化宽度（占总长度的百分比）
const getSegmentWidth = (segment, route) => {
  return (segment.segmentLength / route.length) * 95; // 95%避免溢出，留5%间距
};

// 加载航线数据
const loadRoutes = async () => {
  isLoading.value = true;
  try {
    await new Promise(resolve => setTimeout(resolve, 800));
    routes.value = generateRoutes();
  } catch (error) {
    console.error("加载航线数据失败:", error);
  } finally {
    isLoading.value = false;
  }
};

// 刷新航线数据
const refreshRoutes = async () => {
  isRefreshing.value = true;
  try {
    await new Promise(resolve => setTimeout(resolve, 800));
    routes.value = generateRoutes();
  } finally {
    isRefreshing.value = false;
  }
};

// 打开航线分析弹窗
const openAnalysis = (route) => {
  currentRoute.value = { name: route.name, length: route.length, segments: route.segments };
  currentRouteData.value = route.segmentData;
  showAnalysisModal.value = true;
  document.body.style.overflow = "hidden";
};

// 关闭弹窗
const closeModal = () => {
  showAnalysisModal.value = false;
  currentRoute.value = null;
  currentRouteData.value = [];
  document.body.style.overflow = "";
};

// 导出分析报告
const exportAnalysis = () => {
  if (!currentRoute.value) return;
  alert(`正在导出 ${currentRoute.value.name} 的分析报告...`);
  console.log("导出数据:", { route: currentRoute.value, data: currentRouteData.value });
};

// 航段tooltip位置设置
const setTooltipPos = (idx, routeId) => {
  // 使用 nextTick 确保 DOM 更新后再获取位置
  setTimeout(() => {
    const element = document.querySelector(`[data-route-id="${routeId}"] .segment-bar:nth-child(${idx + 1})`);
    if (element) {
      const rect = element.getBoundingClientRect();
      tooltipLeft.value = rect.left + window.scrollX + 10;
      tooltipTop.value = rect.bottom + window.scrollY + 10;
    }
  }, 0);
};

// 风险辅助函数（复用原有）
const getRiskColor = (value) => {
  if (value < 0.3) return "#10b981"; // 低风险-绿
  if (value < 0.7) return "#f59e0b"; // 中风险-黄
  return "#ef4444"; // 高风险-红
};
const getRiskClass = (value) => {
  if (value < 0.3) return "low";
  if (value < 0.7) return "medium";
  return "high";
};
const getRiskText = (value) => {
  if (value < 0.3) return "低风险";
  if (value < 0.7) return "中风险";
  return "高风险";
};

// 初始化加载数据
onMounted(() => {
  loadRoutes();
});
</script>

<style scoped lang="scss">
.route-list-container {
}
.routes-table {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.2fr 1.3fr 1fr;
  font-weight: 600;
  font-size: 13px;
  position: sticky;
  top: 0;
  background-color: #0f1733;
  z-index: 10;
  
  .table-column {
    color: #94a3b8;
    display: flex;
    align-items: center;
    padding: 10px 5px;
  }
}

.route-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
  position: relative;
  
  &:hover {
    background-color: rgba(56, 70, 100, 0.3);
  }
  
  &.high-risk {
    border-left: 4px solid #ef4444;
  }
  &.medium-risk {
    border-left: 4px solid #f59e0b;
  }
  &.low-risk {
    border-left: 4px solid #10b981;
  }
}

.route-basic-info {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.2fr 1.3fr 1fr;
  padding: 9px 5px;
  align-items: center;
}

.route-visual-info {
  padding: 0 5px 10px 5px;
  
  .visual-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  
  .segment-bars {
    width: 100%;
    height: 24px;
    display: flex;
    align-items: center;
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    padding: 0 3px;
    overflow: hidden;
  }
  
  .segment-bar {
    height: 16px;
    border-radius: 3px;
    transition: height 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    
    &:hover {
      height: 20px;
      z-index: 5;
    }
    
    .segment-number {
      color: #fff;
      font-size: 10px;
      font-weight: 600;
      opacity: 0.8;
    }
  }
  
  .visual-legend {
    display: flex;
    gap: 10px;
    padding-left: 3px;
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 10px;
      color: #94a3b8;
    }
    
    .legend-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
  }
}

/* 原有样式保持不变 */
.table-column {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 5px;
  
  &.route-name {
    .route-title {
      font-size: 14px;
      font-weight: 600;
      color: #e2e8f0;
      margin-bottom: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .route-subtitle {
      font-size: 12px;
      color: #94a3b8;
    }
  }
  
  &.route-length,
  &.segment-count {
    .primary-text {
      font-size: 15px;
      font-weight: 600;
      color: #e2e8f0;
    }
  }
  
  &.avg-risk {
    .risk-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 12px;
      width: fit-content;
      margin-bottom: 4px;
      
      &.low { background: rgba(16, 185, 129, 0.15); }
      &.medium { background: rgba(245, 158, 11, 0.15); }
      &.high { background: rgba(239, 68, 68, 0.15); }
      
      .risk-dot { width: 8px; height: 8px; border-radius: 50%; }
      .risk-value { font-size: 13px; font-weight: 600; }
    }
    
    .risk-label { font-size: 12px; color: #94a3b8; }
  }
  
  &.max-risk {
    .segment-info {
      display: flex;
      align-items: center;
      margin-bottom: 4px;
      
      .segment-number { font-size: 13px; color: #e2e8f0; font-weight: 500; }
    }
    
    .risk-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 10px;
      width: fit-content;
      
      &.low { background: rgba(16, 185, 129, 0.15); color: #10b981; }
      &.medium { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
      &.high { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
      
      .risk-value { font-size: 12px; font-weight: 600; }
    }
  }
  
  &.actions { align-items: flex-end; }
}

.analyze-btn {
  padding: 6px 12px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
  
  &:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3); }
  &:active { transform: translateY(0); }
}

/* 航段tooltip样式 */
.segment-tooltip {
  position: fixed;
  background-color: rgba(15, 23, 51, 0.95);
  border: 1px solid #3b82f6;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  pointer-events: none;
  width: 180px;
  
  .tooltip-header {
    padding: 6px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    h4 { margin: 0; font-size: 13px; color: #3b82f6; }
  }
  
  .tooltip-content {
    padding: 8px 10px;
    font-size: 12px;
    p { margin: 3px 0; line-height: 1.3; span { color: #94a3b8; display: inline-block; width: 60px; } }
  }
}

/* 原有加载、空状态、弹窗样式保持不变 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #94a3b8;
  
  .spinner {
    width: 30px; height: 30px;
    border: 3px solid rgba(59, 130, 246, 0.3);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 15px;
  }
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #94a3b8;
}
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 20px;
}
.modal-content {
  background-color: #0f1733; border-radius: 8px;
  width: 100%; max-width: 1000px; max-height: 90vh;
  display: flex; flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 15px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  h3 { margin: 0; font-size: 18px; color: #ffffff; }
}
.close-btn {
  background: none; border: none; color: #94a3b8; font-size: 20px;
  cursor: pointer; transition: color 0.2s; &:hover { color: #ffffff; }
}
.modal-body { flex: 1; overflow-y: auto; padding: 20px; }
.modal-footer {
  padding: 15px 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex; justify-content: flex-end; gap: 10px;
}
.export-btn {
  padding: 8px 16px;
  background-color: rgba(59, 130, 246, 0.1);
  border: 1px solid #3b82f6; color: #3b82f6;
  border-radius: 4px; cursor: pointer; transition: all 0.2s;
  &:hover { background-color: rgba(59, 130, 246, 0.2); }
}
.close-modal-btn {
  padding: 8px 16px; background-color: #3b82f6; color: white;
  border: none; border-radius: 4px; cursor: pointer;
  transition: background-color 0.2s; &:hover { background-color: #2563eb; }
}

@keyframes spin { to { transform: rotate(360deg); } }

/* 响应式调整 */
@media (max-width: 1200px) {
  .table-header, .route-basic-info {
    grid-template-columns: 1.8fr 1fr 1fr 1fr 1fr 1fr;
  }
}

@media (max-width: 992px) {
  .table-header .avg-risk, .route-basic-info .avg-risk { display: none; }
  .table-header, .route-basic-info {
    grid-template-columns: 1.8fr 1fr 1fr 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .table-header .max-risk, .route-basic-info .max-risk { display: none; }
  .table-header, .route-basic-info {
    grid-template-columns: 1.5fr 1fr 1fr 1fr;
  }
  
  .route-visual-info .segment-bars { height: 20px; }
  .route-visual-info .segment-bar { height: 12px; }
  .route-visual-info .segment-bar:hover { height: 16px; }
  .visual-legend { display: none; }
  
  .table-column.actions {
    flex-direction: row;
    justify-content: flex-end;
  }
}
</style>