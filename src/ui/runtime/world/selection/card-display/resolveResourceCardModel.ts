import type { ResourceCardData } from "../resolveResourceCardData";
import { adaptAbilityBarsToCapsules } from "./adaptAbilityBarsToCapsules";
import type { SelectionCardModel } from "./cardDisplayTypes";

export const resolveResourceCardModel = (
    entityId: string,
    data: ResourceCardData | null,
): SelectionCardModel | null => {
    if (!data) return null;
    return {
        id: `resource:${entityId}`,
        entityId,
        conditionalNoticeEntityId: entityId,
        title: { id: entityId, text: data.label },
        description: data.description
            ? { id: `${entityId}:description`, text: data.description }
            : undefined,
        emptyText: "No visible storage.",
        sections: data.storageModels.length
            ? [
                  {
                      id: `${entityId}:storage`,
                      layout: "column",
                      density: "normal",
                      capsules: adaptAbilityBarsToCapsules(data.storageModels),
                  },
              ]
            : [],
    };
};
