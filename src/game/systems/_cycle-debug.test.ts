import { describe, expect, it } from "vitest";
import { CompilerService } from "../../engine/compiler/CompilerService";
import { createBlueprint, createCartridge } from "../../engine/test/factories";
import { createGame } from "../main";

const LOGIC_STEP_MS = 20;

const createRuntime = () => {
    const blueprint = new CompilerService().compile(
        createBlueprint("cycle_job", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 1, perBody: 0, multPerBody: 0 },
                        inputs: {},
                        oneOff: false,
                        startActive: true,
                        conditions: [],
                    },
                    conditionalActivation: {
                        conditions: [
                            {
                                kind: "fact_threshold",
                                scope: "run",
                                factType: "cycle_completed",
                                factAbout: "cycle_job",
                                operator: "<",
                                value: 1,
                            },
                        ],
                        targets: [{ ability: "cycle" }],
                    },
                },
            },
        }),
    );
    const runtime = createGame(
        createCartridge("test", { blueprints: { cycle_job: blueprint } }),
        "seed",
    );
    runtime.addEntity({
        id: "cycle-1",
        blueprintId: "cycle_job",
        state: {
            ...blueprint.components.state,
            cycle: { value: 1, max: 1, visible: true },
            cycle_active: { value: 1, visible: false },
        },
        behavior: blueprint.components.behavior,
        powerSink: blueprint.components.powerSink,
    } as any);
    return runtime;
};

describe("cycle completed conditional activation sequencing", () => {
    it("settles the cycle throttle off after the fact-driven gate closes", () => {
        const runtime = createRuntime();
        for (let index = 0; index < 5; index += 1) runtime.tick(LOGIC_STEP_MS);
        const entity = runtime
            .getWorld()
            .entities.find((item) => item.id === "cycle-1") as any;
        expect(entity?.powerSink?.throttle).toBe(0);
        expect(entity?.state?.cycle_active?.value).toBe(0);
    });
});
