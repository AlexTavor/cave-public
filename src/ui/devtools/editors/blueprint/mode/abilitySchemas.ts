import { CycleAbilitySchema } from "../../../../../data/schemas/abilities/cycle";
import { StorageAbilitySchema } from "../../../../../data/schemas/abilities/storage";
import { ProductionAbilitySchema } from "../../../../../data/schemas/abilities/production";
import { InjectionAbilitySchema } from "../../../../../data/schemas/abilities/injection";
import { ConversionAbilitySchema } from "../../../../../data/schemas/abilities/conversion";
import { UpkeepAbilitySchema } from "../../../../../data/schemas/abilities/upkeep";
import { AssignmentAbilitySchema } from "../../../../../data/schemas/abilities/assignment";
import { SpawnerAbilitySchema } from "../../../../../data/schemas/abilities/spawner";
import { SamplerAbilitySchema } from "../../../../../data/schemas/abilities/sampler";
import { BodyAbilitySchema } from "../../../../../data/schemas/abilities/body";
import { PassportAbilitySchema } from "../../../../../data/schemas/abilities/passport";
import { WorldPresenceAbilitySchema } from "../../../../../data/schemas/abilities/worldPresence";
import { DraftAbilitySchema } from "../../../../../data/schemas/abilities/draft";
import { UpdaterAbilitySchema } from "../../../../../data/schemas/abilities/updater";
import { NotificationAbilitySchema } from "../../../../../data/schemas/abilities/notifications";
import { ConditionalActivationAbilitySchema } from "../../../../../data/schemas/abilities/conditionalActivation";
import { UnifiedBlueprintsAbilitySchema } from "../../../../../data/schemas/abilities/unifiedBlueprints";
import { TriggeredActionsAbilitySchema } from "../../../../../data/schemas/abilities/triggeredActions";

export const abilitySchemas = {
    cycle: CycleAbilitySchema,
    storage: StorageAbilitySchema.array(),
    production: ProductionAbilitySchema.array(),
    injection: InjectionAbilitySchema.array(),
    conversion: ConversionAbilitySchema.array(),
    upkeep: UpkeepAbilitySchema.array(),
    assignment: AssignmentAbilitySchema,
    spawner: SpawnerAbilitySchema.array(),
    sampler: SamplerAbilitySchema.array(),
    body: BodyAbilitySchema,
    passport: PassportAbilitySchema,
    worldPresence: WorldPresenceAbilitySchema,
    draft: DraftAbilitySchema.array(),
    updater: UpdaterAbilitySchema.array(),
    triggeredActions: TriggeredActionsAbilitySchema.array(),
    notifications: NotificationAbilitySchema,
    conditionalActivation: ConditionalActivationAbilitySchema,
    unifiedBlueprints: UnifiedBlueprintsAbilitySchema,
};

export const arrayAbilities = new Set<keyof typeof abilitySchemas>([
    "storage",
    "production",
    "conversion",
    "upkeep",
    "spawner",
    "sampler",
    "draft",
    "updater",
    "triggeredActions",
    "conditionalActivation",
    "notifications",
    "unifiedBlueprints",
]);

