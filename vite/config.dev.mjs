/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import GameEditorPlugin from "./plugins/vite-plugin-game-editor.ts";

const version = execSync("git rev-list --count HEAD").toString().trim();

// https://vitejs.dev/config/
export default defineConfig({
    base: "./",
    plugins: [react(), GameEditorPlugin()],
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: "./src/tests/setup.ts",
    },
    server: {
        port: 8080,
    },
    define: {
        __APP_VERSION__: JSON.stringify(version),
    },
});

