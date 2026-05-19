import { describe, expect, it } from "vitest";
import type { ModuleCartridge } from "../../../data/schemas/module";
import type { Blueprint } from "../../../data/schemas/blueprint";
import {
    createBlueprintInModule,
    deleteBlueprintFromModule,
    duplicateBlueprintInModule,
    getBlueprintBaseLabel,
    saveBlueprintToModule,
    saveModuleMetadataToModule,
} from "./moduleStore.blueprints";
import {
    createBlueprint,
    createCartridge,
} from "../../../engine/test/factories";

const makeModule = (blueprints: Record<string, Blueprint>): ModuleCartridge =>
    createCartridge("m", {
        metadata: { id: "m", name: "M", version: "0.0.1" },
        blueprints,
    });

describe("ui/devtools/state/moduleStore.blueprints", () => {
    it("getBlueprintBaseLabel prefers top-level label, then display.label, then fallback", () => {
        expect(getBlueprintBaseLabel({ label: "  Alpha  " }, "x")).toBe(
            "  Alpha  ",
        );
        expect(
            getBlueprintBaseLabel(
                { components: { display: { label: "Beta" } } },
                "x",
            ),
        ).toBe("Beta");
        expect(getBlueprintBaseLabel({ something: true }, "x")).toBe("x");
    });

    it("createBlueprintInModule assigns a unique label and display label", () => {
        const mod = makeModule({
            entity_a: createBlueprint("entity_a", {
                label: "New Entity",
                components: {
                    display: { label: "New Entity", display_key: "unknown" },
                },
            }),
        });

        const { updated, blueprintId } = createBlueprintInModule({
            moduleData: mod,
            newId: "entity_b",
            baseLabel: "New Entity",
            icon: "unknown",
        });

        expect(blueprintId).toBe("entity_b");
        expect(updated).not.toBe(mod);
        expect(updated.blueprints["entity_b"].label).toBe("New Entity (Copy)");
        expect(updated.blueprints["entity_b"].components.display?.label).toBe(
            "New Entity (Copy)",
        );
        // Original is not mutated
        expect(mod.blueprints["entity_a"].label).toBe("New Entity");
    });

    it("duplicateBlueprintInModule clones and bumps label to next available", () => {
        const mod = makeModule({
            entity_a: createBlueprint("entity_a", {
                label: "Goblin",
                components: {
                    display: { label: "Goblin", display_key: "unknown" },
                },
            }),
            entity_b: createBlueprint("entity_b", {
                label: "Goblin (Copy)",
                components: {
                    display: { label: "Goblin (Copy)", display_key: "unknown" },
                },
            }),
        });

        const { updated, blueprintId } = duplicateBlueprintInModule({
            moduleData: mod,
            sourceId: "entity_a",
            newId: "entity_c",
            cloner: (v) => globalThis.structuredClone(v),
        });

        expect(blueprintId).toBe("entity_c");
        expect(updated.blueprints["entity_c"].id).toBe("entity_c");
        expect(updated.blueprints["entity_c"].label).toBe("Goblin (Copy 2)");
        expect(updated.blueprints["entity_c"].components.display?.label).toBe(
            "Goblin (Copy 2)",
        );

        // Source not mutated
        expect(mod.blueprints["entity_a"].id).toBe("entity_a");
        expect(mod.blueprints["entity_a"].label).toBe("Goblin");
    });

    it("deleteBlueprintFromModule removes blueprint when present and is a no-op when absent", () => {
        const mod = makeModule({
            entity_a: createBlueprint("entity_a", {
                label: "A",
                components: { display: { label: "A", display_key: "unknown" } },
            }),
        });

        const noOp = deleteBlueprintFromModule({
            moduleData: mod,
            blueprintId: "missing",
        });
        expect(noOp).toBe(mod);

        const removed = deleteBlueprintFromModule({
            moduleData: mod,
            blueprintId: "entity_a",
        });
        expect(removed).not.toBe(mod);
        expect(removed.blueprints["entity_a"]).toBeUndefined();
    });

    it("saveBlueprintToModule upserts a blueprint", () => {
        const mod = makeModule({
            entity_a: createBlueprint("entity_a", {
                label: "A",
                components: { display: { label: "A", display_key: "unknown" } },
            }),
        });

        const updated = saveBlueprintToModule({
            moduleData: mod,
            blueprintId: "entity_a",
            blueprint: {
                id: "entity_a",
                label: "A2",
                tags: [],
                components: {
                    display: { label: "A2", display_key: "unknown" },
                },
            },
        });

        expect(updated.blueprints["entity_a"].label).toBe("A2");
    });

    it("saveModuleMetadataToModule updates metadata", () => {
        const mod = makeModule({});

        const updated = saveModuleMetadataToModule({
            moduleData: mod,
            metadata: { ...mod.metadata, name: "New" },
        });

        expect(updated.metadata.name).toBe("New");
        expect(updated.blueprints).toBe(mod.blueprints);
    });
});
