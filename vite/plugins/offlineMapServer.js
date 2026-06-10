import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json',
  '.terrain': 'application/octet-stream',
  '.hm': 'application/octet-stream',
};

function createStaticHandler(rootDir) {
  const root = path.resolve(rootDir);

  return (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 200;
      res.end();
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.end('Method Not Allowed');
      return;
    }

    if (!fs.existsSync(root)) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(`Offline map root not found: ${root}`);
      return;
    }

    let rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '');
    if (!rel) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    const filePath = path.normalize(path.join(root, rel));
    if (!filePath.startsWith(root)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    fs.createReadStream(filePath).pipe(res);
  };
}

function tryListen(server, host, port) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.off('listening', onListening);
      reject(err);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve(port);
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

/**
 * 与 map.js / tile_http_server.py 一致：127.0.0.1:8765 静态服务 source 根目录
 * /CT/{z}/{x}/{y}.png  /Terrain/layer.json
 */
export function offlineMapServerPlugin(serveDir, options = {}) {
  const host = options.host || '127.0.0.1';
  const port = Number(options.port) || 8765;
  let server = null;

  function stop() {
    if (server) {
      server.close();
      server = null;
    }
  }

  async function startStandalone() {
    stop();
    const root = path.resolve(serveDir);
    if (!fs.existsSync(root)) {
      console.warn(`[offline-map-server] 目录不存在: ${root}`);
      return;
    }

    const candidate = http.createServer(createStaticHandler(root));
    try {
      await tryListen(candidate, host, port);
      server = candidate;
      console.log(`[offline-map-server] serve root: ${root}`);
      console.log(`[offline-map-server] started http://${host}:${port}`);
      console.log(`[offline-map-server] imagery: http://${host}:${port}/CT/{z}/{x}/{y}.png`);
      console.log(`[offline-map-server] terrain: http://${host}:${port}/Terrain/`);
    } catch (err) {
      candidate.close();
      if (err?.code === 'EADDRINUSE') {
        console.warn(
          `[offline-map-server] 端口 ${host}:${port} 已被占用，假定已有离线瓦片服务（与 demo tile_http_server.py 相同）`,
        );
        return;
      }
      console.warn('[offline-map-server] 启动失败', err);
    }
  }

  function mountOnVite(server) {
    const root = path.resolve(serveDir);
    if (!fs.existsSync(root)) {
      console.warn(`[offline-map-server] 目录不存在，跳过 Vite 中间件: ${root}`);
      return;
    }

    const handler = createStaticHandler(root);
    server.middlewares.use((req, res, next) => {
      const pathname = (req.url || '').split('?')[0];
      if (pathname.startsWith('/Terrain/') || pathname.startsWith('/CT/')) {
        handler(req, res);
        return;
      }
      next();
    });
    console.log(`[offline-map-server] Vite 中间件: /Terrain/ /CT/ → ${root}`);
  }

  return {
    name: 'offline-map-server',
    configureServer(server) {
      mountOnVite(server);
      startStandalone();
      return () => {
        stop();
      };
    },
    configurePreviewServer(server) {
      mountOnVite(server);
      startStandalone();
      return () => {
        stop();
      };
    },
  };
}
