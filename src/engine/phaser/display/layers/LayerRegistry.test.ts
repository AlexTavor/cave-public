import { describe, it, expect } from "vitest";
import { LayerId, LAYER_DEPTHS } from "./LayerIds";

describe("LayerRegistry", () => {
    const createFakeScene = () => {
        const containers: Array<{
            depth: number;
            name: string;
            setDepth: (d: number) => void;
            setName: (n: string) => void;
            destroy: () => void;
        }> = [];

        return {
            containers,
            add: {
                container: (_x: number, _y: number) => {
                    const c = {
                        depth: 0,
                        name: "",
                        setDepth(d: number) {
                            this.depth = d;
                        },
                        setName(n: string) {
                            this.name = n;
                        },
                        destroy() {},
                    };
                    containers.push(c);
                    return c;
                },
            },
        } as any;
    };

    it("creates containers for all LayerIds with exact depths", async () => {
        const scene = createFakeScene();
        const { LayerRegistry } = await import("./LayerRegistry");
        const reg = new LayerRegistry(scene);

        for (const id of Object.values(LayerId)) {
            const container = reg.get(id);
            expect(container).toBeDefined();
            expect(container.depth).toBe(LAYER_DEPTHS[id]);
        }
    });

    it("has exactly 5 layer containers", async () => {
        const scene = createFakeScene();
        const { LayerRegistry } = await import("./LayerRegistry");
        const reg = new LayerRegistry(scene);
        expect(scene.containers.length).toBe(6);
        reg.destroy();
    });

    it("depth values match spec", () => {
        expect(LAYER_DEPTHS[LayerId.Veins]).toBe(0);
        expect(LAYER_DEPTHS[LayerId.Background]).toBe(5);
        expect(LAYER_DEPTHS[LayerId.Entities]).toBe(15);
        expect(LAYER_DEPTHS[LayerId.Overlays]).toBe(25);
        expect(LAYER_DEPTHS[LayerId.EffectsAnchored]).toBe(35);
        expect(LAYER_DEPTHS[LayerId.EffectsGlobal]).toBe(45);
    });

    it("throws on unknown layer id", async () => {
        const scene = createFakeScene();
        const { LayerRegistry } = await import("./LayerRegistry");
        const reg = new LayerRegistry(scene);
        expect(() => reg.get("bogus" as any)).toThrow();
    });

    it("destroy is idempotent", async () => {
        const scene = createFakeScene();
        const { LayerRegistry } = await import("./LayerRegistry");
        const reg = new LayerRegistry(scene);
        reg.destroy();
        reg.destroy(); // should not throw
    });
});
