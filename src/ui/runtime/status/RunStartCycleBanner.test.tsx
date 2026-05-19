// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { RuntimeRunStartCycleBanner } from "./RunStartCycleBanner";
import { runStartCycleBannerStore } from "./runStartCycleBannerStore";

vi.mock("framer-motion", () => {
    const MotionDiv = ({
        children,
        initial,
        animate,
        exit,
        transition,
        ...props
    }: any) => <div {...props}>{children}</div>;
    return {
        AnimatePresence: ({ children }: any) => <>{children}</>,
        motion: { div: MotionDiv },
    };
});

describe("RunStartCycleBanner", () => {
    const renderBanner = () =>
        render(
            <ThemeProvider>
                <RuntimeRunStartCycleBanner />
            </ThemeProvider>,
        );

    beforeEach(() => {
        vi.useFakeTimers();
        runStartCycleBannerStore.getState().reset();
    });

    afterEach(() => {
        cleanup();
        runStartCycleBannerStore.getState().reset();
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    it("renders the active cycle number", () => {
        renderBanner();

        act(() => runStartCycleBannerStore.getState().show(3));

        expect(screen.getByText("Wakefulness Cycle 3")).toBeTruthy();
    });

    it("stays visible through enter and hold, then disappears after exit", () => {
        renderBanner();

        act(() => runStartCycleBannerStore.getState().show(3));
        act(() => vi.advanceTimersByTime(5400));
        expect(screen.getByText("Wakefulness Cycle 3")).toBeTruthy();

        act(() => vi.advanceTimersByTime(400));
        expect(screen.queryByText("Wakefulness Cycle 3")).toBeNull();
    });

    it("restarts immediately when a newer cycle arrives", () => {
        renderBanner();

        act(() => runStartCycleBannerStore.getState().show(3));
        act(() => vi.advanceTimersByTime(2000));
        act(() => runStartCycleBannerStore.getState().show(4));
        act(() => vi.advanceTimersByTime(5399));

        expect(screen.getByText("Wakefulness Cycle 4")).toBeTruthy();
        expect(screen.queryByText("Wakefulness Cycle 3")).toBeNull();
    });

    it("clears immediately on reset", () => {
        renderBanner();

        act(() => runStartCycleBannerStore.getState().show(5));
        act(() => runStartCycleBannerStore.getState().reset());

        expect(screen.queryByText("Wakefulness Cycle 5")).toBeNull();
    });
});
