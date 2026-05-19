import type { BodyCardData } from "../body/bodyCardTypes";
import type { SelectionCardModel } from "./cardDisplayTypes";
import { resolveBodyCardSections } from "./resolveBodyCardSections";

export const resolveBodyCardModel = (
    data: BodyCardData | null,
): SelectionCardModel | null => {
    if (!data?.subjectId) return null;
    return {
        id: `body:${data.subjectId}`,
        entityId: data.subjectId,
        badges: data.isPermanent
            ? [
                  {
                      id: `${data.subjectId}:permanent`,
                      skin: "modifier",
                      value: { text: "Permanent" },
                      effects: [],
                  },
              ]
            : undefined,
        title: {
            id: `${data.subjectId}:title`,
            text: data.showIdentityTitle ? data.displayName : "",
            avatar: {
                subjectId: data.subjectId,
                fallbackIconId: data.fallbackIconId,
                size: "lg",
            },
        },
        description: data.description
            ? { id: `${data.subjectId}:description`, text: data.description }
            : undefined,
        conditionalNoticeEntityId: data.subjectId,
        sections: resolveBodyCardSections(data),
    };
};
