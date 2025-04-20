import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: parseInt(process.env.VITE_PORT || "8080", 10),
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000/',
        changeOrigin: true,
        secure: false,
        // rewrite: (path) => path.replace(/^\/api/, ''),
           
        configure: (proxy, options) => {
           proxy.on('error', (err, _req, _res) => {
            console.log('error', err);
           });
           proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Request sent to target:', req.method, req.url);
           });
           proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Response received from target:', proxyRes.statusCode, req.url);
           });
          }
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
