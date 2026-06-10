<template>
  <div class="attitude-indicator">
    <!-- 滚转刻度半圆：跨在三条仪表上方 -->
    <svg
      class="attitude-indicator__roll"
      :viewBox="`0 0 ${TOTAL_W} ${ROLL_H}`"
      aria-hidden="true"
    >
      <g :transform="`rotate(${-roll} ${CX} ${CY})`">
        <g v-for="mark in rollMarks" :key="mark.deg">
          <line
            :x1="mark.x1"
            :y1="mark.y1"
            :x2="mark.x2"
            :y2="mark.y2"
            :stroke="mark.major ? '#00e8ff' : 'rgba(0,232,255,0.45)'"
            :stroke-width="mark.major ? 1.4 : 0.7"
          />
          <text
            v-if="mark.label"
            :x="mark.tx"
            :y="mark.ty"
            text-anchor="middle"
            :transform="`rotate(${mark.rot} ${mark.tx} ${mark.ty})`"
            class="attitude-indicator__roll-label"
          >
            {{ mark.label }}
          </text>
        </g>
      </g>

      <path :d="rollBadgePath" fill="#00e8ff" />
      <text :x="CX" :y="BADGE_Y + 5" text-anchor="middle" class="attitude-indicator__roll-val">
        {{ rollText }}
      </text>

      <polygon
        :points="`${CX},${TRI_Y} ${CX - 4},${TRI_Y + 7} ${CX + 4},${TRI_Y + 7}`"
        fill="#fff"
      />
    </svg>

    <div class="attitude-indicator__row">
      <VerticalTape
        :value="verticalSpeed"
        :step="0.5"
        :span="3.5"
        :px-per-unit="14"
        :label-every="1"
        :format="formatVs"
        caption="垂直速度 m/s"
        align="left"
      />

      <svg class="attitude-indicator__pfd" :viewBox="`0 0 ${S} ${S}`" aria-label="姿态仪">
        <defs>
          <clipPath :id="clipId">
            <circle :cx="PCX" :cy="PCY" :r="R" />
          </clipPath>
        </defs>

        <circle :cx="PCX" :cy="PCY" :r="R + 1" fill="none" stroke="rgba(0,232,255,0.55)" stroke-width="1.5" />

        <g :transform="`rotate(${-roll} ${PCX} ${PCY})`">
          <g :transform="`translate(0 ${pitchY})`" :clip-path="`url(#${clipId})`">
            <rect :x="-R" :y="-S * 2" :width="S * 3" :height="S * 2" fill="#0a1520" />
            <rect :x="-R" :y="PCY" :width="S * 3" :height="S * 2" fill="#9e4a42" />
            <line :x1="0" :y1="PCY" :x2="S" :y2="PCY" stroke="#fff" stroke-width="1.5" />
            <g v-for="line in pitchLines" :key="line.deg">
              <line
                :x1="line.x1"
                :y1="line.y"
                :x2="line.x2"
                :y2="line.y"
                stroke="#fff"
                :stroke-width="line.major ? 1.4 : 0.8"
              />
              <text
                v-if="line.major"
                :x="line.labelX"
                :y="line.y + 3"
                class="attitude-indicator__pitch-num"
              >
                {{ Math.abs(line.deg) }}
              </text>
            </g>
          </g>
        </g>

        <rect
          :x="PCX - 15"
          :y="PITCH_Y"
          width="30"
          height="13"
          fill="rgba(0,0,0,0.9)"
          stroke="rgba(255,255,255,0.4)"
          stroke-width="0.6"
        />
        <text :x="PCX" :y="PITCH_Y + 9.5" text-anchor="middle" class="attitude-indicator__pitch-val">
          {{ pitchText }}
        </text>

        <g>
          <line :x1="PCX - 38" :y1="PCY" :x2="PCX - 6" :y2="PCY" stroke="#fff" stroke-width="2.5" />
          <line :x1="PCX + 6" :y1="PCY" :x2="PCX + 38" :y2="PCY" stroke="#fff" stroke-width="2.5" />
          <line :x1="PCX" :y1="PCY" :x2="PCX" :y2="PCY - 8" stroke="#fff" stroke-width="2" />
        </g>
      </svg>

      <VerticalTape
        :value="altitude"
        :step="5"
        :span="18"
        :px-per-unit="6.5"
        :label-every="10"
        :format="formatAlt"
        caption="飞行高度 m"
        align="right"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import VerticalTape from './VerticalTape.vue';

const props = defineProps({
  roll: { type: Number, default: 0 },
  pitch: { type: Number, default: 0 },
  altitude: { type: Number, default: 0 },
  verticalSpeed: { type: Number, default: 0 },
});

const TAPE_W = 52;
const GAP = 6;
const S = 168;
const TOTAL_W = TAPE_W * 2 + GAP * 2 + S;
const ROLL_H = 48;
const R = 78;
const CX = TOTAL_W / 2;
const CY = ROLL_H + S / 2;
const PCX = S / 2;
const PCY = S / 2;
const ROLL_OUTER = TOTAL_W / 2 - 4;
const ROLL_LABEL_R = ROLL_OUTER + 12;
const BADGE_Y = 12;
const TRI_Y = 30;
const PITCH_Y = 10;

const uid = `adi-${Math.random().toString(36).slice(2, 9)}`;
const clipId = `${uid}-clip`;

const rollText = computed(() => Number(props.roll).toFixed(1));
const pitchText = computed(() => Number(props.pitch).toFixed(1));
const pitchY = computed(() => props.pitch * 3);

const rollBadgePath = computed(() => {
  const cx = CX;
  const y = BADGE_Y - 8;
  const bw = 22;
  const bh = 16;
  return [
    `M ${cx - bw} ${y + bh}`,
    `L ${cx + bw} ${y + bh}`,
    `L ${cx + bw - 5} ${y + 5}`,
    `L ${cx + 4} ${y + 2}`,
    `L ${cx} ${y - 4}`,
    `L ${cx - 4} ${y + 2}`,
    `L ${cx - bw + 5} ${y + 5}`,
    'Z',
  ].join(' ');
});

function rollXY(deg, radius) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: CX + Math.sin(rad) * radius,
    y: CY - Math.cos(rad) * radius,
  };
}

const rollMarks = computed(() => {
  const marks = [];
  const visibleBottom = ROLL_H - 2;

  for (let deg = -110; deg <= 110; deg += 5) {
    const major = deg % 10 === 0;
    const len = major ? 10 : 5;
    const outer = rollXY(deg, ROLL_OUTER);
    const inner = rollXY(deg, ROLL_OUTER - len);

    if (outer.y >= visibleBottom) continue;

    const mark = {
      deg,
      major,
      x1: inner.x,
      y1: inner.y,
      x2: outer.x,
      y2: outer.y,
      label: '',
      tx: 0,
      ty: 0,
      rot: deg,
    };

    if (major && deg !== 0) {
      const lp = rollXY(deg, ROLL_LABEL_R);
      if (lp.y < visibleBottom) {
        mark.label = String(deg);
        mark.tx = lp.x;
        mark.ty = lp.y + 3;
      }
    }

    marks.push(mark);
  }

  return marks;
});

const pitchLines = computed(() => {
  const lines = [];
  for (let i = -6; i <= 6; i += 1) {
    const deg = i * 5;
    if (deg === 0) continue;
    const major = Math.abs(deg) % 10 === 0;
    const half = major ? 50 : 32;
    lines.push({
      deg,
      y: PCY - deg * 3,
      major,
      x1: PCX - half,
      x2: PCX + half,
      labelX: PCX + half + 4,
    });
  }
  return lines;
});

function formatVs(n) {
  const r = Math.round(n);
  if (r > 0) return `+${r}`;
  return String(r);
}

function formatAlt(n) {
  return String(Math.round(n));
}
</script>

<style scoped lang="scss">
.attitude-indicator {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.attitude-indicator__roll {
  width: 284px;
  height: 48px;
  display: block;
  flex-shrink: 0;
  overflow: visible;
}

.attitude-indicator__roll-label {
  fill: #00e8ff;
  font-size: 9px;
  font-weight: 600;
  font-family: 'AiDeepFont', sans-serif;
}

.attitude-indicator__row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.attitude-indicator__pfd {
  width: 168px;
  height: 168px;
  flex-shrink: 0;
  display: block;
}

.attitude-indicator__roll-val {
  fill: #fff;
  font-size: 11px;
  font-weight: 600;
  font-family: 'AiDeepFont', sans-serif;
}

.attitude-indicator__pitch-num,
.attitude-indicator__pitch-val {
  fill: #fff;
  font-size: 8px;
  font-family: 'AiDeepFont', sans-serif;
}
</style>
