import { describe, expect, it } from "vitest";
import { compileActionSequence, parseAction } from "./actionCompiler";

describe("behaviors/actionCompiler", () => {
    it("parses mutate actions", () => {
        const action = parseAction(["SET", "self.hp", "5"]);
        expect(action).toEqual({
            type: "MUTATE",
            target: "self.hp",
            op: "SET",
            value: 5,
        });
    });

    it("parses spawn and kill actions", () => {
        const actions = compileActionSequence("SPAWN ghost AND KILL self");
        expect(actions).toEqual([
            { type: "SPAWN", blueprintId: "ghost" },
            { type: "KILL", entityId: "self" },
        ]);
    });

    it("parses kill-all-bodies-except actions", () => {
        expect(parseAction(["KILL_ALL_BODIES_EXCEPT", "2"])).toEqual({
            type: "KILL_ALL_BODIES_EXCEPT",
            quantity: 2,
        });
    });

    it("rejects invalid verbs", () => {
        expect(() => compileActionSequence("FLY away")).toThrow(
            "Unknown action verb",
        );
    });

    it("parses and formats gain understanding actions", () => {
        const action = parseAction(["GAIN_UNDERSTANDING", "insight"]);
        expect(action).toEqual({
            type: "GAIN_UNDERSTANDING",
            understandingId: "insight",
        });
    });
});

