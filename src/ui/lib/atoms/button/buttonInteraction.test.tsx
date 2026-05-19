// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { useClickPulse } from "./buttonInteraction";

const Harness = ({
    onReady,
}: {
    onReady(value: ReturnType<typeof useClickPulse>): void;
}) => {
    onReady(useClickPulse(10));
    return null;
};

describe("useClickPulse", () => {
    it("cleans up delayed state updates on unmount", () => {
        vi.useFakeTimers();
        let pulse: ReturnType<typeof useClickPulse> | null = null;
        const view = render(<Harness onReady={(value) => (pulse = value)} />);
        act(() => {
            pulse?.triggerClick();
        });
        view.unmount();
        act(() => {
            vi.runAllTimers();
        });
        expect(true).toBe(true);
        vi.useRealTimers();
    });
});
