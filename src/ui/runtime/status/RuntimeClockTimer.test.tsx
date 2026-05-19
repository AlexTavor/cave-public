// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatRuntimeTime } from "./formatters";
import { RuntimeClockTimer } from "./RuntimeClockTimer";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { createRuntimeTestDouble } from "../world/testUtils";

const storeRef = vi.hoisted(() => ({ state: { runtime: null as any } }));

vi.mock("../state/useRuntimeStore", () => ({
    useRuntimeStore: (selector: (state: any) => unknown) =>
        selector(storeRef.state),
}));

describe("RuntimeClockTimer", () => {
    it("renders the formatted runtime time and updates on frame invalidation", () => {
        const snapshot = { tick: 0 };
        const runtime = createRuntimeTestDouble({ getState: () => snapshot });
        storeRef.state.runtime = runtime.runtime;

        render(
            <ThemeProvider>
                <RuntimeClockTimer />
            </ThemeProvider>,
        );
        expect(screen.getByText(formatRuntimeTime(0))).toBeTruthy();

        act(() => {
            snapshot.tick = 240;
            runtime.emitFrame(240);
        });

        expect(screen.getByText(formatRuntimeTime(240))).toBeTruthy();
        expect(screen.queryByRole("button", { name: "Play" })).toBeNull();
    });
});
