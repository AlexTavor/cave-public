import { useState } from "react";
import { useSessionStore } from "../../../../state/useSessionStore";
import { useModuleStore } from "../../../../state/moduleStore";
import type { Blueprint } from "../../../../../../data/schemas/blueprint";
import { useBlueprintContext } from "../../BlueprintContext";

type BlueprintDraft = Omit<Blueprint, "label" | "tags"> & {
    label?: string;
    tags?: string[];
};

export const useIdentityModal = () => {
    const { filename, blueprintId, scopeId } = useBlueprintContext();

    const draft = useSessionStore(
        (s) => s.sessions[filename]?.draft.blueprints?.[blueprintId],
    );
    const isOpen = useSessionStore(
        (s) => s.sessions[filename]?.ui?.[scopeId]?.isIdentityOpen ?? false,
    );

    const updateDraft = useSessionStore((s) => s.updateDraft);
    const updateSessionUi = useSessionStore((s) => s.updateSessionUi);
    const validateUniqueLabel = useModuleStore((s) => s.validateUniqueLabel);

    const [tagDraft, setTagDraft] = useState("");

    const close = () => {
        updateSessionUi(filename, scopeId, (ui) => {
            ui.isIdentityOpen = false;
        });
        setTagDraft("");
    };

    const updateLabel = (val: string) => {
        updateDraft(filename, (moduleDraft) => {
            const blueprint = moduleDraft.blueprints[blueprintId];
            if (!blueprint) return;
            blueprint.label = val;
        });
    };

    const addTag = () => {
        const val = tagDraft.trim();
        if (!val) return;
        if (draft?.tags?.includes(val)) return;

        updateDraft(filename, (moduleDraft) => {
            const blueprint = moduleDraft.blueprints[blueprintId];
            if (!blueprint) return;
            const tags = blueprint.tags ?? [];
            if (!tags.includes(val)) tags.push(val);
            blueprint.tags = tags;
        });

        setTagDraft("");
    };

    const removeTag = (tag: string) => {
        updateDraft(filename, (moduleDraft) => {
            const blueprint = moduleDraft.blueprints[blueprintId];
            if (!blueprint) return;
            const tags = blueprint.tags ?? [];
            const next = tags.filter((t: string) => t !== tag);
            blueprint.tags = next;
        });
    };

    const validationError = (() => {
        const candidate = (draft?.label ?? "").toString().trim();
        if (!candidate) return null;
        if (!filename || !blueprintId) return null;

        const unique = validateUniqueLabel({
            filename,
            label: candidate,
            currentId: blueprintId,
        });

        if (unique.ok) return null;
        return `Label already used by ${unique.existingId}`;
    })();

    return {
        isOpen,
        draft: draft as BlueprintDraft | undefined,
        blueprintId,
        tagDraft,
        setTagDraft,
        validationError,
        close,
        updateLabel,
        addTag,
        removeTag,
    };
};
