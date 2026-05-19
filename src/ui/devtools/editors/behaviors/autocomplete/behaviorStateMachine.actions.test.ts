import { describe, expect, it } from "vitest";
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

describe("behaviorStateMachine actions", () => {
    it("suggests effect verbs after DO", () => {
        const result = behaviorStateMachine({
            tokens: ["WHEN", "self.hp", ">", "1", "DO"],
            currentToken: "",
            previousToken: "DO",
            moduleData,
            draft: null,
        });

        expect(result.map((s) => s.label)).toEqual([
            "SET",
            "ADD",
            "SUB",
            "TRANSFER",
            "DISPATCH",
            "SPAWN",
            "KILL",
            "KILL_ALL_BODIES_EXCEPT",
            "GAIN_HABITI",
            "GAIN_UNDERSTANDING",
        ]);
    });

    it("falls back to WHEN for invalid start", () => {
        const result = behaviorStateMachine({
            tokens: ["GIVE"],
            currentToken: "",
            previousToken: "GIVE",
            moduleData,
            draft: null,
        });

        expect(result.map((s) => s.label)).toEqual(["WHEN"]);
    });

    it("does not suggest operators for unknown references", () => {
        const result = behaviorStateMachine({
            tokens: ["WHEN", "unknown.path"],
            currentToken: "",
            previousToken: "unknown.path",
            moduleData,
            draft: null,
        });

        expect(result).toEqual([]);
    });

    it("does not suggest DO when already present", () => {
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
            tokens: ["WHEN", "self.state.hp", ">", "10", "DO"],
            currentToken: "",
            previousToken: "10",
            moduleData,
            draft,
        });

        expect(result).toEqual([]);
    });
});
