import React, { useCallback, useMemo } from "react";
import { useBlueprintContext } from "../../BlueprintContext";
import { useSessionStore } from "../../../../state/useSessionStore";
import { FieldContainer, Label, Select } from "../../../fields/Shared.styles";
import {
    Checkbox,
    CursorLabel,
} from "../../../fields/boolean-field/BooleanField.styles";
import { getByPath, setByPath } from "../../../../../../utils/objectUtils";
import { SmartTooltip } from "../../../../../lib/atoms/tooltip";
import { useBlueprintReferenceCatalog } from "../../hooks/useBlueprintReferenceCatalog";

export const CycleLifecycleSection: React.FC = () => {
    const { filename, blueprintId } = useBlueprintContext();
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const { options } = useBlueprintReferenceCatalog();
    const transformTo = useSessionStore(
        useCallback(
            (state) => {
                const target =
                    state.sessions[filename]?.draft.blueprints?.[blueprintId];
                return (
                    (getByPath(
                        target,
                        "_editor.abilities.cycle.transformTo",
                    ) as string | undefined) ?? ""
                );
            },
            [filename, blueprintId],
        ),
    );
    const keepProgress = useSessionStore(
        useCallback(
            (state) =>
                !!getByPath(
                    state.sessions[filename]?.draft.blueprints?.[blueprintId],
                    "_editor.abilities.cycle.keepProgress",
                ),
            [filename, blueprintId],
        ),
    );

    const blueprintOptions = useMemo(
        () => options.filter((blueprint) => blueprint.id !== blueprintId),
        [blueprintId, options],
    );

    const showUnknown =
        !!transformTo && !blueprintOptions.some((bp) => bp.id === transformTo);

    const handleTransformChange = (value: string) => {
        updateDraft(filename, (draft) => {
            const target = draft.blueprints[blueprintId];
            if (!target?._editor?.abilities?.cycle) return;
            setByPath(
                target,
                "_editor.abilities.cycle.transformTo",
                value || undefined,
            );
        });
    };

    const handleKeepProgressChange = (checked: boolean) => {
        updateDraft(filename, (draft) => {
            const target = draft.blueprints[blueprintId];
            if (!target?._editor?.abilities?.cycle) return;
            setByPath(target, "_editor.abilities.cycle.keepProgress", checked);
        });
    };

    return (
        <>
            <FieldContainer>
                <SmartTooltip content="If set, the entity transforms into this Blueprint ID upon cycle completion.">
                    <Label>Lifecycle Transition</Label>
                </SmartTooltip>
                <Select
                    value={transformTo}
                    onChange={(e) => handleTransformChange(e.target.value)}
                >
                    <option value="">None</option>
                    {showUnknown ? (
                        <option value={transformTo}>
                            Unknown ({transformTo})
                        </option>
                    ) : null}
                    {blueprintOptions.map((bp) => (
                        <option key={bp.id} value={bp.id}>
                            {bp.label}
                        </option>
                    ))}
                </Select>
            </FieldContainer>
            <FieldContainer>
                <SmartTooltip content="If true, attempts to map current progress % to the new blueprint.">
                    <CursorLabel>
                        Keep Progress
                        <Checkbox
                            type="checkbox"
                            checked={keepProgress}
                            onChange={(e) =>
                                handleKeepProgressChange(e.target.checked)
                            }
                        />
                    </CursorLabel>
                </SmartTooltip>
            </FieldContainer>
        </>
    );
};

