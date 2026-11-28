import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  build: {
    rollupOptions: { input: resolve('app.html') },
  },
  plugins: [{
    name: 'source-entry',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (request.url === '/') request.url = '/app.html';
        next();
      });
    },
  }],
});
