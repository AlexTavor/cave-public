import { z } from "zod";
import { DEFAULT_IMPULSE_CONFIG, ImpulseConfigSchema } from "./physics";
import { DEFAULT_GAME_CONFIG, GameConfigSchema } from "./game/config";
import { TraitDefinitionSchema } from "./game/traits";
import { ConditionsSchema } from "./conditions";
import { GuidancesSchema } from "./guidances";
import { KnowledgeSchema } from "./knowledge";
import { TutorialsSchema } from "./tutorials";
import { BodySettingsSchema, HabitusDefinitionSchema } from "./game/habiti";
import { UnderstandingDefinitionSchema } from "./game/understanding";
import {
    CarrierSettingsSchema,
    DEFAULT_CARRIER_SETTINGS,
} from "./game/carrier";

export const SortDirectionSchema = z.enum(["ASC", "DESC"]);

export const ContentionRuleSchema = z.object({
    resource: z.string(),
    sortBy: z.string(),
    direction: SortDirectionSchema.default("DESC"),
});

export const BlueprintSettingsSchema = z
    .object({
        impulse: ImpulseConfigSchema.default(DEFAULT_IMPULSE_CONFIG),
        game_config: GameConfigSchema.default(DEFAULT_GAME_CONFIG),
        conditions: ConditionsSchema.optional(),
        guidances: GuidancesSchema.optional(),
        tutorials: TutorialsSchema.optional(),
        knowledge: KnowledgeSchema.optional(),
        contention: z.array(ContentionRuleSchema).optional(),
        body: BodySettingsSchema.optional(),
        carrier: CarrierSettingsSchema.optional(),
        world: z.record(z.string(), z.unknown()).optional(),
    })
    .default({
        impulse: DEFAULT_IMPULSE_CONFIG,
        game_config: DEFAULT_GAME_CONFIG,
        contention: [],
    })
    .describe("ui:collapsed");

export const BlueprintConfigSchema = z
    .object({
        traits: z
            .record(z.string(), TraitDefinitionSchema)
            .default({})
            .describe("ui:collapsed"),
        habiti: z.record(z.string(), HabitusDefinitionSchema).default({}),
        understanding: z
            .record(z.string(), UnderstandingDefinitionSchema)
            .default({}),
        settings: BlueprintSettingsSchema,
    })
    .default({
        traits: {},
        habiti: {},
        understanding: {},
        settings: {
            impulse: DEFAULT_IMPULSE_CONFIG,
            game_config: DEFAULT_GAME_CONFIG,
            contention: [],
            body: BodySettingsSchema.parse({}),
            carrier: DEFAULT_CARRIER_SETTINGS,
        },
    });

export const DEFAULT_BLUEPRINT_CONFIG = BlueprintConfigSchema.parse({});

export type BlueprintSettings = z.input<typeof BlueprintSettingsSchema>;
export type BlueprintConfig = z.input<typeof BlueprintConfigSchema>;
export type ContentionRule = z.infer<typeof ContentionRuleSchema>;

