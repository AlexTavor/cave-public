// @vitest-environment jsdom
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { ThemeProvider } from "../../../ui/lib/foundation/theme/ThemeProvider";
import { useRuntimeStore } from "../../../ui/runtime/state/useRuntimeStore";
import { usePhaserGame } from "./usePhaserGame";

const gameConfigs: any[] = [];

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

vi.mock("../scenes/GameScene", () => ({ GameScene: class {} }));

const Probe = () => {
    const ref = useRef<HTMLDivElement>(null);
    usePhaserGame({ containerRef: ref, inputTarget: "window" });
    return <div ref={ref} />;
};

describe("usePhaserGame input target", () => {
    it("configures Phaser to read mouse and touch input from window", () => {
        gameConfigs.length = 0;
        useRuntimeStore.setState({ runtime: { id: "game" } as any });
        render(
            <ThemeProvider>
                <Probe />
            </ThemeProvider>,
        );
        expect(gameConfigs[0].input.mouse.target).toBe(globalThis);
        expect(gameConfigs[0].input.touch.target).toBe(globalThis);
    });
});
