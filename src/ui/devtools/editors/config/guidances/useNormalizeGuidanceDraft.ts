import { useEffect } from "react";
import { setByPath } from "../../../../../utils/objectUtils";
import { useSessionStore } from "../../../state/useSessionStore";
import type { GuidanceDefinition } from "../../../../../data/schemas/guidances";

const NODE_SLOTS = new Set([
    "top",
    "top_right",
    "right",
    "bottom_right",
    "bottom",
    "bottom_left",
    "left",
    "top_left",
]);
const SCREEN_SLOTS = new Set([
    "top_left",
    "top_right",
    "bottom_left",
    "bottom_right",
    "center",
]);

const normalize = (guidance: GuidanceDefinition, fallbackTag: string) => {
    if (guidance.presentation === "node_callout") {
        const target =
            guidance.target?.kind === "entity_tag"
                ? {
                      kind: "entity_tag" as const,
                      tag: guidance.target.tag || fallbackTag,
                  }
                : {
                      kind: "entity_id" as const,
                      entityId: guidance.target?.entityId || "sys_world",
                  };
        return {
            id: guidance.id,
            presentation: guidance.presentation,
            attention: guidance.attention,
            imageUrl: guidance.imageUrl ?? null,
            text: guidance.text,
            target,
            slot: NODE_SLOTS.has(guidance.slot) ? guidance.slot : "top",
        };
    }
    if (guidance.presentation === "screen_callout") {
        return {
            id: guidance.id,
            presentation: guidance.presentation,
            attention: guidance.attention,
            imageUrl: guidance.imageUrl ?? null,
            text: guidance.text,
            screenSlot: SCREEN_SLOTS.has(guidance.screenSlot)
                ? guidance.screenSlot
                : "top_right",
        };
    }
    if (guidance.presentation === "modal") {
        return {
            id: guidance.id,
            presentation: guidance.presentation,
            attention: guidance.attention,
            imageUrl: guidance.imageUrl ?? null,
            title: guidance.title,
            text: guidance.text,
        };
    }
    return {
        id: guidance.id,
        presentation: guidance.presentation,
        attention: guidance.attention,
        targetOptionId: guidance.targetOptionId,
    };
};

export const useNormalizeGuidanceDraft = (
    filename: string,
    path: string,
    guidance: GuidanceDefinition | null | undefined,
    tags: string[],
) => {
    const updateDraft = useSessionStore((state) => state.updateDraft);

    useEffect(() => {
        if (!guidance) return;
        const next = normalize(guidance, tags[0] ?? "world");
        if (JSON.stringify(next) === JSON.stringify(guidance)) return;
        updateDraft(filename, (draft) => {
            setByPath(draft, path, next);
        });
    }, [filename, guidance, path, tags, updateDraft]);
};
