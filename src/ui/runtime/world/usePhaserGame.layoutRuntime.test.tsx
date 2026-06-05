// @vitest-environment jsdom
import { useRef } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { LayoutWorldAdapter } from "../../devtools/layout/context/LayoutWorldAdapter";
import { useRuntimeStore } from "../state/useRuntimeStore";
import type { Runtime } from "../../../engine/runtime/Runtime";
import { usePhaserGame } from "./usePhaserGame";

class TestEventHub {
    private readonly listeners = new Map<string, Array<() => void>>();
    public once(event: string, listener: () => void): void {
        const next = this.listeners.get(event) ?? [];
        next.push(listener);
        this.listeners.set(event, next);
    }
    public emit(event: string): void {
        const listeners = this.listeners.get(event) ?? [];
        this.listeners.delete(event);
        listeners.forEach((listener) => listener());
    }
}

const sceneParams: Array<{
    getRuntime: () => unknown;
    events: TestEventHub;
}> = [];

vi.mock("phaser", () => ({
    default: {
        AUTO: 0,
        CANVAS: 1,
        Scale: { RESIZE: "resize" },
        Game: class {
            destroy = vi.fn();
        },
    },
}));

vi.mock("../../../engine/phaser/scenes/GameScene", () => ({
    GameScene: class {
        public events = new TestEventHub();
        constructor(params: { getRuntime: () => unknown }) {
            sceneParams.push({ ...params, events: this.events });
        }
    },
}));

const Probe = () => {
    const ref = useRef<HTMLDivElement>(null);
    usePhaserGame({ containerRef: ref, backgroundColor: "transparent" });
    return <div ref={ref} />;
};

describe("usePhaserGame layout runtime", () => {
    beforeEach(() => {
        sceneParams.length = 0;
        useRuntimeStore.setState({ runtime: { id: "game" } as unknown as Runtime });
    });

    it("prefers layout context runtime over the global game runtime", () => {
        const layoutRuntime = { id: "layout" } as unknown as Runtime;

        render(
            <ThemeProvider>
                <LayoutWorldAdapter runtime={layoutRuntime}>
                    <Probe />
                </LayoutWorldAdapter>
            </ThemeProvider>,
        );

        expect(sceneParams).toHaveLength(1);
        expect(sceneParams[0].getRuntime()).toBe(layoutRuntime);
    });

    it("creates a scene for the active runtime", () => {
        render(
            <ThemeProvider>
                <Probe />
            </ThemeProvider>,
        );

        expect(sceneParams).toHaveLength(1);
    });
});
