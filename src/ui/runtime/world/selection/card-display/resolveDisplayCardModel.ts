import type { DisplayCardData } from "../resolveDisplayCardData";
import type { SelectionCardModel } from "./cardDisplayTypes";

export const resolveDisplayCardModel = (
    data: DisplayCardData | null,
    entityId: string,
): SelectionCardModel | null => {
    if (!data) return null;
    return {
        id: `display:${entityId}`,
        entityId,
        title: { id: `${entityId}:title`, text: data.label },
        description: {
            id: `${entityId}:description`,
            text: data.description || data.subtitle,
        },
        conditionalNoticeEntityId: entityId,
        sections: [],
    };
};
