import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import cesium from 'vite-plugin-cesium'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import postcssPxToViewport from 'postcss-px-to-viewport'
import { offlineMapServerPlugin } from './vite/plugins/offlineMapServer.js'
import { staticDemoPagesPlugin } from './vite/plugins/staticDemoPages.js'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const defaultMapRoot = resolve(__dirname, '../source')
  const offlineMapRoot = env.VITE_OFFLINE_MAP_SERVE_DIR
    ? resolve(__dirname, env.VITE_OFFLINE_MAP_SERVE_DIR)
    : defaultMapRoot
  const tileServerPort = Number(env.VITE_MAP_TILE_SERVER_PORT) || 8765

  return {
    base: './',
    define: {
      global: 'window'
    },
    plugins: [
      staticDemoPagesPlugin({ tiandituToken: env.VITE_TIANDITU_TOKEN }),
      vue(),
      cesium(),
      offlineMapServerPlugin(offlineMapRoot, {
        host: env.VITE_MAP_TILE_SERVER_HOST || '127.0.0.1',
        port: tileServerPort,
      }),
      // 自动导入 Element Plus 工具类（如 ElMessage、ElMessageBox 等）
      AutoImport({
        resolvers: [
          // 自动导入 Element Plus 组件和图标
          ElementPlusResolver({
            importStyle: 'css',
            // 关键：开启自动导入图标
            directives: true,
            version: '^2.3.0'
          })
        ]
      }),
      Components({
        resolvers: [
          ElementPlusResolver({
            importStyle: 'css',
            // 关键：开启图标自动注册
            include: [/^El[A-Z]/, /^ElIcon/], // 包含图标组件
          })
        ]
      })
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@api': resolve(__dirname, './src/api'),
        '@assets': resolve(__dirname, './src/assets'),
        '@components': resolve(__dirname, './src/components'),
        '@utils': resolve(__dirname, './src/utils'),
        '@demos': resolve(__dirname, './demos'),
        '@zip.js/zip.js/lib/zip-no-worker.js': resolve(__dirname, './src/utils/zipNoWorkerStub.js')
      }
    },
    server: {
      port: 8081,
      open: true,
      proxy: {
        // 天地图 WMTS（开发环境避免 CORS / 直连 502）
        '/tianditu-proxy': {
          target: 'https://t0.tianditu.gov.cn',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/tianditu-proxy/, ''),
          secure: true,
        },
        // 通用 API 代理
        [env.VITE_API_BASE_URL]: {
          target: 'http://localhost:8080',
          changeOrigin: true,
          ws: true,
          // rewrite: (path) => path.replace(new RegExp(`^${env.VITE_API_BASE_URL}`), ''),
          secure: false,
          headers: {
            'Access-Control-Allow-Origin': '*'
          }
        }
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      rollupOptions: {
        output: {
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: '[ext]/[name]-[hash].[ext]',
          manualChunks(id) {
            if (id.includes('node_modules/cesium')) return 'cesium';
            if (id.includes('node_modules/echarts')) return 'echarts';
            if (id.includes('node_modules/element-plus')) return 'element-plus';
            if (id.includes('node_modules/@element-plus/icons-vue')) return 'element-plus-icons';
          },
        }
      }
    },
    // 优化 Cesium 包
    optimizeDeps: {
      include: ['cesium']
    },
    css: {
      /**
       * 如果启用了这个选项，那么 CSS 预处理器会尽可能在 worker 线程中运行；即通过多线程运行 CSS 预处理器，从而极大提高其处理速度
       * https://cn.vitejs.dev/config/shared-options#css-preprocessormaxworkers
       */
      preprocessorMaxWorkers: true,
      /**
       * 建议只用来嵌入 SCSS 的变量声明文件，嵌入后全局可用
       * 该选项可以用来为每一段样式内容添加额外的代码。但是要注意，如果你添加的是实际的样式而不仅仅是变量，那这些样式在最终的产物中会重复
       * https://cn.vitejs.dev/config/shared-options.html#css-preprocessoroptions-extension-additionaldata
       */
      preprocessorOptions: {
        scss: {
          // 如果您的终端提示 legacy JS API Deprecation Warning, 您可以配置以下代码在 vite.config.ts 中
          // 使用现代 CSS API，避免 legacy warning
          api: 'modern-compiler',
          // 全局引入变量文件，使用路径别名 @ 表示 src 目录
          additionalData: `@use "@/styles/variables.scss" as *;`,
        },
      }
    },
  }
})