import { describe, expect, it } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";

const compileCycle = (cycle: Record<string, unknown>) =>
    new CompilerService().compile(
        createBlueprint("bp_cycle", {
            components: {},
            _editor: { abilities: { cycle } as any },
        }),
    );

describe("cycleCompiler showThrottleSlider", () => {
    it("defaults the compiled power sink visibility to true", () => {
        const compiled = compileCycle({
            maxProgress: { base: 10, perBody: 0, multPerBody: 0 },
            inputs: {},
            oneOff: false,
            conditions: [],
        });

        expect(compiled.components.powerSink?.showThrottleSlider).toBe(true);
    });

    it("preserves an explicit false visibility flag", () => {
        const compiled = compileCycle({
            maxProgress: { base: 10, perBody: 0, multPerBody: 0 },
            inputs: {},
            oneOff: false,
            showThrottleSlider: false,
            conditions: [],
        });

        expect(compiled.components.powerSink?.showThrottleSlider).toBe(false);
    });
});
