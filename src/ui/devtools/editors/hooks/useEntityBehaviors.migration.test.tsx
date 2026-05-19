// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Blueprint } from "../../../../data/schemas/blueprint";
import { useSessionStore } from "../../state/useSessionStore";
import { useEntityBehaviors } from "./useEntityBehaviors";
import { BlueprintProvider } from "../blueprint/BlueprintContext";
import { createCartridge } from "../../../../engine/test/factories";

const filename = "game.json";
const blueprintId = "entity_a";

const blueprint: Blueprint = {
    id: blueprintId,
    label: "Entity A",
    tags: [],
    components: {
        behavior: {
            rules: [
                {
                    id: "b1",
                    sortKey: "sk_b1",
                    conditions: [
                        {
                            id: "c1",
                            sortKey: "sk_c1",
                            tokens: [{ t: "val", v: 1 }],
                        },
                    ],
                    actions: [
                        {
                            type: "MUTATE",
                            target: "self.state.hp.value",
                            op: "SET",
                            value: 1,
                        },
                    ],
                },
            ],
        },
    },
};

afterEach(() => {
    useSessionStore.setState({ sessions: {} });
});

beforeEach(() => {
    useSessionStore.setState({ sessions: {} });
    useSessionStore.getState().initSession(
        filename,
        createCartridge(filename, {
            blueprints: { [blueprintId]: blueprint },
        }),
    );
});

describe("useEntityBehaviors", () => {
    it("returns behavior rules", () => {
        const { result } = renderHook(() => useEntityBehaviors(), {
            wrapper: ({ children }) => (
                <BlueprintProvider value={{ filename, blueprintId }}>
                    {children}
                </BlueprintProvider>
            ),
        });

        expect(result.current.behaviors).toHaveLength(1);
        expect(result.current.behaviors[0]?.sentence).toContain("WHEN");
    });
});
