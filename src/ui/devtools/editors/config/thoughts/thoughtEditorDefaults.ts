import { ThoughtDefinitionSchema } from "../../../../../data/schemas/thoughts";

export const createDefaultThought = (id: string) =>
    ThoughtDefinitionSchema.parse({
        id,
        body: "",
        rememberScope: "run",
        conditions: [],
    });
