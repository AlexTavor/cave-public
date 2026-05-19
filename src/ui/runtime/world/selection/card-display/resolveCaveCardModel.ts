import type { CaveCardData } from "../cave/caveCardTypes";
import type { SelectionCardModel } from "./cardDisplayTypes";
import { resolveCaveCardSections } from "./resolveCaveCardSections";

const CAVE_DESCRIPTION = [
    "This is me. Cave.",
    "I don't know what I am.",
    "",
    "My bodies eat and get warm, and that makes me happy.",
].join("\n");

export const resolveCaveCardModel = (
    data: CaveCardData | null,
): SelectionCardModel | null => {
    if (!data) return null;
    return {
        id: `cave:${data.targetId}`,
        entityId: data.targetId,
        title: { id: `${data.targetId}:title`, text: data.label },
        description: {
            id: `${data.targetId}:description`,
            text: CAVE_DESCRIPTION,
        },
        conditionalNoticeEntityId: data.targetId,
        sections: resolveCaveCardSections(data),
    };
};
