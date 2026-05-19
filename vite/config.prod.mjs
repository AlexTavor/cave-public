import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

const phasermsg = () => {
    return {
        name: "phasermsg",
        buildStart() {
            process.stdout.write(`Building for production...\n`);
        },
        buildEnd() {
            process.stdout.write(`✨ Done ✨\n`);
        },
    };
};

const version = execSync("git rev-list --count HEAD").toString().trim();

export default defineConfig({
    base: "./",
    plugins: [react(), phasermsg()],
    logLevel: "warning",
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    phaser: ["phaser"],
                },
            },
        },
        minify: "terser",
        terserOptions: {
            compress: {
                passes: 2,
            },
            mangle: true,
            format: {
                comments: false,
            },
        },
    },
    define: {
        __APP_VERSION__: JSON.stringify(version),
    },
});

