import { describe, expect, it, vi } from "vitest";
import { registerGameSceneShutdown } from "./GameScene.shutdown";

class TestEventHub {
    private readonly listeners = new Map<string, Set<() => void>>();

    public once(event: string, listener: () => void): void {
        const wrapped = () => {
            this.off(event, wrapped);
            listener();
        };
        this.on(event, wrapped);
    }

    public off(event: string, listener: () => void): void {
        this.listeners.get(event)?.delete(listener);
    }

    public emit(event: string): void {
        for (const listener of this.listeners.get(event) ?? []) listener();
    }

    private on(event: string, listener: () => void): void {
        const listeners = this.listeners.get(event) ?? new Set<() => void>();
        listeners.add(listener);
        this.listeners.set(event, listeners);
    }
}

const createScene = () => ({ events: new TestEventHub() });

describe("registerGameSceneShutdown", () => {
    it("runs cleanup on destroy", () => {
        const scene = createScene();
        const cleanup = vi.fn();

        registerGameSceneShutdown(scene, cleanup);
        scene.events.emit("destroy");

        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it("runs cleanup only once when both lifecycle events fire", () => {
        const scene = createScene();
        const cleanup = vi.fn();

        registerGameSceneShutdown(scene, cleanup);
        scene.events.emit("shutdown");
        scene.events.emit("destroy");

        expect(cleanup).toHaveBeenCalledTimes(1);
    });
});
