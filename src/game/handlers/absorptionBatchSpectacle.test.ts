import { describe, expect, it } from "vitest";
import { spawnYieldSpectacle } from "./absorptionBatchSpectacle";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";

describe("spawnYieldSpectacle", () => {
    it("registers totalAmount in target.ledger.incoming for the resource", () => {
        const context = makeHandlerContext();
        const source = { id: "proxy-1" } as any;
        const target = {
            id: "sys_world",
            state: {},
            physics: {
                x: 500,
                y: 300,
                mass: 1,
                radius: 30,
                drag: 0.1,
                isStatic: true,
            },
        } as any;
        context.world.add(source);
        context.world.add(target);

        spawnYieldSpectacle(context, source, target, "xp", 50, {} as any);

        expect(target.ledger?.incoming?.xp).toBeCloseTo(50);
    });

    it("accumulates ledger.incoming when called multiple times", () => {
        const context = makeHandlerContext();
        const source = { id: "proxy-1" } as any;
        const target = {
            id: "sys_world",
            state: {},
            physics: {
                x: 500,
                y: 300,
                mass: 1,
                radius: 30,
                drag: 0.1,
                isStatic: true,
            },
        } as any;
        context.world.add(source);
        context.world.add(target);

        spawnYieldSpectacle(context, source, target, "xp", 30, {} as any);
        spawnYieldSpectacle(context, source, target, "xp", 20, {} as any);

        expect(target.ledger?.incoming?.xp).toBeCloseTo(50);
    });

    it("registers ledger.incoming even when target has no pre-existing ledger", () => {
        const context = makeHandlerContext();
        const source = { id: "proxy-2" } as any;
        const target = { id: "cave", state: {} } as any;
        context.world.add(source);
        context.world.add(target);

        spawnYieldSpectacle(context, source, target, "xp", 12, {} as any);

        expect(target.ledger?.incoming?.xp).toBeCloseTo(12);
    });

    it("pending transfer payload totals match totalAmount", () => {
        const context = makeHandlerContext();
        const source = { id: "proxy-3" } as any;
        const target = {
            id: "sys_world",
            state: {},
            physics: {
                x: 0,
                y: 0,
                mass: 1,
                radius: 30,
                drag: 0.1,
                isStatic: true,
            },
        } as any;
        context.world.add(source);
        context.world.add(target);

        spawnYieldSpectacle(context, source, target, "xp", 50, {} as any);

        const pendingTransfers = context.world.entities.filter((e) =>
            (e as any).tags?.includes("pending_transfer"),
        );
        const totalXpInFlight = pendingTransfers.reduce((acc, e) => {
            return acc + ((e as any).transfer?.payload?.xp ?? 0);
        }, 0);

        expect(totalXpInFlight).toBeCloseTo(50);

        // Regression: ledger.incoming.xp must equal the total in-flight amount
        expect(target.ledger?.incoming?.xp).toBeCloseTo(totalXpInFlight);
    });

    it("caps spectacle transfer fan-out at twelve nodes", () => {
        const context = makeHandlerContext();
        const source = { id: "proxy-4" } as any;
        const target = {
            id: "sys_world",
            state: {},
            physics: {
                x: 0,
                y: 0,
                mass: 1,
                radius: 30,
                drag: 0.1,
                isStatic: true,
            },
        } as any;
        context.world.add(source);
        context.world.add(target);

        spawnYieldSpectacle(context, source, target, "xp", 50, {} as any);

        expect(
            context.world.entities.filter((e) =>
                (e as any).tags?.includes("pending_transfer"),
            ),
        ).toHaveLength(12);
    });
});

