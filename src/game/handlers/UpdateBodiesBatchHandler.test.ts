import { describe, it, expect } from "vitest";
import { UpdateBodiesBatchHandler } from "./UpdateBodiesBatchHandler";
import type { RuntimeCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";

const makeContext = (entities: any[]) =>
    ({
        world: { entities, add: () => {}, remove: () => {} },
        cartridge: { blueprints: {}, blueprint: {}, assets: {} },
        impulseEngine: {},
        telemetry: { log: () => {} },
        markEntityListDirty: () => {},
    }) as any;

const makeBodyEntity = (id: string, health: number, maxHealth: number) => ({
    id,
    body: { health, maxHealth, xp: 0, xpRate: 1, level: 1, traits: [] },
});

const makeCommand = (updates: any[]): RuntimeCommand =>
    ({
        type: RuntimeCommandType.UPDATE_BODIES_BATCH,
        payload: { updates },
    }) as RuntimeCommand;

describe("UpdateBodiesBatchHandler – health clamping", () => {
    it("clamps health to maxHealth when heal would exceed the cap", () => {
        // Given
        const entity = makeBodyEntity("e1", 90, 100);
        const handler = new UpdateBodiesBatchHandler();
        const ctx = makeContext([entity]);

        // When: healing sets health to 120 (above maxHealth)
        handler.handle(makeCommand([{ entityId: "e1", health: 120 }]), ctx);

        // Then
        expect(entity.body.health).toBe(100);
    });

    it("leaves health unchanged when it is within maxHealth", () => {
        // Given
        const entity = makeBodyEntity("e1", 50, 100);
        const handler = new UpdateBodiesBatchHandler();
        const ctx = makeContext([entity]);

        // When
        handler.handle(makeCommand([{ entityId: "e1", health: 80 }]), ctx);

        // Then
        expect(entity.body.health).toBe(80);
    });

    it("applies maxHealth before clamping health in the same update", () => {
        // Given: entity with current maxHealth 100
        const entity = makeBodyEntity("e1", 50, 100);
        const handler = new UpdateBodiesBatchHandler();
        const ctx = makeContext([entity]);

        // When: maxHealth raised to 150 and health set to 130 in same command
        handler.handle(
            makeCommand([{ entityId: "e1", maxHealth: 150, health: 130 }]),
            ctx,
        );

        // Then: health is capped to the NEW maxHealth (150), not the old one
        expect(entity.body.health).toBe(130);
        expect(entity.body.maxHealth).toBe(150);
    });

    it("clamps health when both maxHealth and health are supplied and health exceeds new max", () => {
        // Given
        const entity = makeBodyEntity("e1", 50, 100);
        const handler = new UpdateBodiesBatchHandler();
        const ctx = makeContext([entity]);

        // When: maxHealth drops to 80 and health is set to 90
        handler.handle(
            makeCommand([{ entityId: "e1", maxHealth: 80, health: 90 }]),
            ctx,
        );

        // Then
        expect(entity.body.maxHealth).toBe(80);
        expect(entity.body.health).toBe(80);
    });

    it("logs an error and skips when entity is not found", () => {
        // Given
        const logged: string[] = [];
        const ctx = {
            ...makeContext([]),
            telemetry: { log: (_: string, msg: string) => logged.push(msg) },
        };
        const handler = new UpdateBodiesBatchHandler();

        // When
        handler.handle(makeCommand([{ entityId: "missing", health: 50 }]), ctx);

        // Then
        expect(logged).toHaveLength(1);
        expect(logged[0]).toContain("missing");
    });
});
