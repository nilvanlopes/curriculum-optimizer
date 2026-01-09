import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: false, // Será controlado via CLI
    strictPort: false,
    cors: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
  },
  publicDir: false, // Não usar diretório público padrão
});
