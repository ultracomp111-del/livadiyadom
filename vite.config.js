import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // base: './' делает пути к файлам относительными. 
  // Это критически важно для работы на Beget.
  base: './', 
  
  build: {
    rollupOptions: {
      input: {
        // Указываем Vite все входные точки (твои страницы)
        main: resolve(__dirname, 'index.html'),
        livadia: resolve(__dirname, 'livadia.html'),
      },
    },
  },
});