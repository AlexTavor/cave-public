// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useSessionStore } from "../../../state/useSessionStore";
import { createCartridge } from "../../../../../engine/test/factories";
import { setByPath } from "../../../../../utils/objectUtils";
import { renderHook } from "@testing-library/react";
import { useStateSuggestions } from "./useStateSuggestions";

const filename = "modules/core.cave";

describe("useStateSuggestions", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        const cart = createCartridge(filename, {
            blueprints: {
                creature: {
                    id: "creature",
                    components: {
                        state: {
                            health: { value: 100, max: 100 },
                            energy: { value: 50, max: 50 },
                        },
                    },
                },
            } as any,
        });
        useSessionStore.getState().initSession(filename, cart);
    });

    afterEach(() => {
        useSessionStore.setState({ sessions: {} });
    });

    it("collects self.state paths from all blueprints", () => {
        const { result } = renderHook(() => useStateSuggestions(filename));
        expect(result.current).toContain("self.state.health.value");
        expect(result.current).toContain("self.state.health.max");
        expect(result.current).toContain("self.state.energy.value");
    });

    it("includes min leaves", () => {
        const { result } = renderHook(() => useStateSuggestions(filename));
        expect(result.current).toContain("self.state.health.min");
    });

    it("returns empty for missing session", () => {
        const { result } = renderHook(() =>
            useStateSuggestions("unknown.cave"),
        );
        expect(result.current).toEqual([]);
    });

    it("returns sorted paths", () => {
        const { result } = renderHook(() => useStateSuggestions(filename));
        const sorted = [...result.current].sort((a, b) => a.localeCompare(b));
        expect(result.current).toEqual(sorted);
    });

    it("updates when blueprints change", () => {
        const { result, rerender } = renderHook(() =>
            useStateSuggestions(filename),
        );
        expect(result.current).not.toContain("self.state.mana.value");

        useSessionStore.getState().updateDraft(filename, (draft) => {
            setByPath(draft, "blueprints.wizard.components.state.mana", {
                value: 30,
                max: 30,
            });
        });
        rerender();

        expect(result.current).toContain("self.state.mana.value");
    });
});
