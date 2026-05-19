import { TutorialDefinitionSchema } from "../../../../../data/schemas/tutorials";

export const createDefaultTutorial = (id: string) =>
    TutorialDefinitionSchema.parse({
        id,
        selfDefinition: { kind: "auto" },
        enterConditionIds: [],
        guidances: [],
        onComplete: [],
        exitConditionIds: [],
    });
