import { StructuredConditionSchema } from "../../../../data/schemas/conditions";

export const createDefaultStructuredCondition = (kind = "fact_threshold") => {
    if (kind === "world_state_threshold") {
        return StructuredConditionSchema.parse({
            kind,
            key: "food",
            operator: ">=",
            value: 1,
        });
    }
    if (kind === "entity_tag_present") {
        return StructuredConditionSchema.parse({
            kind,
            tag: "cave_exploration",
        });
    }
    if (kind === "world_state_boolean") {
        return StructuredConditionSchema.parse({
            kind,
            key: "cave_tut_throttle_seen",
            value: true,
        });
    }
    if (kind === "user_interaction") {
        return StructuredConditionSchema.parse({
            kind,
            interaction: "self_selected",
        });
    }
    if (kind === "carriers_orbiting") {
        return StructuredConditionSchema.parse({ kind });
    }
    if (kind === "body_in_pointer") {
        return StructuredConditionSchema.parse({ kind });
    }
    if (kind === "bodies_assigned") {
        return StructuredConditionSchema.parse({ kind });
    }
    if (kind === "destructive_assignment_has_all_bodies") {
        return StructuredConditionSchema.parse({ kind });
    }
    return StructuredConditionSchema.parse({
        kind,
        scope: "run",
        factType: "elapsed_real_seconds",
        factAbout: "world",
        operator: ">=",
        value: 1,
    });
};
