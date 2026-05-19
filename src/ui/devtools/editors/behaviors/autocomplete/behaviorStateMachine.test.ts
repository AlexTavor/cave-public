import { describe, it, expect } from "vitest";
import type { ModuleCartridge } from "../../../../../data/schemas/module";
import { behaviorStateMachine } from "./behaviorStateMachine";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../engine/test/factories";

const moduleData: ModuleCartridge = createCartridge("game.json", {
    metadata: { id: "game.json", name: "Game", version: "0.0.1" },
    blueprints: {
        entity_alpha: createBlueprint("entity_alpha", { components: {} }),
        entity_beta: createBlueprint("entity_beta", { components: {} }),
    },
});

describe("behaviorStateMachine", () => {
    it("suggests WHEN at start", () => {
        const result = behaviorStateMachine({
            tokens: [],
            currentToken: "",
            previousToken: "",
            moduleData,
            draft: null,
        });

        expect(result.map((s) => s.label)).toEqual(["WHEN"]);
    });

    it("suggests entities after WHEN", () => {
        const result = behaviorStateMachine({
            tokens: ["WHEN"],
            currentToken: "",
            previousToken: "WHEN",
            moduleData,
            draft: null,
        });

        expect(result.map((s) => s.label)).toEqual([
            "self",
            "global",
            "entity_alpha",
            "entity_beta",
        ]);
    });

    it("suggests numeric operators after a number reference", () => {
        const draft = {
            id: "draft",
            label: "Draft",
            tags: [],
            components: {
                state: {
                    hp: { value: 10, max: 20, min: 0, visible: true },
                },
            },
        } as any;

        const result = behaviorStateMachine({
            tokens: ["WHEN", "self.state.hp"],
            currentToken: "",
            previousToken: "self.state.hp",
            moduleData,
            draft,
        });

        expect(result.map((s) => s.label)).toEqual([
            ".",
            ">",
            "<",
            "=",
            "!=",
            ">=",
            "<=",
        ]);
    });

    it("suggests equality operators for string references", () => {
        const draft = {
            id: "draft",
            label: "Draft",
            tags: [],
            components: {},
        } as any;

        const result = behaviorStateMachine({
            tokens: ["WHEN", "self.label"],
            currentToken: "",
            previousToken: "self.label",
            moduleData,
            draft,
        });

        expect(result.map((s) => s.label)).toEqual(["=", "!="]);
    });

    it("suggests DO and AND after a complete condition", () => {
        const draft = {
            id: "draft",
            label: "Draft",
            tags: [],
            components: {
                state: {
                    hp: { value: 10, max: 20, min: 0, visible: true },
                },
            },
        } as any;

        const result = behaviorStateMachine({
            tokens: ["WHEN", "self.state.hp", ">", "10"],
            currentToken: "",
            previousToken: "10",
            moduleData,
            draft,
        });

        expect(result.map((s) => s.label)).toEqual(["DO", "AND"]);
    });
});

