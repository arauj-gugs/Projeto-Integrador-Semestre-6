import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/atendimentos": "http://localhost:3000",
      "/historico": "http://localhost:3000",
      "/serie": "http://localhost:3000",
      "/health": "http://localhost:3000",
    },
  },
});
