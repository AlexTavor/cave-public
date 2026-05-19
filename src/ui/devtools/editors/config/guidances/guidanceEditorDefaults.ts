import { GuidanceDefinitionSchema } from "../../../../../data/schemas/guidances";

export const createDefaultGuidance = (id: string) =>
    GuidanceDefinitionSchema.parse({
        id,
        presentation: "modal",
        attention: [],
        title: id,
        text: "Describe this guidance.",
        imageUrl: null,
    });
