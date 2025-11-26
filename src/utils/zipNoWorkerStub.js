// 替代@zip.js/zip.js/lib/zip-no-worker.js的简单实现
// 用于解决依赖加载错误

console.warn('使用zip-no-worker替代模块');

// 导出一个基本的空对象，避免导入失败
export default {};
export const ZipReader = class {};
export const ZipWriter = class {};
export const BlobReader = class {};
export const BlobWriter = class {};
export const TextReader = class {};
export const TextWriter = class {};