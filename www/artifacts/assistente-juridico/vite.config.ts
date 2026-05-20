import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const rawPort = process.env.PORT || "23893";
const port = Number(rawPort);
const basePath = process.env.BASE_PATH || "/";

// Plugins opcionais Replit (apenas quando rodando dentro do Replit)
const replitPlugins: any[] = [];
if (process.env.REPL_ID !== undefined && process.env.NODE_ENV !== "production") {
  try {
    const errorOverlay = await import("@replit/vite-plugin-runtime-error-modal");
    replitPlugins.push(errorOverlay.default());
    const cartographer = await import("@replit/vite-plugin-cartographer");
    replitPlugins.push(cartographer.cartographer({ root: path.resolve(import.meta.dirname, "..") }));
    const devBanner = await import("@replit/vite-plugin-dev-banner");
    replitPlugins.push(devBanner.devBanner());
  } catch {
    // plugins opcionais — ignora se não disponíveis
  }
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    ...replitPlugins,
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
