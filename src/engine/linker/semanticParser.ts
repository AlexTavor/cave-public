import { z } from "zod";
import { LinkerValidationError } from "./errors";
import { ConditionsSchema } from "../../data/schemas/conditions";
import { ImpulseConfigSchema } from "../../data/schemas/physics";
import { GameConfigSchema } from "../../data/schemas/game/config";
import { GuidancesSchema } from "../../data/schemas/guidances";
import { KnowledgeSchema } from "../../data/schemas/knowledge";
import { TutorialsSchema } from "../../data/schemas/tutorials";
import { CarrierSettingsSchema } from "../../data/schemas/game/carrier";
import {
    DraftOptionBlueprintSchema,
    DraftPoolBlueprintSchema,
} from "../../data/schemas/draft";
import { BlueprintV2Schema } from "./blueprintV2Schema";
import { normalizeBpInput } from "./normalizeBpInput";
import { SemanticArtSchema } from "./semanticArtSchema";
import type { SemanticFragment } from "./semanticParser.types";

type Parsed = SemanticFragment;

const schemas: Record<string, { kind: Parsed["kind"]; schema: z.ZodTypeAny }> =
    {
        ".cave": {
            kind: "cave",
            schema: z
                .object({
                    impulse: ImpulseConfigSchema.partial().optional(),
                    game_config: GameConfigSchema.partial().optional(),
                    conditions: ConditionsSchema.optional(),
                    guidances: GuidancesSchema.optional(),
                    tutorials: TutorialsSchema.optional(),
                    knowledge: KnowledgeSchema.optional(),
                    body: z.record(z.string(), z.unknown()).optional(),
                    carrier: CarrierSettingsSchema.optional(),
                    world: z.record(z.string(), z.unknown()).optional(),
                    swarm: z.record(z.string(), z.unknown()).optional(),
                    traits: z.record(z.string(), z.unknown()).optional(),
                    habiti: z.record(z.string(), z.unknown()).optional(),
                    understanding: z.record(z.string(), z.unknown()).optional(),
                })
                .strict(),
        },
        ".draft": {
            kind: "draft",
            schema: z
                .object({
                    draftOptions: z
                        .record(z.string(), DraftOptionBlueprintSchema)
                        .optional(),
                    draftPools: z
                        .record(z.string(), DraftPoolBlueprintSchema)
                        .optional(),
                })
                .strict(),
        },
        ".art": {
            kind: "art",
            schema: SemanticArtSchema,
        },
        ".bp": { kind: "bp", schema: z.record(z.string(), BlueprintV2Schema) },
    };

export const parseSemanticFragment = (
    path: string,
    extension: string,
    input: unknown,
): Parsed => {
    const entry = schemas[extension];
    if (!entry)
        throw new LinkerValidationError(
            path,
            `Unsupported extension '${extension}'.`,
        );
    let normalizedInput = input;
    if (extension === ".bp") normalizedInput = normalizeBpInput(input);
    const parsed = entry.schema.safeParse(normalizedInput);
    if (!parsed.success)
        throw new LinkerValidationError(
            path,
            parsed.error.issues[0]?.message ?? "Invalid schema.",
        );
    return { kind: entry.kind, data: parsed.data } as Parsed;
};

export type { SemanticFragment } from "./semanticParser.types";

