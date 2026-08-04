import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// كل منصة تُبنى على مسار قاعدي خاص، فتخدمها نشرة واحدة على Vercel
export default defineConfig({
  base: '/ops/',
  plugins: [react(), tailwindcss()],
  resolve: {
    // مطابقة تامة: وإلا ابتلع الاسم المستعار مسارات فرعية مثل @dq/ui/tokens.css
    alias: [
      { find: /^@dq\/core$/, replacement: fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)) },
      { find: /^@dq\/ui$/, replacement: fileURLToPath(new URL('../../packages/ui/src/index.ts', import.meta.url)) },
      { find: /^@dq\/ui\//, replacement: fileURLToPath(new URL('../../packages/ui/src/', import.meta.url)) },
    ],
  },
  server: { port: 3002, strictPort: true },
  build: {
    outDir: 'dist',
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      maxParallelFileOps: 2, // كل عملية تحتفظ بملف في الذاكرة — يتفادى OOM في البناء
      output: {
        // PERF — التقسيم بدالّة لا بكائن: الشكل الكائني كان يترك وحدات مشتركة
        // (أهمها react/jsx-runtime) تسقط في حزمة three، فيستوردها المدخل استيرادًا
        // ساكنًا ويسحب معه المليون بايت كاملة إلى أول تحميل — حتى لو لم تُفتح خريطة.
        manualChunks(id: string) {
          if (id.includes('vite/preload-helper')) return 'react';
          const m = /[\\/]node_modules[\\/](@[^\\/]+[\\/][^\\/]+|[^\\/]+)/.exec(id);
          if (!m) return;
          const pkg = m[1].replace(/\\/g, '/');
          if (pkg === 'three' || pkg === 'three-mesh-bvh' || pkg.startsWith('@react-three/')) return 'three';
          if (pkg === 'recharts' || pkg.startsWith('d3-') || pkg === 'victory-vendor' || pkg === 'decimal.js-light' || pkg === 'internmap') return 'charts';
          // zustand مشتركة بين المخزن و@react-three/fiber. كل وحدة مشتركة تُترك
          // بلا وجهة يرفعها Rollup إلى حزمة three، فيستوردها المدخل استيرادًا
          // ساكنًا ويسحب المليون بايت إلى أول تحميل. تثبيتها هنا يقطع ذلك الرباط.
          if (
            pkg === 'react' || pkg === 'react-dom' || pkg === 'react-router' ||
            pkg === 'react-router-dom' || pkg === 'scheduler' || pkg === 'zustand'
          ) return 'react';
        },
      },
    },
  },
});
