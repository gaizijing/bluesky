<template>
  <div class="attitude-indicator">
    <!-- 航向罗盘：整圆旋转，矩形视窗裁剪（仅显示框内弧段） -->
    <svg
      class="attitude-indicator__roll"
      :style="{ width: `${ROLL_WINDOW_W}px`, height: `${ROLL_WINDOW_H}px` }"
      :viewBox="`0 0 ${ROLL_WINDOW_W} ${ROLL_WINDOW_H}`"
      aria-hidden="true"
    >
      <defs>
        <clipPath :id="rollClipId">
          <rect x="0" y="0" :width="ROLL_WINDOW_W" :height="ROLL_WINDOW_H" />
        </clipPath>
      </defs>

      <!-- 旋转刻度盘（罗盘尺寸固定，仅矩形视窗裁剪可见区域） -->
      <g :clip-path="`url(#${rollClipId})`">
        <g :transform="`rotate(${-heading} ${CX} ${CY})`">
          <circle
            :cx="CX"
            :cy="CY"
            :r="ROLL_RADIUS"
            fill="none"
          />
          <g v-for="mark in headingMarks" :key="mark.deg">
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
              dominant-baseline="middle"
              :transform="`rotate(${heading} ${mark.tx} ${mark.ty})`"
              class="attitude-indicator__roll-label"
            >
              {{ mark.label }}
            </text>
          </g>
        </g>
      </g>

      
      <path :d="rollBadgePath" fill="#00e8ff" />
      <text :x="CX" :y="BADGE_Y + 5" text-anchor="middle" class="attitude-indicator__roll-val">
        {{ headingText }}
      </text>
      <polygon
        :points="`${CX},${TRI_Y} ${CX - 4},${TRI_Y + 7} ${CX + 4},${TRI_Y + 7}`"
        fill="#fff"
      />
    </svg>

    <div class="attitude-indicator__row">
      <VerticalTape
        :value="safeVerticalSpeed"
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

        <g :clip-path="`url(#${clipId})`">
          <g :transform="`rotate(${-roll} ${PCX} ${PCY})`">
            <g :transform="`translate(0 ${pitchY})`">
              <rect :x="-S" :y="-S * 3" :width="S * 3" :height="S * 3" fill="#0a1520" />
              <rect :x="-S" :y="PCY" :width="S * 3" :height="S * 3" fill="#9e4a42" />
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
                  text-anchor="middle"
                  class="attitude-indicator__pitch-num"
                >
                  {{ Math.abs(line.deg) }}
                </text>
              </g>
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
        :value="safeAltitude"
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
import { computed, toValue } from 'vue';
import VerticalTape from './VerticalTape.vue';

const props = defineProps({
  heading: { type: Number, default: 0 },
  roll: { type: Number, default: 0 },
  pitch: { type: Number, default: 0 },
  altitude: { type: Number, default: 0 },
  verticalSpeed: { type: Number, default: 0 },
});

const TAPE_W = 82;
const GAP = 6;
const S = 168;
const TOTAL_W = TAPE_W * 2 + GAP * 2 + S;

/** ── 仅改这里：矩形「显示窗口」大小（裁剪框），不改变罗盘/仪表刻度尺寸 ── */
const ROLL_WINDOW_W = TOTAL_W;
const ROLL_WINDOW_H = 72;

/** 罗盘几何（固定，不随窗口高度变化） */
const R = 78;
const CX = TOTAL_W / 2;
const ROLL_RADIUS = TOTAL_W / 2 - 10;
/** 圆心 y = 半径 → 0° 贴在坐标顶部，加高窗口只露出更多同尺寸圆弧 */
const CY = ROLL_RADIUS;
const ROLL_OUTER = ROLL_RADIUS;
const ROLL_LABEL_R = ROLL_RADIUS - 12;
const PCX = S / 2;
const PCY = S / 2;
const BADGE_Y = 14;
const TRI_Y = 30;
const PITCH_Y = 10;

const uid = `adi-${Math.random().toString(36).slice(2, 9)}`;
const clipId = `${uid}-clip`;
const rollClipId = `${uid}-roll-clip`;

const heading = computed(() => {
  const h = Number(toValue(props.heading));
  return Number.isFinite(h) ? ((h % 360) + 360) % 360 : 0;
});

const headingText = computed(() => `${heading.value.toFixed(0)}°`);
const roll = computed(() => {
  const n = Number(toValue(props.roll));
  return Number.isFinite(n) ? n : 0;
});
const safePitch = computed(() => {
  const n = Number(toValue(props.pitch));
  return Number.isFinite(n) ? n : 0;
});
const safeAltitude = computed(() => {
  const n = Number(toValue(props.altitude));
  if (!Number.isFinite(n) || n < 0 || n > 12000) return 0;
  return n;
});
const safeVerticalSpeed = computed(() => {
  const n = Number(toValue(props.verticalSpeed));
  if (!Number.isFinite(n) || n < -80 || n > 80) return 0;
  return n;
});

const pitchText = computed(() => safePitch.value.toFixed(1));
const pitchY = computed(() => safePitch.value * 3);

const rollBadgePath = computed(() => {
  const cx = CX;
  const y = BADGE_Y - 4;
  const bw = 22;
  const bh = 14;
  return [
    `M ${cx - bw} ${y + bh}`,
    `L ${cx + bw} ${y + bh}`,
    `L ${cx + bw - 5} ${y + 5}`,
    `L ${cx + 4} ${y + 2}`,
    `L ${cx} ${y}`,
    `L ${cx - 4} ${y + 2}`,
    `L ${cx - bw + 5} ${y + 5}`,
    'Z',
  ].join(' ');
});

function compassXY(deg, radius) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: CX + Math.sin(rad) * radius,
    y: CY - Math.cos(rad) * radius,
  };
}

const headingMarks = computed(() => {
  const marks = [];

  for (let deg = 0; deg < 360; deg += 5) {
    const major = deg % 10 === 0;
    const len = major ? 10 : 5;
    const outer = compassXY(deg, ROLL_OUTER);
    const inner = compassXY(deg, ROLL_OUTER - len);

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
    };

    if (major) {
      const lp = compassXY(deg, ROLL_LABEL_R);
      mark.label = String(deg);
      mark.tx = lp.x;
      mark.ty = lp.y + 3;
    }

    marks.push(mark);
  }

  return marks;
});

const pitchLines = computed(() => {
  const lines = [];
  const maxHalf = R - 18;
  for (let i = -6; i <= 6; i += 1) {
    const deg = i * 5;
    if (deg === 0) continue;
    const major = Math.abs(deg) % 10 === 0;
    const half = Math.min(major ? 46 : 28, maxHalf);
    lines.push({
      deg,
      y: PCY - deg * 3,
      major,
      x1: PCX - half,
      x2: PCX + half,
      labelX: deg > 0 ? PCX - half + 10 : PCX + half - 10,
    });
  }
  return lines;
});

function formatVs(n) {
  const v = Number(n).toFixed(1);
  if (Number(v) > 0) return `+${v}`;
  return v;
}

function formatAlt(n) {
  return Number(n).toFixed(1);
}
</script>

<style scoped lang="scss">
.attitude-indicator {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap:8px
}

.attitude-indicator__roll {
  display: block;
  flex-shrink: 0;
  overflow: hidden;
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
  overflow: hidden;
  border-radius: 50%;
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
