import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Ticker } from "./Ticker";

const FRAME_DURATION_MS = 16;

describe("Ticker", () => {
    beforeEach(() => {
        vi.useFakeTimers();

        let frameId = 0;
        const timers = new Map<number, ReturnType<typeof setTimeout>>();

        vi.stubGlobal(
            "requestAnimationFrame",
            (callback: FrameRequestCallback) => {
                frameId += 1;
                const id = frameId;
                const timeout = setTimeout(() => {
                    callback(Date.now());
                }, FRAME_DURATION_MS);
                timers.set(id, timeout);
                return id;
            },
        );

        vi.stubGlobal("cancelAnimationFrame", (id: number) => {
            const timeout = timers.get(id);
            if (timeout) {
                clearTimeout(timeout);
                timers.delete(id);
            }
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("does not call callback when stopped", () => {
        const ticker = new Ticker();
        const callback = vi.fn((_dt: number) => undefined);

        ticker.setCallback(callback);
        ticker.start();
        ticker.stop();

        vi.advanceTimersByTime(FRAME_DURATION_MS * 2);
        expect(callback).not.toHaveBeenCalled();
    });

    it("calls callback when started", () => {
        const ticker = new Ticker();
        const callback = vi.fn((_dt: number) => undefined);

        ticker.setCallback(callback);
        ticker.start();

        vi.advanceTimersByTime(FRAME_DURATION_MS * 2);
        expect(callback).toHaveBeenCalled();
        expect(callback).toHaveBeenCalledWith(expect.any(Number));

        ticker.stop();
    });
});
