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
      "/fila": "http://localhost:3000",
      "/tutor": "http://localhost:3000",
      "/tutores": "http://localhost:3000",
      "/animais": "http://localhost:3000",
      "/agendamentos": "http://localhost:3000",
      "/termos": "http://localhost:3000",
      "/recepcao": "http://localhost:3000",
      "/dev": "http://localhost:3000",
    },
  },
});
