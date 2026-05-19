import { describe, expect, it } from "vitest";
import { buildDisplayEdges } from "./veinsDisplayBuilder";
import { makeVeinConfig } from "./veinTestConfig";

describe("buildDisplayEdges nervous widths", () => {
    it("uses cave comfort for nervous width while keeping blob flow", () => {
        const edges = buildDisplayEdges(
            {
                nodes: new Map([
                    ["sys_world", { id: "sys_world", x: 0, y: 0, radius: 10 }],
                    ["face_body", { id: "face_body", x: 100, y: 0, radius: 8 }],
                ]),
                edges: [
                    {
                        sourceId: "sys_world",
                        targetId: "face_body",
                        kind: "nervous",
                        attribute: "nervous",
                        power: 1,
                        intensity: 0.5,
                        drawFraction: 0,
                        sourceRadius: 10,
                        deliveredRate: 20,
                        throttle01: 1,
                        comfort01: 0.25,
                    },
                ],
            } as never,
            makeVeinConfig({ thickness: { min_width: 2, max_width: 20 } }),
        );

        expect(edges[0]?.widthPx).toBe(5);
        expect(edges[0]?.blobSpawnRateHz).toBe(2);
    });

    it("keeps nervous veins visible and pulsing when delivery is idle", () => {
        const edges = buildDisplayEdges(
            {
                nodes: new Map([
                    ["sys_world", { id: "sys_world", x: 0, y: 0, radius: 10 }],
                    ["face_body", { id: "face_body", x: 100, y: 0, radius: 8 }],
                ]),
                edges: [
                    {
                        sourceId: "sys_world",
                        targetId: "face_body",
                        kind: "nervous",
                        attribute: "nervous",
                        power: 1,
                        intensity: 0.5,
                        drawFraction: 0,
                        sourceRadius: 10,
                        deliveredRate: 0,
                        throttle01: 1,
                        comfort01: 0,
                    },
                ],
            } as never,
            makeVeinConfig({ thickness: { min_width: 2, max_width: 20 } }),
        );

        expect(edges[0]?.widthPx).toBe(2);
        expect(edges[0]?.blobSpawnRateHz).toBe(0);
    });
});
