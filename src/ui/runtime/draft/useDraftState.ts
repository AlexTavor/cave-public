import { useCallback, useMemo } from "react";
import type { DraftComponent } from "../../../engine/runtime/components/DraftComponent";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { useWorldInteraction } from "../world/context/WorldInteractionContext";
import { useEntitySelector } from "../world/selection/useEntitySelector";
import { useRuntimeStore } from "../state/useRuntimeStore";

const getDraftKey = (draft: DraftComponent | null): string => {
    if (!draft) return "none";
    const optionIds = draft.options.map((option) => option.id).join("|");
    return `${draft.active}:${draft.selectedOptionId ?? ""}:${draft.sourceLabel}:${draft.cycleNumber}:${draft.currentText}:${optionIds}`;
};

export const useDraftState = () => {
    const { runtime } = useWorldInteraction();
    const play = useRuntimeStore((s) => s.play);

    const draft = useEntitySelector(
        runtime,
        "sys_world",
        (entity) => (entity as { draft?: DraftComponent | null }).draft ?? null,
        (a, b) => getDraftKey(a ?? null) === getDraftKey(b ?? null),
    );

    const selectOption = useCallback(
        (optionId: string) => {
            if (!runtime) return;
            runtime.commands.enqueue({
                type: RuntimeCommandType.RESOLVE_DRAFT,
                payload: { selectedOptionId: optionId },
            });
            play();
        },
        [runtime, play],
    );

    return useMemo(
        () => ({ draft: draft ?? null, selectOption }),
        [draft, selectOption],
    );
};

