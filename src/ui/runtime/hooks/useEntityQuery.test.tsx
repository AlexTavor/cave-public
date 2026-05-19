// @vitest-environment jsdom
import { render, screen, cleanup, act } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { createRuntimeTestDouble } from "../world/testUtils";
import { World } from "miniplex";
import { useEntityQuery } from "./useEntityQuery";
import {
    Harness,
    expectCount,
    type TestEntity,
} from "./useEntityQuery.testUtils";

afterEach(() => {
    cleanup();
    useRuntimeStore.setState({ runtime: null } as never);
});

describe("useEntityQuery", () => {
    it("returns empty array for empty world", () => {
        const world = new World<TestEntity>();
        render(<Harness world={world} />);
        expect(screen.getByTestId("count").textContent).toBe("0");
    });

    it("updates array when entity matches query", async () => {
        const world = new World<TestEntity>();
        render(<Harness world={world} />);
        act(() => {
            world.add({
                id: "entity-1",
                display: { label: "Whale", icon: "whale" },
            });
        });
        await expectCount("1");
    });

    it("updates array when entity is removed", async () => {
        const world = new World<TestEntity>();
        const entity = {
            id: "entity-1",
            display: { label: "Ghost", icon: "ghost" },
        };

        world.add(entity);
        render(<Harness world={world} />);
        await expectCount("1");
        act(() => {
            world.remove(entity);
        });
        await expectCount("0");
    });

    it("does not update when entity does not match query", async () => {
        const world = new World<TestEntity>();
        render(<Harness world={world} />);
        act(() => {
            world.add({ id: "entity-2" });
        });
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(screen.getByTestId("count").textContent).toBe("0");
    });

    it("updates when matching entity mutates in place after a shared tick", async () => {
        const world = new World<TestEntity>();
        const entity: TestEntity = { id: "entity-1" };
        const runtime = createRuntimeTestDouble({ getEntity: () => entity });

        world.add(entity);
        useRuntimeStore.setState({ runtime: runtime.runtime } as never);
        render(<Harness world={world} />);
        await expectCount("0");
        act(() => {
            entity.display = { label: "Now Visible", icon: "ghost" };
            runtime.emitMutation({
                changedEntityIds: ["entity-1"],
                entityListChanged: false,
                blueprintChanged: false,
            });
        });
        await expectCount("1");
    });

    it("does not rerender on frame-only invalidation", async () => {
        const world = new World<TestEntity>();
        let renders = 0;
        const runtime = createRuntimeTestDouble({ getEntity: () => null });
        const Probe = () => {
            renders += 1;
            useEntityQuery(world, "display");
            return <div data-testid="probe" />;
        };
        useRuntimeStore.setState({ runtime: runtime.runtime } as never);
        render(<Probe />);
        act(() => {
            runtime.emitFrame(1);
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(renders).toBe(1);
    });
});

