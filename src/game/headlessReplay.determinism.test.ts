import { describe, expect, it } from "vitest";
import {
    enqueueInitialSpawn,
    initializeWorldState,
    runSimulationLoop,
} from "../engine/balancing/HeadlessRunner.utils";
import { createBlueprint, createCartridge } from "../engine/test/factories";
import { createGameRuntime } from "../engine/runtime/createGameRuntime";
import type { Runtime } from "../engine/runtime/Runtime";
import { UpdateBodiesBatchHandler } from "./handlers/UpdateBodiesBatchHandler";
import { assignBodyHabiti } from "./habiti/assignBodyHabiti";

// End-to-end proof that a headless run is replayable from its seed. The sim
// exercises every determinism-sensitive path the engine has: deterministic spawn
// ids (mintSpawnId), seed-derived body identities, and worldSeed-driven habiti
// rolls. If any of those were non-deterministic (e.g. the old nanoid() spawn ids,
// which feed RuntimeEntityStore's id-sort), two runs from one seed would diverge.

const BODY_COUNT = 8;
const TICKS = 120;

const species = (id: string) => ({
    id,
    label: id,
    type: "species",
    effects: [],
    excludes: [],
});

const buildCartridge = () => {
    const cartridge = createCartridge("replay-test", {
        blueprints: {
            sys_world: createBlueprint("sys_world", {
                components: {
                    state: {
                        population: { value: 0, visible: true },
                        food: { value: 100, visible: true },
                        heat: { value: 50, visible: true },
                        comfort: { value: 50, visible: true },
                    },
                },
            }),
            worker: createBlueprint("worker", {
                tags: ["body"],
                components: { body: { health: 100 } as never },
            }),
        },
    });
    // A 50/50 weighted species pool so the (worldSeed-seeded) habiti roll is what
    // makes one seed's world differ from another's. createCartridge always sets
    // config + settings, so this cast to a mutable shape is safe.
    const config = cartridge.config as unknown as {
        habiti: Record<string, unknown>;
        settings: { body: Record<string, unknown> };
    };
    config.habiti = {
        human: species("human"),
        moth: species("moth"),
    };
    config.settings.body = {
        habitusTypeRules: [
            {
                habitusType: "species",
                probability: 1,
                maxCount: 1,
                weightedPool: [
                    { habitusId: "human", weight: 1 },
                    { habitusId: "moth", weight: 1 },
                ],
            },
        ],
    };
    return cartridge;
};

const runHeadless = async (seed: string) => {
    const runtime = createGameRuntime(buildCartridge(), seed);
    // Body habiti are applied by the game-layer UPDATE_BODIES_BATCH handler.
    runtime.registerCommandHandler(new UpdateBodiesBatchHandler() as never);
    // The engine spawn path computes habiti through the game-injected assigner
    // (the worldSeed-driven roll this test exercises); wire it as
    // registerGameCommandHandlers would. Without it the roll is a no-op and the
    // "different seed diverges" assertion below could not hold.
    runtime.setBodyHabitiAssigner(assignBodyHabiti);
    // initializeWorldState re-establishes the run seed on sys_world.state after
    // replacing it, so the seed-driven habiti rolls below actually depend on the
    // seed — the "different seed diverges" assertion is what guards that.
    initializeWorldState(runtime, buildCartridge());
    enqueueInitialSpawn(runtime, { blueprintId: "worker", count: BODY_COUNT });
    const loop = await runSimulationLoop(runtime, TICKS);
    return { runtime, history: loop.history };
};

// Canonical, order-stable snapshot of the whole world: every entity's id, tags,
// state, and body (passport + habiti). Random spawn ids or non-deterministic
// identity/habiti would change this between two same-seed runs.
const snapshotWorld = (runtime: Runtime) =>
    runtime
        .getWorld()
        .entities.map((entity) => {
            const e = entity as unknown as {
                id?: string;
                tags?: string[];
                state?: unknown;
                body?: unknown;
            };
            return {
                id: e.id,
                tags: [...(e.tags ?? [])].sort(),
                state: e.state ?? null,
                body: e.body ?? null,
            };
        })
        .sort((left, right) => String(left.id).localeCompare(String(right.id)));

const spawnIds = (runtime: Runtime) =>
    snapshotWorld(runtime)
        .map((entity) => String(entity.id))
        .filter((id) => id.startsWith("spawn_"));

const bodyHabiti = (runtime: Runtime) =>
    snapshotWorld(runtime)
        .filter((entity) => String(entity.id).startsWith("spawn_"))
        .map((entity) => (entity.body as { habiti?: unknown } | null)?.habiti);

describe("headless replay determinism", () => {
    it("re-running from the same seed yields an identical world and history", async () => {
        const first = await runHeadless("seed-alpha");
        const second = await runHeadless("seed-alpha");

        // The run is non-trivial: 8 bodies spawned, with deterministic ids
        // (this is exactly what the nanoid() → mintSpawnId() fix guarantees).
        expect(spawnIds(first.runtime)).toEqual([
            "spawn_1",
            "spawn_2",
            "spawn_3",
            "spawn_4",
            "spawn_5",
            "spawn_6",
            "spawn_7",
            "spawn_8",
        ]);

        // The whole world — ids, identities, seed-rolled habiti, sys_world state
        // (including the spawnSerial/bodySerial counters) — replays bit-identically.
        expect(snapshotWorld(second.runtime)).toEqual(
            snapshotWorld(first.runtime),
        );
        expect(second.history).toEqual(first.history);
    });

    it("a different seed yields a different world (the run genuinely uses the seed)", async () => {
        const alpha = await runHeadless("seed-alpha");
        const beta = await runHeadless("seed-beta");

        // Same deterministic spawn ids either way (the counter is seed-independent)…
        expect(spawnIds(beta.runtime)).toEqual(spawnIds(alpha.runtime));
        // …but the worldSeed-driven habiti rolls diverge, so the worlds are not
        // equal — proving the equality above is not a trivial "seed is ignored" pass.
        expect(bodyHabiti(beta.runtime)).not.toEqual(bodyHabiti(alpha.runtime));
    });
});
