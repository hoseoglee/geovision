import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), cesium()],
    resolve: {
      alias: { '@': '/src' },
    },
    server: {
      proxy: {
        '/api/windy': {
          target: 'https://api.windy.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/windy/, '/webcams/api/v3'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('x-windy-api-key', env.VITE_WINDY_KEY || '');
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });
          },
        },
      },
    },
  };
});
