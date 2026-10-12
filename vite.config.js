import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // GitHub Pages serves the site from https://damianadamus.github.io/3js_wedding/
  base: command === 'build' ? '/3js_wedding/' : '/',
  server: {
    host: true, // listen on 127.0.0.1, ::1 and the LAN (so you can test on your phone too)
    port: 5173,
  },
}));
