import { describe, it, expect } from "vitest";
import type { EditorAbilities } from "../../../data/schemas/abilities";
import type { ConversionAbilityConfig } from "../../../data/schemas/abilities/conversion";
import type { ProductionAbilityConfig } from "../../../data/schemas/abilities/production";
import type { SamplerAbilityConfig } from "../../../data/schemas/abilities/sampler";
import type { SpawnerAbilityConfig } from "../../../data/schemas/abilities/spawner";
import type { StorageAbilityConfig } from "../../../data/schemas/abilities/storage";
import type { UpkeepAbilityConfig } from "../../../data/schemas/abilities/upkeep";
import type { ValidationIssue } from "./collisionDetector.types";
import { getMalformedAbilityIssues } from "./collisionDetector.malformed";

const scalar = { base: 0, perBody: 0, multPerBody: 0 } as const;

const makeStorage = (resource: string): StorageAbilityConfig => ({
    resource,
    initialValue: 0,
    capacity: { base: 0, perBody: 0, multPerBody: 0 },
    isDefault: true,
    entropy: { base: 0, perBody: 0, multPerBody: 0 },
    visible: true,
    allowDeposit: true,
    allowWithdraw: true,
    priority: 0,
});

const makeProduction = (resource: string): ProductionAbilityConfig => ({
    resource,
    amount: { base: 0, perBody: 0, multPerBody: 0 },
    conditions: [],
});

const makeUpkeep = (resource: string): UpkeepAbilityConfig => ({
    resource,
    rate: { base: 0, perBody: 0, multPerBody: 0 },
    failureTrait: "is_starving",
    autoRequest: true,
});

const makeConversion = (
    inputs: ConversionAbilityConfig["inputs"],
    outputs: ConversionAbilityConfig["outputs"],
): ConversionAbilityConfig => ({
    id: "conv",
    inputs,
    outputs,
    resetCycle: true,
    conditions: [],
});

const makeSpawner = (blueprintId: string): SpawnerAbilityConfig => ({
    id: "spawn",
    blueprintId,
    count: { base: 1, perBody: 0, multPerBody: 0 },
    mode: "spawn_body",
    target: "sys_world",
    forcedHabiti: [],
    triggers: ["cycle_complete"],
    conditions: [],
});

const makeSampler = (source: string): SamplerAbilityConfig => ({
    id: "sample",
    source,
    target: "sampled_value",
    visible: true,
    max: 100,
    triggers: ["cycle_complete"],
});

const makeAbilities = (
    overrides: Partial<EditorAbilities>,
): EditorAbilities => ({
    ...overrides,
});

describe("getMalformedAbilityIssues", () => {
    it("returns an empty array for fully-empty abilities (every collector short-circuits)", () => {
        expect(getMalformedAbilityIssues({})).toEqual([]);
    });

    it("returns an empty array when abilities is undefined (optional-chaining guards)", () => {
        expect(getMalformedAbilityIssues(undefined)).toEqual([]);
    });

    it("emits the full storage/production/upkeep issues for blank, whitespace, and newline resources", () => {
        const abilities = makeAbilities({
            storage: [makeStorage(""), makeStorage("wood")],
            production: [makeProduction(" ")],
            upkeep: [makeUpkeep("\n")],
        });

        // Deep-equal pins id, severity, ability, and the exact message string
        // for each collector. The valid "wood" storage at index 1 must NOT appear.
        expect(getMalformedAbilityIssues(abilities)).toEqual<ValidationIssue[]>([
            {
                id: "storage_invalid_0",
                severity: "error",
                ability: "storage",
                message: "Storage entry missing resource will be removed on save.",
            },
            {
                id: "production_invalid_0",
                severity: "error",
                ability: "production",
                message:
                    "Production entry missing resource will be removed on save.",
            },
            {
                id: "upkeep_invalid_0",
                severity: "error",
                ability: "upkeep",
                message: "Upkeep entry missing resource will be removed on save.",
            },
        ]);
    });

    it("uses the entry index in the issue id, not a constant", () => {
        const abilities = makeAbilities({
            storage: [makeStorage("ok"), makeStorage(""), makeStorage("")],
        });

        // First entry valid -> first invalid is index 1, second is index 2.
        expect(getMalformedAbilityIssues(abilities)).toEqual<ValidationIssue[]>([
            {
                id: "storage_invalid_1",
                severity: "error",
                ability: "storage",
                message: "Storage entry missing resource will be removed on save.",
            },
            {
                id: "storage_invalid_2",
                severity: "error",
                ability: "storage",
                message: "Storage entry missing resource will be removed on save.",
            },
        ]);
    });

    it("flags a conversion when only an INPUT resource is missing", () => {
        const abilities = makeAbilities({
            conversion: [
                makeConversion(
                    [{ resource: "", amount: scalar }],
                    [{ resource: "metal", amount: scalar }],
                ),
            ],
        });

        expect(getMalformedAbilityIssues(abilities)).toEqual<ValidationIssue[]>([
            {
                id: "conversion_invalid_0",
                severity: "error",
                ability: "conversion",
                message:
                    "Conversion entries with missing resources will be removed on save.",
            },
        ]);
    });

    it("flags a conversion when only an OUTPUT resource is missing", () => {
        const abilities = makeAbilities({
            conversion: [
                makeConversion(
                    [{ resource: "ore", amount: scalar }],
                    [{ resource: "  ", amount: scalar }],
                ),
            ],
        });

        expect(getMalformedAbilityIssues(abilities)).toEqual<ValidationIssue[]>([
            {
                id: "conversion_invalid_0",
                severity: "error",
                ability: "conversion",
                message:
                    "Conversion entries with missing resources will be removed on save.",
            },
        ]);
    });

    it("does NOT flag a conversion whose inputs and outputs are all valid", () => {
        const abilities = makeAbilities({
            conversion: [
                makeConversion(
                    [{ resource: "ore", amount: scalar }],
                    [{ resource: "metal", amount: scalar }],
                ),
            ],
        });

        expect(getMalformedAbilityIssues(abilities)).toEqual([]);
    });

    it("treats non-array conversion inputs/outputs as empty (no false positive)", () => {
        // Array.isArray(...) guards: a missing inputs/outputs key must coerce to []
        // and therefore produce NO invalid-resource issue.
        const abilities = {
            conversion: [
                { id: "conv", resetCycle: true, conditions: [] },
            ],
        } as unknown as EditorAbilities;

        expect(getMalformedAbilityIssues(abilities)).toEqual([]);
    });

    it("uses the conversion entry index in the issue id", () => {
        const abilities = makeAbilities({
            conversion: [
                makeConversion(
                    [{ resource: "ore", amount: scalar }],
                    [{ resource: "metal", amount: scalar }],
                ),
                makeConversion(
                    [{ resource: "", amount: scalar }],
                    [{ resource: "metal", amount: scalar }],
                ),
            ],
        });

        expect(getMalformedAbilityIssues(abilities)).toEqual<ValidationIssue[]>([
            {
                id: "conversion_invalid_1",
                severity: "error",
                ability: "conversion",
                message:
                    "Conversion entries with missing resources will be removed on save.",
            },
        ]);
    });

    it("flags a spawner whose blueprintId is blank and reports it under the spawner ability", () => {
        const abilities = makeAbilities({
            spawner: [makeSpawner(""), makeSpawner("real_bp")],
        });

        // Only the blank entry (index 0) is flagged; the real blueprintId is silent.
        expect(getMalformedAbilityIssues(abilities)).toEqual<ValidationIssue[]>([
            {
                id: "spawner_invalid_0",
                severity: "error",
                ability: "spawner",
                message:
                    "Spawner entry missing blueprintId will be removed on save.",
            },
        ]);
    });

    it("flags a spawner whose blueprintId is undefined (optional-chaining on entry.blueprintId)", () => {
        const abilities = {
            spawner: [{ id: "spawn" }],
        } as unknown as EditorAbilities;

        expect(getMalformedAbilityIssues(abilities)).toEqual<ValidationIssue[]>([
            {
                id: "spawner_invalid_0",
                severity: "error",
                ability: "spawner",
                message:
                    "Spawner entry missing blueprintId will be removed on save.",
            },
        ]);
    });

    it("flags a sampler whose source is blank and reports it under the sampler ability", () => {
        const abilities = makeAbilities({
            sampler: [makeSampler("real.source"), makeSampler(" ")],
        });

        // Index 1 is the blank source; index 0 (valid source) is silent.
        expect(getMalformedAbilityIssues(abilities)).toEqual<ValidationIssue[]>([
            {
                id: "sampler_invalid_1",
                severity: "error",
                ability: "sampler",
                message: "Sampler entry missing source will be removed on save.",
            },
        ]);
    });

    it("flags a sampler whose source is undefined (optional-chaining on entry.source)", () => {
        const abilities = {
            sampler: [{ id: "sample" }],
        } as unknown as EditorAbilities;

        expect(getMalformedAbilityIssues(abilities)).toEqual<ValidationIssue[]>([
            {
                id: "sampler_invalid_0",
                severity: "error",
                ability: "sampler",
                message: "Sampler entry missing source will be removed on save.",
            },
        ]);
    });

    it("aggregates every collector in source order when all abilities are malformed", () => {
        const abilities = makeAbilities({
            storage: [makeStorage("")],
            production: [makeProduction("")],
            upkeep: [makeUpkeep("")],
            conversion: [
                makeConversion([{ resource: "", amount: scalar }], []),
            ],
            spawner: [makeSpawner("")],
            sampler: [makeSampler("")],
        });

        // Locks the concatenation order of getMalformedAbilityIssues' return array:
        // storage, production, upkeep, conversion, spawner, sampler.
        expect(getMalformedAbilityIssues(abilities)).toEqual<ValidationIssue[]>([
            {
                id: "storage_invalid_0",
                severity: "error",
                ability: "storage",
                message: "Storage entry missing resource will be removed on save.",
            },
            {
                id: "production_invalid_0",
                severity: "error",
                ability: "production",
                message:
                    "Production entry missing resource will be removed on save.",
            },
            {
                id: "upkeep_invalid_0",
                severity: "error",
                ability: "upkeep",
                message: "Upkeep entry missing resource will be removed on save.",
            },
            {
                id: "conversion_invalid_0",
                severity: "error",
                ability: "conversion",
                message:
                    "Conversion entries with missing resources will be removed on save.",
            },
            {
                id: "spawner_invalid_0",
                severity: "error",
                ability: "spawner",
                message:
                    "Spawner entry missing blueprintId will be removed on save.",
            },
            {
                id: "sampler_invalid_0",
                severity: "error",
                ability: "sampler",
                message: "Sampler entry missing source will be removed on save.",
            },
        ]);
    });

    it("returns empty when storage/production/upkeep/conversion are all valid", () => {
        const abilities = makeAbilities({
            storage: [makeStorage("wood")],
            production: [makeProduction("food")],
            upkeep: [makeUpkeep("heat")],
            conversion: [
                makeConversion(
                    [{ resource: "ore", amount: scalar }],
                    [{ resource: "metal", amount: scalar }],
                ),
            ],
            spawner: [makeSpawner("real_bp")],
            sampler: [makeSampler("real.source")],
        });

        expect(getMalformedAbilityIssues(abilities)).toEqual([]);
    });
});

