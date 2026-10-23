import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Vite configuration.
 *
 * The proxy block is critical: all /dashboard, /api, and /health requests
 * from the React dev server are forwarded to the gateway at port 3000.
 * This means:
 *   - No CORS issues (browser only ever talks to localhost:5173)
 *   - API keys never live in frontend source code
 *   - SSE streams work correctly through Vite's proxy
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/dashboard": {
        target:      "http://localhost:3000",
        changeOrigin: true,
        // Keep the connection alive for SSE streams
        configure: (proxy) => {
          proxy.on("error", (err) => console.error("[proxy]", err.message));
        },
      },
      "/api": {
        target:      "http://localhost:3000",
        changeOrigin: true,
      },
      "/health": {
        target:      "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
