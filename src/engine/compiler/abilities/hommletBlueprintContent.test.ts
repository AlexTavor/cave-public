import { describe, expect, it } from "vitest";
import snapshot from "../../../../public/bootstrap/vfs-prod.json";

const files = structuredClone(snapshot as unknown as Record<string, unknown>);
const source = (path: string) => {
    const file = structuredClone(files[path]) as any;
    if (!file?.blueprints) return file;
    const blueprintId = file.metadata?.id ?? Object.keys(file.blueprints)[0];
    return file.blueprints[blueprintId];
};

describe("Hommlet blueprint content", () => {
    it("keeps buy coin chest progress and storage pull priorities in bootstrap data", () => {
        const lodging = source("example/modules/lodging_hommlet.bp");
        const buyCoinChest = source("example/modules/buycoinchest.bp");
        const coinChest = source("example/modules/coinchest.bp");
        const sellWood = source("example/modules/sell_wood.bp");
        const storage = lodging._editor.abilities.storage as Array<any>;
        const buyCoinChestCost =
            buyCoinChest._editor.abilities.cycle.resourceCosts[0];

        expect(lodging._editor.abilities.cycle.showProgressBar).toBe(true);
        expect(buyCoinChest._editor.abilities.cycle.showProgressBar).toBe(
            false,
        );
        expect(buyCoinChest._editor.abilities.cycle.showThrottleSlider).toBe(
            false,
        );
        expect(buyCoinChestCost).toMatchObject({
            resource: "coin",
            visible: true,
            barPosition: "top_right",
            barPaletteColorKey: "gold",
        });
        expect(
            coinChest._editor.abilities.storage[0]?.autoRequest,
        ).toMatchObject({
            enabled: false,
            cadence_s: 1,
            minRequest: 1,
            maxRequest: 100,
        });
        expect(
            storage.find((entry) => entry.resource === "food")?.priority,
        ).toBe(10);
        expect(
            storage.find((entry) => entry.resource === "heat")?.priority,
        ).toBe(10);
        expect(
            sellWood._editor.abilities.conversion[0]?.outputs[0]?.target,
        ).toBe("tag:storage:coin");
    });
});
