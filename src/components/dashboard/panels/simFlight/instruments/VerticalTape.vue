<template>
  <div class="vtape" :class="`vtape--${align}`">
    <svg class="vtape__svg" :viewBox="`0 0 ${W} ${H}`" :aria-label="caption">
      <rect
        x="0.5"
        y="0.5"
        :width="W - 1"
        :height="H - 1"
        fill="rgba(0,6,16,0.85)"
        stroke="rgba(0,232,255,0.55)"
        stroke-width="1"
      />

      <g v-for="tick in ticks" :key="tick.key">
        <line
          :x1="tick.x1"
          :y1="tick.y"
          :x2="tick.x2"
          :y2="tick.y"
          :stroke="tick.major ? '#00e8ff' : 'rgba(0,232,255,0.45)'"
          :stroke-width="tick.major ? 1.2 : 0.6"
        />
        <text
          v-if="tick.label"
          :x="tick.labelX"
          :y="tick.y + 3"
          :text-anchor="tick.labelAnchor"
          class="vtape__tick-label"
        >
          {{ tick.label }}
        </text>
      </g>

      <!-- 读数框 + 指向内侧的三角 -->
      <rect
        :x="boxX"
        :y="CY - 9"
        :width="boxW"
        height="18"
        fill="#00e8ff"
      />
      <polygon :points="pointerPoints" fill="#00e8ff" />
      <text :x="boxX + boxW / 2" :y="CY + 4" text-anchor="middle" class="vtape__value">
        {{ displayValue }}
      </text>
    </svg>
    <div class="vtape__cap">{{ caption }}</div>
  </div>
</template>

<script setup>
import { computed, toValue } from 'vue';

const props = defineProps({
  value: { type: Number, default: 0 },
  step: { type: Number, default: 1 },
  span: { type: Number, default: 30 },
  pxPerUnit: { type: Number, default: 10 },
  labelEvery: { type: Number, default: 10 },
  format: { type: Function, default: (v) => String(v) },
  caption: { type: String, default: '' },
  align: { type: String, default: 'left' },
});

const W = 52;
const H = 168;
const CY = H / 2;
const boxW = 34;
const boxX = (W - boxW) / 2;

const safeValue = computed(() => {
  const n = Number(toValue(props.value));
  return Number.isFinite(n) ? n : 0;
});

const displayValue = computed(() => safeValue.value.toFixed(1));

function nearMultiple(val, every) {
  const snapped = Math.round(val / every) * every;
  return Math.abs(val - snapped) < props.step * 0.25;
}

const ticks = computed(() => {
  const center = safeValue.value;
  const min = center - props.span;
  const max = center + props.span;
  const count = Math.ceil((max - min) / props.step) + 2;
  const start = Math.floor(min / props.step) * props.step;
  const list = [];

  for (let i = 0; i <= count; i += 1) {
    const val = Math.round((start + i * props.step) * 100) / 100;
    const diff = val - center;
    const y = CY - diff * props.pxPerUnit;
    if (y < 4 || y > H - 4) continue;

    const isMajor = nearMultiple(val, props.labelEvery);
    const hideLabel = Math.abs(val - Math.round(val)) < 0.01
      && Math.abs(val - center) < props.labelEvery * 0.35;

    const tickLen = isMajor ? 12 : 6;
    const isLeft = props.align === 'left';

    list.push({
      key: val,
      y,
      major: isMajor,
      label: isMajor && !hideLabel ? props.format(val) : '',
      x1: isLeft ? W - 3 : 3,
      x2: isLeft ? W - 3 - tickLen : 3 + tickLen,
      labelX: isLeft ? 4 : W - 4,
      labelAnchor: isLeft ? 'start' : 'end',
    });
  }
  return list;
});

const pointerPoints = computed(() => {
  const y1 = CY - 5;
  const y2 = CY + 5;
  if (props.align === 'left') {
    const x = boxX + boxW;
    return `${x + 7},${CY} ${x},${y1} ${x},${y2}`;
  }
  const x = boxX;
  return `${x - 7},${CY} ${x},${y1} ${x},${y2}`;
});
</script>

<style scoped lang="scss">
.vtape {
  width: 52px;
  flex-shrink: 0;
}

.vtape__svg {
  width: 52px;
  height: 168px;
  display: block;
  overflow: hidden;
}

.vtape__tick-label {
  fill: rgba(255, 255, 255, 0.55);
  font-size: 9px;
  font-family: 'AiDeepFont', sans-serif;
}

.vtape__value {
  fill: #062030;
  font-size: 10px;
  font-weight: 600;
  font-family: 'AiDeepFont', sans-serif;
  pointer-events: none;
}

.vtape__cap {
  margin-top: 4px;
  font-size: 8px;
  line-height: 1.25;
  color: rgba(255, 255, 255, 0.45);
  text-align: center;
  white-space: nowrap;
  flex-shrink: 0;
  overflow: visible;
}
</style>
