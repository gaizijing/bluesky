<template>
  <div class="profile-container">
    <div ref="chartRef" class="profile-chart" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch,nextTick  } from "vue";
import * as echarts from "echarts";

const chartRef = ref(null);
let chart = null;

const features = [
  "气温",
  "湿度",
  "风速",
  "能见度",
  "降水量",
  "湍流强度",
  "风切变",
];
const heights = Array.from({ length: 101 }, (_, i) => i * 10); // 0..1000 每10m一层

// 存放每小时的原始值和评分数据
const hourlyRawStore = []; // length 24, each is rawStore object like { "xi_yi": raw }
const hourlyData = []; // length 24, each is array of [xi, yi, score]

/** ----- 模拟函数：按小时生成“更真实”的剖面数据 ----- **/
const simulateProfileForHour = (feature, hour) => {
  // hour: 0..23, we add diurnal variation (e.g., temperature lower at night)
  const arr = [];
  for (let i = 0; i < heights.length; i++) {
    const h = heights[i];
    let raw;
    const diurnalFactor = Math.cos(((hour - 14) / 24) * 2 * Math.PI); // peak ~14:00
    if (feature === "气温") {
      // 基线 20°C，昼夜摆动 ±4°C，随高度递减 ~6.5C/km
      const surfaceBase = 20 + 4 * diurnalFactor;
      raw = surfaceBase - 6.5 * (h / 1000) + (Math.random() - 0.5) * 0.6;
    } else if (feature === "湿度") {
      // 基线 70%，夜晚更湿（-diurnalFactor）
      const base = 70 - 8 * diurnalFactor;
      raw = base - 30 * (h / 1000) + (Math.random() - 0.5) * 2.5;
      raw = Math.max(2, Math.min(100, raw));
    } else if (feature === "风速") {
      // 风速日变小幅度：2->12
      const base = 2 + 10 * (h / 1000);
      raw = base + (Math.random() - 0.5) * 0.8 + 1.2 * -diurnalFactor; // 小幅昼夜变化
      raw = Math.max(0, raw);
    } else if (feature === "能见度") {
      // 夜间可能能见度降低（雾/污染），昼间增大
      const base = 5 + 12 * (h / 1000);
      raw = base + (Math.random() - 0.5) * 1.2 + 2 * diurnalFactor;
      raw = Math.max(0.05, raw);
    } else if (feature === "降水量") {
      // 假设弱降水，随高度略降；小时上随机起伏
      raw = Math.max(
        0,
        0.8 +
          Math.sin(hour / 3) * 0.5 -
          0.0012 * h +
          (Math.random() - 0.5) * 0.4
      );
    } else if (feature === "湍流强度") {
      raw = 0.25 + 0.5 * Math.exp(-h / 600) + (Math.random() - 0.4) * 0.06;
      raw = Math.max(0, raw);
    } else if (feature === "风切变") {
      raw =
        0.15 + 0.9 * Math.exp(-h / 400) * 0.6 + (Math.random() - 0.5) * 0.06;
      raw = Math.max(0, raw);
    }
    // Optional smoothing: small vertical smoothing to reduce noise between adjacent layers
    arr.push(raw);
  }
  return arr;
};

const scoreFromRaw = (feature, raw) => {
  if (feature === "气温") {
    const ideal = 25;
    let score = 100 - Math.abs(raw - ideal) * 3.5;
    return Math.max(0, Math.min(100, score));
  } else if (feature === "湿度") {
    if (raw >= 30 && raw <= 80) return 100;
    if (raw < 30) return Math.max(0, 100 - (30 - raw) * 2.5);
    return Math.max(0, 100 - (raw - 80) * 3.5);
  } else if (feature === "风速") {
    if (raw < 6) return Math.max(0, 100 - raw * 2);
    if (raw < 10) return Math.max(0, 80 - (raw - 6) * 7.5);
    if (raw < 15) return Math.max(0, 50 - (raw - 10) * 10);
    return 10;
  } else if (feature === "能见度") {
    return Math.max(0, Math.min(100, (raw / 20) * 100));
  } else if (feature === "降水量") {
    if (raw <= 0) return 100;
    if (raw <= 2) return Math.max(0, 90 - raw * 10);
    if (raw <= 5) return Math.max(0, 60 - (raw - 2) * 12);
    return 10;
  } else if (feature === "湍流强度") {
    return Math.max(0, Math.min(100, 100 - raw * 120));
  } else if (feature === "风切变") {
    return Math.max(0, Math.min(100, 100 - raw * 120));
  }
  return 50;
};

// 预生成 24 小时的数据
const generateHourly = () => {
  for (let hour = 0; hour < 24; hour++) {
    const rawStore = {};
    const data = [];
    features.forEach((f, xi) => {
      const profile = simulateProfileForHour(f, hour);
      // optional vertical smoothing by averaging neighbors (simple)
      const smooth = profile.map((v, idx, arr) => {
        const left = arr[idx - 1] ?? v;
        const right = arr[idx + 1] ?? v;
        return (left + v + right) / 3;
      });
      smooth.forEach((raw, yi) => {
        const score = scoreFromRaw(f, raw);
        data.push([xi, yi, score]);
        rawStore[`${xi}_${yi}`] = raw;
      });
    });
    hourlyRawStore[hour] = rawStore;
    hourlyData[hour] = data;
  }
};

generateHourly();

// tooltip will access current rawStore variable - we'll keep a pointer.
let activeRawStore;

/** build base option (static parts). series.data will be filled dynamically. */
const baseOption = () => {
  return {
    tooltip: {
      position: "top",
      backgroundColor: "rgba(0,0,0,0.75)",
      textStyle: { color: "#fff" },
      formatter: function (p) {
        const f = features[p.value[0]];
        const h = heights[p.value[1]];
        const score = p.value[2];
        const raw = activeRawStore[`${p.value[0]}_${p.value[1]}`];
        const unit = ((fe) => {
          if (fe === "气温") return "°C";
          if (fe === "湿度") return "%";
          if (fe === "风速") return "m/s";
          if (fe === "能见度") return "km";
          if (fe === "降水量") return "mm/h";
          return "";
        })(f);

        const levelText = (function (feature, raw) {
          if (feature === "气温") {
            if (raw < 30) return "适飞";
            if (raw < 35) return "较适";
            if (raw < 40) return "较差";
            return "不适";
          } else if (feature === "湿度") {
            if (raw >= 30 && raw <= 80) return "适飞";
            if (raw >= 20 && raw <= 90) return "较适";
            if (raw >= 10 && raw <= 95) return "较差";
            return "不适";
          } else if (feature === "风速") {
            if (raw < 6) return "适飞";
            if (raw < 10) return "较适";
            if (raw < 15) return "较差";
            return "不适";
          } else if (feature === "能见度") {
            if (raw >= 10) return "适飞";
            if (raw >= 5) return "较适";
            if (raw >= 2) return "较差";
            return "不适";
          } else if (feature === "降水量") {
            if (raw <= 0) return "适飞";
            if (raw <= 2) return "较适";
            if (raw <= 5) return "较差";
            return "不适";
          } else if (feature === "湍流强度") {
            if (raw < 0.3) return "适飞";
            if (raw < 0.6) return "较适";
            if (raw < 0.9) return "较差";
            return "不适";
          } else if (feature === "风切变") {
            if (raw < 0.3) return "适飞";
            if (raw < 0.6) return "较适";
            if (raw < 0.9) return "较差";
            return "不适";
          }
          return "";
        })(f, raw);

        return `${f}<br/>高度：${h} m<br/>原始值：${
          raw === null
            ? "—"
            : typeof raw === "number"
            ? raw.toFixed(2) + (unit || "")
            : raw
        }<br/>适飞评分：${score.toFixed(0)}<br/>等级：${levelText}`;
      },
    },
    grid: { left: 35, right: 50, top: 20, bottom: 80 },
    xAxis: {
      type: "category",
      data: features,
      axisLine: { lineStyle: { color: "#5e6a78" } },
      axisLabel: {
        color: "#cfe6ff",
        fontSize: 10,
        rotate: 45, // 文字倾斜45度
        hideOverlap: false, // 不隐藏重叠的标签
        interval: 0, // 显示所有标签
      },
    },
    yAxis: {
      type: "category",
      data: heights.map((h) => String(h)),
      inverse: true,
      axisLine: { lineStyle: { color: "#5e6a78" } },
      axisLabel: { color: "#bcd7ff" },
      name: "高度",
      nameTextStyle: { color: "#bcd7ff" },
      splitLine: { show: true, lineStyle: { color: "rgba(255,255,255,0.03)" } },
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: false,
      orient: "vertical",
      right: 10,
      top: "center",
      inRange: {
        // 从低分（不适）到高分（适飞）： 红 -> ... -> 绿
        color: [
          "rgba(0, 128, 128, 0.5)", // 深蓝绿色（不适）
          "rgba(0, 170, 128, 0.5)", // 绿色（适飞）
          "rgba(144, 238, 144, 0.5)", // 浅绿色（适飞）
          "rgba(255, 165, 0, 0.5)", // 橙色（较适）
          "rgba(255, 140, 0, 0.5)", // 橙红色（较差）
          "rgba(139, 0, 0, 0.5)",
        ],
      },
      text: ["不适", "适飞"],
      textStyle: { color: "#fff" },
    },
    series: [
      {
        name: "适飞评分剖面",
        type: "custom",
        data: [], // 初始为空，稍后赋值
        emphasis: {
          itemStyle: { shadowBlur: 8, shadowColor: "rgba(255,255,255,0.6)" },
        },
        progressive: 2000,
        itemStyle: {
          borderRadius: 4,
        },
        renderItem(params, api) {
          const x = api.coord([api.value(0), 0])[0];
          const y = api.coord([0, api.value(1)])[1];
          const cellWidth = 10; // 控制“柱子”宽度
          const cellHeight = 10;
          return {
            type: "rect",
            shape: {
              x: x - cellWidth / 2,
              y: y - cellHeight / 2,
              width: cellWidth,
              height: cellHeight,
            },
            style: { fill: api.visual("color") },
          };
        },
      },
    ],
    timeline: {
      axisType: "category",
      orient: "horizontal",
      autoPlay: false,
      playInterval: 1200, // 每1.2秒切换
      loop: true,
      rewind: true,
      show: true,
      bottom: 0,
      left: "10",
      right: "10%",
      data: Array.from({ length: 24 }, (_, i) => ({
        value: i,
        name: `${i}时`,
      })),
      label: {
        color: "#cfe6ff",
        fontSize: 12,
      },
      symbol: "none",
      checkpointStyle: {
        symbol: "image://ic_progress_dot.png",
        symbolSize: [20, 20], // 图片大小 [width, height]
        color: "#06b6d4", // 使默认颜色透明
        borderColor: "transparent", // 使边框透明
        borderWidth: 0,
      },
      controlStyle: {
        show: true,
        showPlayBtn: true,
        showPrevBtn: true,
        showNextBtn: true,
        itemSize: 20,
        itemGap: 10,
        color: "#165dff",
        borderColor: "#165dff",
      },
      lineStyle: {
        color: "#06b6d4",
      },
      progress: {
        lineStyle: {
          color: "#165dff",
          opacity: 0.1,
        },
        itemStyle: {
          color: "#165dff",
          opacity: 0.1,
        },
      },
      controlStyle: {
        show: false,
      },
    },
  };
};

/** 初始化图表并渲染首帧 */
const initChart = () => {
  if (!chartRef.value) return;
  chart = echarts.init(chartRef.value);
  const opt = baseOption();

  // 在 setOption 之前添加事件监听
  chart.on("timelinechanged", (params) => {
    const hour = params.currentIndex;
    updateChartData(hour);
  });

  // 设置初始 data（第0小时）
  activeRawStore = hourlyRawStore[0];
  opt.series[0].data = hourlyData[0];
  chart.setOption(opt);
};

/** 更新图表数据（只替换 series.data 和 activeRawStore） */
const updateChartData = (hour) => {
  if (!chart) return;
  activeRawStore = hourlyRawStore[hour];
  chart.setOption({
    series: [{ data: hourlyData[hour] }],
  });
};

/** 生命周期 */
onMounted(() => {
  initChart();
  window.addEventListener("resize", onResize);
});

onBeforeUnmount(() => {
 
  window.removeEventListener("resize", onResize);
  chart?.dispose();
});

const onResize = () => {
  chart?.resize();
};
import { useDashboardStore } from "@/store/modules/dashboard";
const dashboardStore = useDashboardStore();
watch(
  () => dashboardStore.currentModule,
  (newVal) => {
    // 等待 DOM 更新
    nextTick(() => {
      // 如果图表已初始化，直接 resize；否则初始化图表
      if (chart) {
        chart.resize();
      } else {
        initChart();
      }
    });
  }
);
</script>

<style scoped>
.profile-container {
  display: flex;
  flex-direction: column;
}
.controls {
  padding: 0 35px;
}
.controls input[type="range"] {
  width: 100%;
}
.profile-chart {
  width: 100%;
  height: 250px;
}

/* 滑块轨道（WebKit） */
.hour-slider::-webkit-slider-runnable-track {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(
    to right,
    #165dff 0%,
    #165dff var(--progress, 0%),
    #e0e6ed var(--progress, 0%)
  );
  transition: background 0.1s ease;
}

/* 滑块按钮（WebKit） */
.hour-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #165dff;
  cursor: pointer;
  margin-top: -7px; /* 垂直居中 */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: all 0.15s ease;
}

.hour-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 5px rgba(22, 93, 255, 0.3);
}

/* 滑块兼容Firefox */
.hour-slider::-moz-range-track {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(
    to right,
    #165dff 0%,
    #165dff var(--progress, 0%),
    #ede1e0 var(--progress, 0%)
  );
  border: none;
}

.hour-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #165dff;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: all 0.15s ease;
}

.hour-slider::-moz-range-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 5px rgba(22, 93, 255, 0.3);
}
</style>
