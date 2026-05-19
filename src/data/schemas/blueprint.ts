import { z } from "zod";
import {
    DisplayComponentSchema,
    StateComponentSchema,
    AssignmentComponentSchema,
    NarrativeComponentSchema,
    BehaviorComponentSchema,
    BodyComponentSchema,
    CaveComponentSchema,
    PowerSinkComponentSchema,
    PassiveEffectsComponentSchema,
    BuffComponentSchema,
    TraitsComponentSchema,
    FactsComponentSchema,
    ThoughtComponentSchema,
    HabitiAnnouncementComponentSchema,
    ParentComponentSchema,
} from "./components";
import { PhysicsComponentSchema } from "./physics";
import { EditorConfigSchema } from "./abilities";
import { SpatialComponentSchema } from "./v2/spatial";

export const BlueprintSchema = z.object({
    id: z.string(),
    label: z.string().default(""),
    tags: z.array(z.string()).default([]),

    components: z.object({
        display: DisplayComponentSchema.optional(),
        state: StateComponentSchema.optional(),
        assignment: AssignmentComponentSchema.optional(),
        behavior: BehaviorComponentSchema.optional(),
        narrative: NarrativeComponentSchema.optional(),
        physics: PhysicsComponentSchema.optional(),
        body: BodyComponentSchema.optional(),
        cave: CaveComponentSchema.optional(),
        powerSink: PowerSinkComponentSchema.optional(),
        passiveEffects: PassiveEffectsComponentSchema.optional(),
        buffs: BuffComponentSchema.optional(),
        spatial: SpatialComponentSchema.optional(),
        traits: TraitsComponentSchema.optional(),
        run: FactsComponentSchema.optional(),
        permanent: FactsComponentSchema.optional(),
        thought: ThoughtComponentSchema.optional(),
        habitiAnnouncement: HabitiAnnouncementComponentSchema.optional(),
        parent: ParentComponentSchema.optional(),
    }),

    _editor: EditorConfigSchema.optional(),
});

export type Blueprint = z.infer<typeof BlueprintSchema>;

