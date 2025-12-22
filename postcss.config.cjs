module.exports = { 
   plugins: { 
     'postcss-px-to-viewport': { 
       // 核心：设计稿宽度（比如你的设计稿是1920px） 
       viewportWidth: 1920, 
       // 视口高度（可不配，电脑端主要关注宽度） 
       viewportHeight: 1080, 
       // 单位精度 
       unitPrecision: 6, 
       // 要转换的单位（只转px） 
       unitToConvert: 'px', 
       // 忽略的CSS属性（比如border用px，不转vw） 
       propList: ['*', '!border', '!border-width'], 
       // 忽略的选择器（比如类名含.no-viewport的不转） 
       selectorBlackList: ['.no-viewport'], 
       // 最小px值（小于1px的不转，避免0.05vw这类极小值） 
       minPixelValue: 1, 
       // 是否转义标识符（无需改） 
       replace: true, 
       // 排除文件（只适配电脑端，排除移动端组件） 
       exclude: [/mobile|phone/], 
       // 电脑端最小视口宽度（小于1024px按1024px计算） 
       mediaQuery: false, 
       // 自定义视口计算逻辑（关键：限制最小视口1024px） 
       customFun: (viewportSize, file) => { 
         const width = viewportSize.width; 
         // 电脑端最小宽度1024px，避免窗口缩小时vw过小 
         return width < 1024 ? 1024 : width; 
       } 
     } 
   } 
 };