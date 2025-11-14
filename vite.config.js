import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import cesium from 'vite-plugin-cesium'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    base: './',
    plugins: [
      vue(),
      cesium(),
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
      }
    },
    server: {
      port: 8081,
      open: true,
      proxy: {
        [env.VITE_API_BASE_URL]: {
          target: 'https://dev-api.meteorological.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(new RegExp(`^${env.VITE_API_BASE_URL}`), '')
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
          assetFileNames: '[ext]/[name]-[hash].[ext]'
        }
      }
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