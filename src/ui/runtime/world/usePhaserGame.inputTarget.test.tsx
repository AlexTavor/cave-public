// @vitest-environment jsdom
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { useRuntimeStore } from "../state/useRuntimeStore";
import type { Runtime } from "../../../engine/runtime/Runtime";
import { usePhaserGame } from "./usePhaserGame";

type CapturedGameConfig = {
    input: { mouse: { target: unknown }; touch: { target: unknown } };
};
const gameConfigs: unknown[] = [];

vi.mock("phaser", () => ({
    default: {
        AUTO: 0,
        CANVAS: 1,
        Scale: { RESIZE: "resize" },
        Game: class {
            constructor(config: unknown) {
                gameConfigs.push(config);
            }
            destroy = vi.fn();
        },
    },
}));

vi.mock("../../../engine/phaser/scenes/GameScene", () => ({ GameScene: class {} }));

const Probe = () => {
    const ref = useRef<HTMLDivElement>(null);
    usePhaserGame({ containerRef: ref, inputTarget: "window" });
    return <div ref={ref} />;
};

describe("usePhaserGame input target", () => {
    it("configures Phaser to read mouse and touch input from window", () => {
        gameConfigs.length = 0;
        useRuntimeStore.setState({ runtime: { id: "game" } as unknown as Runtime });
        render(
            <ThemeProvider>
                <Probe />
            </ThemeProvider>,
        );
        const config = gameConfigs[0] as CapturedGameConfig;
        expect(config.input.mouse.target).toBe(globalThis);
        expect(config.input.touch.target).toBe(globalThis);
    });
});
