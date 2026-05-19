import type { Plugin } from "vite";
import { registerCoreEditorMiddleware } from "./game-editor/coreMiddleware";
import { registerFsEditorMiddleware } from "./game-editor/fsMiddleware";

export default function GameEditorPlugin(): Plugin {
    return {
        name: "vite-plugin-game-editor",
        configureServer(server) {
            console.log("[GameEditor] Configuring server");
            registerCoreEditorMiddleware(server);
            registerFsEditorMiddleware(server);
        },
    };
}
