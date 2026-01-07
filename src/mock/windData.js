// ================================
// Realistic Mock Wind Data Generator
// 数据结构不变，更接近真实风场
// ================================

// 平滑噪声（替代 Math.random 的核心）
const smoothNoise = (x, y, scale = 0.15) => {
  return Math.sin(x * scale) * Math.cos(y * scale);
};

// 生成单层真实风场
const generateRealisticWindData = (
  width,
  height,
  baseSpeed,
  baseDirection,
  perturbation
) => {
  const u = [];
  const v = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {

      // 连续扰动（空间相关）
      const disturbance = smoothNoise(x, y, 0.12);

      // 风速 & 风向（主导风 + 微扰）
      const speed =
        baseSpeed * (1 + disturbance * 0.2);
      const angle =
        baseDirection + disturbance * perturbation;

      // u / v 分量
      u.push(Math.cos(angle) * speed);
      v.push(Math.sin(angle) * speed);
    }
  }

  return {
    u: {
      array: u,
      min: Math.min(...u),
      max: Math.max(...u)
    },
    v: {
      array: v,
      min: Math.min(...v),
      max: Math.max(...v)
    },
    width,
    height
  };
};

// 按高度生成（真实切变逻辑）
const generateLayerWindData = (width, height, heightLevel) => {
  // 高度越高：风越大 + 顺时针切变
  const baseSpeed = 2.5 + heightLevel * 0.004;
  const baseDirection = Math.PI / 4 + heightLevel * 0.0006;
  const perturbation = 0.35;

  return generateRealisticWindData(
    width,
    height,
    baseSpeed,
    baseDirection,
    perturbation
  );
};

// ================================
// Mock 数据本体（结构完全不变）
// ================================

const width = 32;
const height = 32;

const mockWindData = {
  time: "2025-01-01T10:00:00",
  layers: [
    {
      height: 50,
      windData: {
        ...generateLayerWindData(width, height, 50),
        bounds: {
          west: 120.30,
          south: 36.05,
          east: 120.45,
          north: 36.20
        }
      }
    },
    {
      height: 150,
      windData: {
        ...generateLayerWindData(width, height, 150),
        bounds: {
          west: 120.30,
          south: 36.05,
          east: 120.45,
          north: 36.20
        }
      }
    },
    {
      height: 200,
      windData: {
        ...generateLayerWindData(width, height, 200),
        bounds: {
          west: 120.30,
          south: 36.05,
          east: 120.45,
          north: 36.20
        }
      }
    }
  ]
};

export default mockWindData;
