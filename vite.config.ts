import { defineConfig } from "vite";
import deno from "@deno/vite-plugin";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";

const host = Deno.env.get("TAURI_DEV_HOST");

export default defineConfig({
    clearScreen: false,
    plugins: [
        deno(),
        tanstackRouter({ target: "react", autoCodeSplitting: true, addExtensions: true }),
        react(),
    ],
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    },
});
