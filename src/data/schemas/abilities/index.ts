import { z } from "zod";
import { CycleAbilitySchema } from "./cycle";
import { StorageAbilitySchema } from "./storage";
import { ProductionAbilitySchema } from "./production";
import { InjectionAbilitySchema } from "./injection";
import { ConversionAbilitySchema } from "./conversion";
import { UpkeepAbilitySchema } from "./upkeep";
import { AssignmentAbilitySchema } from "./assignment";
import { SpawnerAbilitySchema } from "./spawner";
import { SamplerAbilitySchema } from "./sampler";
import { BodyAbilitySchema } from "./body";
import { PassportAbilitySchema } from "./passport";
import { WorldPresenceAbilitySchema } from "./worldPresence";
import { DraftAbilitySchema } from "./draft";
import { UpdaterAbilitySchema } from "./updater";
import { NotificationAbilitySchema } from "./notifications";
import { ConditionalActivationAbilitySchema } from "./conditionalActivation";
import { UnifiedBlueprintsAbilitySchema } from "./unifiedBlueprints";
import { TriggeredActionsAbilitySchema } from "./triggeredActions";

export const EditorAbilitiesSchema = z
    .object({
        cycle: CycleAbilitySchema.optional(),
        storage: z.array(StorageAbilitySchema).optional(),
        production: z.array(ProductionAbilitySchema).optional(),
        injection: z.array(InjectionAbilitySchema).optional(),
        conversion: z.array(ConversionAbilitySchema).optional(),
        upkeep: z.array(UpkeepAbilitySchema).optional(),
        assignment: AssignmentAbilitySchema.optional(),
        spawner: z.array(SpawnerAbilitySchema).optional(),
        sampler: z.array(SamplerAbilitySchema).optional(),
        body: BodyAbilitySchema.optional(),
        passport: PassportAbilitySchema.optional(),
        worldPresence: WorldPresenceAbilitySchema.optional(),
        draft: z.array(DraftAbilitySchema).optional(),
        updater: z.array(UpdaterAbilitySchema).optional(),
        triggeredActions: z.array(TriggeredActionsAbilitySchema).optional(),
        notifications: NotificationAbilitySchema.optional(),
        conditionalActivation: ConditionalActivationAbilitySchema.optional(),
        unifiedBlueprints: UnifiedBlueprintsAbilitySchema.optional(),
    })
    .default({});

export const EditorConfigSchema = z.object({
    abilities: EditorAbilitiesSchema.default({}),
});

export type EditorAbilities = NonNullable<
    z.input<typeof EditorAbilitiesSchema>
>;
export type EditorConfig = NonNullable<z.input<typeof EditorConfigSchema>>;

export { DraftAbilitySchema } from "./draft";
export type { DraftAbilityConfig } from "./draft";

