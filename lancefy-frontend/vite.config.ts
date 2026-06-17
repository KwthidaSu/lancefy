import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

function createVendorChunkName(moduleId: string) {
  if (moduleId.includes("node_modules/react/")) return "react-vendor";
  if (moduleId.includes("node_modules/react-dom/")) return "react-vendor";
  if (moduleId.includes("node_modules/scheduler/")) return "react-vendor";
  if (moduleId.includes("node_modules/react-router/")) return "router-vendor";
  if (moduleId.includes("node_modules/react-router-dom/")) return "router-vendor";
  if (moduleId.includes("node_modules/i18next/")) return "i18n-vendor";
  if (moduleId.includes("node_modules/react-i18next/")) return "i18n-vendor";
  if (moduleId.includes("node_modules/keycloak-js/")) return "auth-vendor";
  if (moduleId.includes("node_modules/@react-keycloak/")) return "auth-vendor";

  if (
    moduleId.includes("node_modules/@radix-ui/") ||
    moduleId.includes("node_modules/react-day-picker/") ||
    moduleId.includes("node_modules/framer-motion/") ||
    moduleId.includes("node_modules/lucide-react/") ||
    moduleId.includes("node_modules/react-icons/") ||
    moduleId.includes("node_modules/react-loading-skeleton/")
  ) {
    return "ui-vendor";
  }

  if (
    moduleId.includes("node_modules/axios/") ||
    moduleId.includes("node_modules/qs/") ||
    moduleId.includes("node_modules/@tanstack/")
  ) {
    return "data-vendor";
  }

  return "vendor";
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          return createVendorChunkName(id);
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
