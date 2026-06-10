/**
 * 将 /wind-demo 等独立静态页路径映射到 public 下的 index.html，
 * 避免被 SPA fallback 交给 Vue Router。
 * 开发时为 region-demo 提供 /region-demo/env.js（注入 VITE_TIANDITU_TOKEN，不写死在 app.js）。
 */
export function staticDemoPagesPlugin(options = {}) {
  const tiandituToken = String(options.tiandituToken || '').trim()

  const rewrites = [
    { from: /^\/wind-demo\/?$/, to: '/wind-demo/index.html' },
    { from: /^\/wind-demo\/index\.html$/, to: '/wind-demo/index.html' },
    { from: /^\/region-demo\/?$/, to: '/region-demo/index.html' },
    { from: /^\/region-demo\/index\.html$/, to: '/region-demo/index.html' },
    { from: /^\/kriging-demo\/?$/, to: '/kriging-demo/index.html' },
    { from: /^\/kriging-demo\/index\.html$/, to: '/kriging-demo/index.html' },
    { from: /^\/region-meteo-demo\/?$/, to: '/region-meteo-demo/index.html' },
    { from: /^\/region-meteo-demo\/index\.html$/, to: '/region-meteo-demo/index.html' },
    { from: /^\/sim-flight-demo\/?$/, to: '/sim-flight-demo/index.html' },
    { from: /^\/sim-flight-demo\/index\.html$/, to: '/sim-flight-demo/index.html' },
  ]

  return {
    name: 'static-demo-pages',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0] ?? ''

        if (pathname === '/region-demo/env.js') {
          const payload = tiandituToken
            ? `window.__REGION_DEMO_CONFIG__={tiandituToken:${JSON.stringify(tiandituToken)}};`
            : 'window.__REGION_DEMO_CONFIG__={};'
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
          res.end(payload)
          return
        }

        if (pathname === '/region-meteo-demo/env.js') {
          const payload = tiandituToken
            ? `window.__REGION_METEO_DEMO_CONFIG__={tiandituToken:${JSON.stringify(tiandituToken)}};`
            : 'window.__REGION_METEO_DEMO_CONFIG__={};'
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
          res.end(payload)
          return
        }

        if (pathname === '/sim-flight-demo/env.js') {
          const payload = tiandituToken
            ? `window.__SIM_FLIGHT_DEMO_CONFIG__={tiandituToken:${JSON.stringify(tiandituToken)}};`
            : 'window.__SIM_FLIGHT_DEMO_CONFIG__={};'
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
          res.end(payload)
          return
        }

        const query = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
        const match = rewrites.find(({ from }) => from.test(pathname))
        if (match) {
          req.url = match.to + query
        }
        next()
      })
    },
  }
}
