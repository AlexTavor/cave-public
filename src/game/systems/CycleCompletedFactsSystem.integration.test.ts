import { describe, expect, it } from "vitest";
import { CompilerService } from "../../engine/compiler/CompilerService";
import { createBlueprint, createCartridge } from "../../engine/test/factories";
import { createGame } from "../main";

const LOGIC_STEP_MS = 20;

const compileCycleBlueprint = () =>
    new CompilerService().compile(
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

const getEntity = (runtime: ReturnType<typeof createGame>, id: string) =>
    runtime.getWorld().entities.find((entity) => entity.id === id) as any;

describe("CycleCompletedFactsSystem integration", () => {
    it("turns off conditional cycle activation after a normal completion", () => {
        const blueprint = compileCycleBlueprint();
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

        runtime.tick(LOGIC_STEP_MS);
        runtime.tick(LOGIC_STEP_MS);
        expect(
            getEntity(runtime, "sys_world")?.run?.cycle_completed?.cycle_job,
        ).toBe(1);

        runtime.tick(LOGIC_STEP_MS);
        runtime.tick(LOGIC_STEP_MS);
        runtime.tick(LOGIC_STEP_MS);
        expect(getEntity(runtime, "cycle-1")?.powerSink?.throttle).toBe(0);
        expect(getEntity(runtime, "cycle-1")?.state?.cycle_active?.value).toBe(
            0,
        );
    });
});
