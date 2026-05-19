import { z } from "zod";
import { EffectSchema, Op } from "./primitives";
import { BehaviorComponentSchema } from "./behavior";
export {
    DisplayComponentSchema,
    StatusLabelSchema,
} from "./components/display";
export {
    TraitsComponentSchema,
    TraitInstanceSchema,
} from "./components/traits";
export type { TraitInstance, TraitsComponent } from "./components/traits";
export { FactsComponentSchema } from "./components/facts";
export type { FactsComponent } from "./components/facts";
export { StateComponentSchema } from "./components/state";
export type { StateComponent } from "./components/state";
export { ParentComponentSchema } from "./components/parent";
export type { ParentComponent } from "./components/parent";
export { PowerSinkComponentSchema } from "./components/powerSink";
export type { PowerSinkComponent } from "./components/powerSink";
export {
    DEFAULT_NOTIFICATION_ABILITY_GUIDANCE_COMPONENT,
    NotificationAbilityGuidanceComponentSchema,
} from "./components/notificationAbilityGuidance";
export type {
    NotificationAbilityGuidanceComponent,
    NotificationAbilityGuidanceItem,
} from "./components/notificationAbilityGuidance";
export {
    DEFAULT_THOUGHT_COMPONENT,
    ThoughtComponentSchema,
} from "./components/thought";
export type { ThoughtComponent } from "./components/thought";
export {
    DEFAULT_HABITI_ANNOUNCEMENT_COMPONENT,
    HabitiAnnouncementComponentSchema,
} from "./components/habitiAnnouncement";
export type { HabitiAnnouncementComponent } from "./components/habitiAnnouncement";

export const TransferComponentSchema = z.object({
    sourceId: z.string(),
    targetId: z.string(),
    payload: z.record(z.string(), z.number()),
    status: z.enum(["pending", "returning"]).default("pending"),
});

export { BehaviorComponentSchema } from "./behavior";
export { BodyComponentSchema } from "./game/body";
export { CaveComponentSchema } from "./game/cave";
export { AssignmentComponentSchema } from "./assignment";

export const NarrativeComponentSchema = z.object({
    title: z.string(),
    body: z.string().describe("ui:textarea"),
    priority: z.enum(["toast", "modal", "interrupt"]).default("toast"),
    choices: z
        .array(
            z.object({
                label: z.string(),
                effects: z.array(EffectSchema),
            }),
        )
        .optional(),
});

export const AutomationComponentSchema = z.object({
    type: z.literal("interval"),
    command: z.string(),
    intervalMs: z.number().min(1),
    remainingMs: z.number().min(0),
    repeats: z.number().int(),
    label: z.string().optional(),
});

export const PassiveEffectSchema = z.object({
    op: z.enum(Op),
    target: z.string().describe("ui:autocomplete:passive-effect-target"),
    source: z.string().optional(),
    value: z.number().optional(),
});

export const PassiveEffectsComponentSchema = z
    .array(PassiveEffectSchema)
    .default([]);

export const BuffComponentSchema = z.object({
    buffs: z.array(
        z.object({
            targetTag: z.string(),
            effects: z.array(PassiveEffectSchema),
        }),
    ),
});

export type AutomationComponent = z.infer<typeof AutomationComponentSchema>;
export type BehaviorComponent = z.infer<typeof BehaviorComponentSchema>;
export type { AssignmentComponent } from "./assignment";
export type { BodyComponent } from "./game/body";
export type { CaveComponent } from "./game/cave";
export type PassiveEffect = z.infer<typeof PassiveEffectSchema>;
export type BuffComponent = z.infer<typeof BuffComponentSchema>;

