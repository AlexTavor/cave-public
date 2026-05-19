import { z } from "zod";
import { DEFAULT_IMPULSE_CONFIG, ImpulseConfigSchema } from "../physics";
import { DEFAULT_GAME_CONFIG, GameConfigSchema } from "../game/config";
import { TraitDefinitionSchema } from "../game/traits";
import { ConditionsSchema } from "../conditions";
import { GuidancesSchema } from "../guidances";
import { KnowledgeSchema } from "../knowledge";
import { TutorialsSchema } from "../tutorials";
import { BodySettingsSchema, HabitusDefinitionSchema } from "../game/habiti";
import {
    CarrierSettingsSchema,
    DEFAULT_CARRIER_SETTINGS,
} from "../game/carrier";
import { DEFAULT_POINTER_ENTITY, DEFAULT_WORLD_ENTITY } from "./systemDefaults";

export const SysConfigSchema = z.object({
    impulse: ImpulseConfigSchema.default(DEFAULT_IMPULSE_CONFIG),
    game_config: GameConfigSchema.default(DEFAULT_GAME_CONFIG),
    world: z.record(z.string(), z.unknown()).default(DEFAULT_WORLD_ENTITY),
    pointer: z.record(z.string(), z.unknown()).default(DEFAULT_POINTER_ENTITY),
    traits: z.record(z.string(), TraitDefinitionSchema).default({}),
    habiti: z.record(z.string(), HabitusDefinitionSchema).default({}),
    conditions: ConditionsSchema.default([]),
    guidances: GuidancesSchema.default([]),
    tutorials: TutorialsSchema.default([]),
    knowledge: KnowledgeSchema.default([]),
    body: BodySettingsSchema.default(BodySettingsSchema.parse({})),
    carrier: CarrierSettingsSchema.default(DEFAULT_CARRIER_SETTINGS),
});

export type SysConfig = z.infer<typeof SysConfigSchema>;

