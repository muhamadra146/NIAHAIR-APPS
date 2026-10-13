import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Tes frontend (pnpm test). Zona waktu WIB agar label tanggal sama dengan pengguna.
process.env.TZ = "Asia/Jakarta";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    include:     ["src/**/*.test.{ts,tsx}"],
  },
});
