import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true, // listen on 127.0.0.1, ::1 and the LAN (so you can test on your phone too)
    port: 5173,
  },
});
