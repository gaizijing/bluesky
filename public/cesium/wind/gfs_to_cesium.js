/**
 * Node.js: Download GFS → Crop → Convert to Cesium Wind JSON
 */

const axios = require("axios");
const fs = require("fs");
const gdal = require("gdal");
const path = require("path");

// ===============================
// 1. 参数配置（修改这里）
// ===============================

// 青岛地区裁剪范围
const BBOX = {
  west: 119.5,
  south: 35.0,
  east: 121.6,
  north: 37.5,
};

// 输出 JSON 文件
const OUTPUT_JSON = "qingdao_wind.json";

// GFS 0.25°（比你之前用的 0.5° 更高清）
const GFS_URL =
  "https://nomads.ncep.noaa.gov/pub/data/nccf/com/gfs/prod/gfs.20250101/00/atmos/gfs.t00z.pgrb2.0p25.f000";

// 保存 GRIB 的路径
const LOCAL_GRIB = "gfs_latest.grib2";

// ===============================
// 2. 下载 GRIB
// ===============================

async function downloadGRIB() {
  console.log("Downloading GFS GRIB ...");

  const response = await axios({
    url: GFS_URL,
    method: "GET",
    responseType: "arraybuffer",
  });

  fs.writeFileSync(LOCAL_GRIB, response.data);
  console.log("✔ GRIB 下载完成:", LOCAL_GRIB);
}

// ===============================
// 3. 读取 GRIB 并裁剪
// ===============================

function cropGRIB() {
  console.log("Opening GRIB...");

  const dataset = gdal.open(LOCAL_GRIB);

  // 提取 U、V 风分量
  const bands = dataset.bands;

  const uBand = bands.find((b) =>
    b.description.includes("U-component of wind")
  );
  const vBand = bands.find((b) =>
    b.description.includes("V-component of wind")
  );

  if (!uBand || !vBand) {
    throw new Error("GRIB 中找不到风场 U / V 分量");
  }

  const geo = dataset.geoTransform;

  const lonStart = geo[0];
  const lonStep = geo[1];
  const latStart = geo[3];
  const latStep = geo[5];

  const nx1 = Math.floor((BBOX.west - lonStart) / lonStep);
  const ny1 = Math.floor((latStart - BBOX.north) / Math.abs(latStep));
  const nx2 = Math.floor((BBOX.east - lonStart) / lonStep);
  const ny2 = Math.floor((latStart - BBOX.south) / Math.abs(latStep));

  const width = nx2 - nx1;
  const height = ny2 - ny1;

  console.log("Cropping region:", width, "×", height);

  const uData = uBand.pixels.read(nx1, ny1, width, height);
  const vData = vBand.pixels.read(nx1, ny1, width, height);

  return { uData, vData, width, height };
}

// ===============================
// 4. 转成 Cesium 风场 JSON
// ===============================

function convertToCesiumJSON(uData, vData, width, height) {
  console.log("Converting to Cesium Wind JSON...");

  const result = {
    width,
    height,
    uMin: Math.min(...uData),
    uMax: Math.max(...uData),
    vMin: Math.min(...vData),
    vMax: Math.max(...vData),
    u: Array.from(uData),
    v: Array.from(vData),
  };

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(result));
  console.log("✔ 风场 JSON 已生成:", OUTPUT_JSON);
}

// ===============================
// 5. 主函数
// ===============================

async function main() {
  await downloadGRIB();

  const { uData, vData, width, height } = cropGRIB();

  convertToCesiumJSON(uData, vData, width, height);
}

main();
