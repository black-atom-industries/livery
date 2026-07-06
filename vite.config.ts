import { fileURLToPath } from "node:url";
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
    resolve: {
        // core is pulled in via deno `links` from ../core, which lives outside
        // livery's project root. The deno vite-plugin only applies livery's
        // import map to in-tree files, so core's bare `culori` import reaches
        // Rollup unresolved. Alias it to the installed package explicitly.
        alias: {
            culori: fileURLToPath(
                new URL("./node_modules/culori/src/index.js", import.meta.url),
            ),
        },
    },
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    },
});
