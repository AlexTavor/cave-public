import { z } from "zod";
export {
    FactScopeSchema as thoughtScopeSchema,
    FactTypeSchema as thoughtFactTypeSchema,
    StructuredConditionOperatorSchema as thoughtOperatorSchema,
} from "../../../../../data/schemas/conditions";

export const THOUGHTS_PATH = "config.settings.thoughts";
export const thoughtKindSchema = z.enum([
    "fact_threshold",
    "world_state_threshold",
]);
export const thoughtStringSchema = z.string();
export const thoughtNumberSchema = z.number();
