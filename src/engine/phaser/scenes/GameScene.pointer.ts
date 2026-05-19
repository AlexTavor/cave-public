import type { Runtime } from "../../runtime/Runtime";
import { PointerPreviewSystem } from "../pointer/PointerPreviewSystem";
import type { TextureManager } from "../utils/TextureManager";
import { PointerInputController } from "./PointerInputController";

const sceneState = new WeakMap<
    object,
    {
        controller: PointerInputController;
        preview: PointerPreviewSystem;
        update: (time: number) => void;
    }
>();

export const attachPointerSceneSystems = (
    scene: { events: { on(event: string, cb: (time: number) => void): void } },
    getRuntime: () => Runtime | null,
    textureManager: TextureManager,
) => {
    const controller = new PointerInputController(scene as never, getRuntime);
    const preview = new PointerPreviewSystem(scene as never, textureManager);
    controller.bind();
    const update = (time: number) => {
        const runtime = getRuntime();
        if (runtime) preview.update(runtime, time);
    };
    scene.events.on("update", update);
    sceneState.set(scene, { controller, preview, update });
};

export const destroyPointerSceneSystems = (scene: object) => {
    const state = sceneState.get(scene);
    if (!state) return;
    state.controller.destroy();
    state.preview.destroy();
    sceneState.delete(scene);
};
