import { z } from "zod";

export const structuredConditionKindSchema = z.enum([
    "fact_threshold",
    "world_state_threshold",
    "entity_tag_present",
    "world_state_boolean",
    "user_interaction",
    "carriers_orbiting",
    "body_in_pointer",
    "bodies_assigned",
    "destructive_assignment_has_all_bodies",
]);

export type StructuredConditionKind = z.infer<
    typeof structuredConditionKindSchema
>;
