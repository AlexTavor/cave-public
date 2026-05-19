import { useEffect } from "react";
import { deleteByPath, setByPath } from "../../../../../utils/objectUtils";
import { useSessionStore } from "../../../state/useSessionStore";

const normalize = (targetOverride: any, fallbackTag: string) => {
    if (!targetOverride) return targetOverride;
    if (
        targetOverride.kind === "entity_tag" ||
        (!targetOverride.kind && targetOverride.tag)
    ) {
        return {
            kind: "entity_tag" as const,
            tag: targetOverride.tag || fallbackTag,
        };
    }
    return {
        kind: "entity_id" as const,
        entityId: targetOverride.entityId || "sys_world",
    };
};

export const useNormalizeTutorialGuidanceDraft = (
    filename: string,
    path: string,
    guidancePresentation: string | undefined,
    targetOverride: any,
    tags: string[],
) => {
    const updateDraft = useSessionStore((state) => state.updateDraft);

    useEffect(() => {
        if (guidancePresentation === "draft_guidance") {
            updateDraft(filename, (draft) => {
                deleteByPath(draft, `${path}.titleOverride`);
                deleteByPath(draft, `${path}.textOverride`);
                deleteByPath(draft, `${path}.targetOverride`);
            });
            return;
        }
        if (guidancePresentation !== "modal") {
            updateDraft(filename, (draft) =>
                deleteByPath(draft, `${path}.titleOverride`),
            );
        }
        if (!targetOverride) return;
        const next = normalize(targetOverride, tags[0] ?? "world");
        if (JSON.stringify(next) === JSON.stringify(targetOverride)) return;
        updateDraft(filename, (draft) =>
            setByPath(draft, `${path}.targetOverride`, next),
        );
    }, [
        filename,
        guidancePresentation,
        path,
        tags,
        targetOverride,
        updateDraft,
    ]);
};
