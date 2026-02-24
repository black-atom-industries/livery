import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = Deno.env.get("TAURI_DEV_HOST");

export default defineConfig({
    clearScreen: false,
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@black-atom/core": "@jsr/black-atom__core",
        },
    },
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    },
});
