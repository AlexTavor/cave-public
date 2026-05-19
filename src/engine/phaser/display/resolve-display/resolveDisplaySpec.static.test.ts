import { describe, expect, it } from "vitest";
import {
    composeDisplaySpec,
    resolveDisplaySpec,
    resolveDisplayStaticSpec,
} from "./resolveDisplaySpec";

const params = {
    entity: {
        id: "e1",
        tags: [],
        state: {},
        display: { display_key: "node", label: "Node" },
    } as any,
    blueprint: {
        id: "bp1",
        components: { display: { display_key: "node", label: "Node" } },
    } as any,
    styles: {},
    displays: { node: { type: "body" }, unknown: { type: "body" } } as any,
    blueprints: {},
};

describe("resolveDisplaySpec static split", () => {
    it("resolves the static display metadata without physics fields", () => {
        expect(resolveDisplayStaticSpec(params)).toMatchObject({
            entityId: "e1",
            label: "Node",
            display_key: "body_avatar",
        });
    });

    it("composes the no-physics and live-physics variants from the static spec", () => {
        const staticSpec = resolveDisplayStaticSpec(params);
        if (!staticSpec) throw new Error("expected static spec");
        expect(
            composeDisplaySpec(staticSpec, params.entity, null),
        ).toMatchObject({
            hasPhysics: false,
            x: 0,
            y: 0,
            radius: 0,
        });
        expect(
            composeDisplaySpec(staticSpec, params.entity, {
                x: 4,
                y: 5,
                radius: 6,
            }),
        ).toMatchObject({ hasPhysics: true, x: 4, y: 5 });
    });

    it("keeps the wrapper behavior aligned with the split helpers", () => {
        const staticSpec = resolveDisplayStaticSpec(params);
        if (!staticSpec) throw new Error("expected static spec");
        expect(
            resolveDisplaySpec({
                ...params,
                physics: { x: 4, y: 5, radius: 6 },
            }),
        ).toEqual(
            composeDisplaySpec(staticSpec, params.entity, {
                x: 4,
                y: 5,
                radius: 6,
            }),
        );
    });
});
