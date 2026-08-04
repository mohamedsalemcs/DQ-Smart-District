import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// كل منصة تُبنى على مسار قاعدي خاص، فتخدمها نشرة واحدة على Vercel
export default defineConfig({
  base: '/portal/',
  plugins: [react(), tailwindcss()],
  resolve: {
    // مطابقة تامة: وإلا ابتلع الاسم المستعار مسارات فرعية مثل @dq/ui/tokens.css
    alias: [
      { find: /^@dq\/core$/, replacement: fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)) },
      { find: /^@dq\/ui$/, replacement: fileURLToPath(new URL('../../packages/ui/src/index.ts', import.meta.url)) },
      { find: /^@dq\/ui\//, replacement: fileURLToPath(new URL('../../packages/ui/src/', import.meta.url)) },
    ],
  },
  server: { port: 3003, strictPort: true },
  build: {
    outDir: 'dist',
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      maxParallelFileOps: 2, // كل عملية تحتفظ بملف في الذاكرة — يتفادى OOM في البناء
      output: {
        manualChunks: {
          charts: ['recharts'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
