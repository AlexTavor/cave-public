// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { RuntimeClock } from "./RuntimeClock";

vi.mock("../../lib/atoms/animatable/Animatable", () => ({
    Animatable: ({ children, type }: any) => (
        <div data-type={type}>{children}</div>
    ),
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));
vi.mock("./useRuntimeClock", () => ({
    useRuntimeClockTime: () => ({ current: null }),
    useRuntimeClockControls: () => ({
        status: "paused",
        timeScale: 1,
        togglePlayback: vi.fn(),
        handleScaleToggle: vi.fn(),
    }),
}));

const world: any = { id: "sys_world" };
const runtime = { getEntity: () => world } as any;

describe("RuntimeClock attention", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(
            (cb) => setTimeout(() => cb(Date.now()), 0) as any,
        );
        vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation((id) =>
            clearTimeout(id as any),
        );
        delete world.tutorial;
        useRuntimeStore.setState({ runtime });
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("hides and shows through the animated visibility path on the same runtime", () => {
        render(
            <ThemeProvider>
                <RuntimeClock />
            </ThemeProvider>,
        );
        expect(screen.getByLabelText("Runtime clock")).toBeDefined();
        world.tutorial = {
            active: true,
            attention: { hideTimeControls: true },
        };
        act(() => vi.runOnlyPendingTimers());
        expect(screen.queryByLabelText("Runtime clock")).toBeNull();
        world.tutorial = {
            active: true,
            attention: { hideTimeControls: false },
        };
        act(() => vi.runOnlyPendingTimers());
        expect(screen.getByLabelText("Runtime clock")).toBeDefined();
        expect(screen.getByText("1x")).toBeDefined();
    });
});
