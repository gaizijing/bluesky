<template>
  <div class="circular-gauge" role="img" :aria-label="label">
    <img class="circular-gauge__bg" :src="assets.dialScaleRing" alt="" />

    <svg class="circular-gauge__overlay" :viewBox="`0 0 ${size} ${size}`" aria-hidden="true">
      <g v-for="tick in tickMarks" :key="tick.value">
        <line
          :x1="tick.x1"
          :y1="tick.y1"
          :x2="tick.x2"
          :y2="tick.y2"
          :stroke="tick.major ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)'"
          :stroke-width="tick.major ? 1.4 : 0.8"
          stroke-linecap="round"
        />
      </g>
    </svg>

    <svg class="circular-gauge__needle" :viewBox="`0 0 ${size} ${size}`" aria-hidden="true">
      <g :transform="`rotate(${needleAngle} ${cx} ${cy})`">
        <line
          :x1="cx - needleBack"
          :y1="cy"
          :x2="cx + needleLen"
          :y2="cy"
          stroke="#fff"
          stroke-width="2"
          stroke-linecap="round"
        />
        <circle :cx="cx" :cy="cy" r="3" fill="#062038" stroke="#fff" stroke-width="1" />
      </g>
    </svg>

    <div class="circular-gauge__labels">
      <span
        v-for="item in labelPositions"
        :key="item.value"
        class="circular-gauge__label"
        :style="{ left: `${item.x}%`, top: `${item.y}%` }"
      >
        {{ item.value }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { SIM_HUD_ASSETS } from '../simHudAssets.js';

const props = defineProps({
  value: { type: Number, default: 0 },
  max: { type: Number, default: 120 },
  ticks: { type: Array, default: () => [0, 20, 40, 60, 80, 100] },
  /** 该值对应刻度盘正上方（如电量 60 在 12 点方向） */
  apexValue: { type: Number, default: null },
  label: { type: String, default: '' },
  size: { type: Number, default: 156 },
});

const assets = SIM_HUD_ASSETS;
const cx = computed(() => props.size / 2);
const cy = computed(() => props.size / 2);
const faceR = computed(() => props.size * 0.36);

const startAngle = -225;
const sweepAngle = 270;
const topAngle = -90;
const endAngle = startAngle + sweepAngle;
const labelSet = computed(() => new Set(props.ticks));

function tickAngle(val) {
  if (props.apexValue != null) {
    const apex = props.apexValue;
    if (val <= apex) {
      return startAngle + (val / apex) * (topAngle - startAngle);
    }
    return topAngle + ((val - apex) / (props.max - apex)) * (endAngle - topAngle);
  }
  const ratio = val / props.max;
  return startAngle + ratio * sweepAngle;
}

function polarXY(angle, radius) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: cx.value + Math.cos(rad) * radius,
    y: cy.value + Math.sin(rad) * radius,
  };
}

const needleAngle = computed(() => tickAngle(props.value));

const labelPositions = computed(() =>
  props.ticks.map((val) => {
    const angle = tickAngle(val);
    const rad = (angle * Math.PI) / 180;
    return {
      value: val,
      x: 50 + Math.cos(rad) * 46,
      y: 50 + Math.sin(rad) * 46,
    };
  })
);

const tickValues = computed(() => {
  const list = [];
  const step = 10;
  for (let v = 0; v <= props.max; v += step) {
    list.push(v);
  }
  return list;
});

const tickMarks = computed(() => {
  const outerR = faceR.value * 1.05;
  const innerMajor = faceR.value * 0.86;
  const innerMinor = faceR.value * 0.91;

  return tickValues.value.map((val) => {
    const angle = tickAngle(val);
    const major = labelSet.value.has(val);
    const inner = major ? innerMajor : innerMinor;
    const outer = polarXY(angle, outerR);
    const innerPt = polarXY(angle, inner);
    return {
      value: val,
      major,
      x1: innerPt.x,
      y1: innerPt.y,
      x2: outer.x,
      y2: outer.y,
    };
  });
});

const needleLen = computed(() => faceR.value * 0.78);
const needleBack = computed(() => faceR.value * 0.1);
</script>

<style scoped lang="scss">
.circular-gauge {
  position: relative;
  width: 100%;
  height: 100%;
}

.circular-gauge__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

.circular-gauge__overlay,
.circular-gauge__needle {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.circular-gauge__overlay {
  z-index: 1;
}

.circular-gauge__needle {
  z-index: 2;
}

.circular-gauge__labels {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}

.circular-gauge__label {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 10px;
  font-family: 'AiDeepFont', sans-serif;
  color: rgba(255, 255, 255, 0.8);
}
</style>
