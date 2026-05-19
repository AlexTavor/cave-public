import { z } from "zod";
import {
    AssignmentComponentSchema,
    AutomationComponentSchema,
    BehaviorComponentSchema,
    BodyComponentSchema,
    BuffComponentSchema,
    CaveComponentSchema,
    PassiveEffectsComponentSchema,
    PowerSinkComponentSchema,
} from "../../data/schemas/components";
import { PhysicsComponentV2Schema } from "../../data/schemas/v2/physics";
import { RenderComponentSchema } from "../../data/schemas/v2/render";
import { SpatialComponentSchema } from "../../data/schemas/v2/spatial";

export const BlueprintV2Schema = z
    .object({
        id: z.string().optional(),
        label: z.string().optional(),
        tags: z.array(z.string()).optional(),
        components: z.record(z.string(), z.unknown()).optional(),
        _editor: z.record(z.string(), z.unknown()).optional(),
        spatial: SpatialComponentSchema.optional(),
        render: RenderComponentSchema.optional(),
        physics: PhysicsComponentV2Schema.optional(),
        state: z.record(z.string(), z.unknown()).optional(),
        assignment: AssignmentComponentSchema.optional(),
        behavior: BehaviorComponentSchema.optional(),
        automation: AutomationComponentSchema.optional(),
        body: BodyComponentSchema.optional(),
        cave: CaveComponentSchema.optional(),
        powerSink: PowerSinkComponentSchema.optional(),
        passiveEffects: PassiveEffectsComponentSchema.optional(),
        buffs: BuffComponentSchema.optional(),
    })
    .strict();

export type BlueprintV2Entry = z.infer<typeof BlueprintV2Schema>;

