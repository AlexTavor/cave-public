import { ConditionDefinitionSchema } from "../../../../../data/schemas/conditions";

export const createDefaultConditionDefinition = (id: string) =>
    ConditionDefinitionSchema.parse({
        id,
        label: "New Condition",
        conditions: [],
    });
