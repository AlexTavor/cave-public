import React, { useMemo } from "react";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import { useSessionStore } from "../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { EditableTraitId } from "../traits/EditableTraitId";
import { BehaviorActionArrayField } from "../../blueprint/mode/forms/BehaviorActionArrayField";
import { ConditionReferenceList } from "../../conditions/ConditionReferenceList";
import { TutorialSelfDefinitionField } from "./TutorialSelfDefinitionField";
import { TutorialAddGuidanceButton } from "./TutorialEditorButtons";
import { TutorialGuidanceRow } from "./TutorialGuidanceRow";
import { resolveTutorialAutoSummary } from "./resolveTutorialAutoSummary";
import {
    EMPTY_GUIDANCE_DEFS,
    EMPTY_GUIDANCES,
    type TutorialGuidanceDraft,
} from "./tutorialFormConstants";

type Props = {
    filename: string;
    index: number;
    onRemove: () => void;
    onRename: (index: number, id: string) => string | null;
};

export const TutorialForm: React.FC<Props> = ({
    filename,
    index,
    onRemove,
    onRename,
}) => {
    const basePath = `config.settings.tutorials.${index}`;
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const tutorial = useSessionStore((state) =>
        getByPath(state.sessions[filename]?.draft, basePath),
    );
    const tutorialId = tutorial?.id ?? `tutorial-${index + 1}`;
    const guidances: TutorialGuidanceDraft[] =
        tutorial?.guidances ?? EMPTY_GUIDANCES;
    const guidanceDefs =
        useSessionStore((state) =>
            getByPath(
                state.sessions[filename]?.draft,
                "config.settings.guidances",
            ),
        ) ?? EMPTY_GUIDANCE_DEFS;
    const guidanceIds = useMemo(
        () =>
            guidanceDefs.map(
                (item: (typeof EMPTY_GUIDANCE_DEFS)[number]) => item.id,
            ),
        [guidanceDefs],
    );
    const addGuidance = () =>
        updateDraft(filename, (draft) =>
            setByPath(draft, `${basePath}.guidances`, [
                ...guidances,
                { guidanceId: "" },
            ]),
        );
    const removeGuidance = (guidanceIndex: number) =>
        updateDraft(filename, (draft) =>
            setByPath(
                draft,
                `${basePath}.guidances`,
                guidances.filter(
                    (_: unknown, currentIndex: number) =>
                        currentIndex !== guidanceIndex,
                ),
            ),
        );
    const autoSummary = useMemo(
        () => resolveTutorialAutoSummary(guidanceDefs, guidances),
        [guidanceDefs, guidances],
    );

    return (
        <ComponentRow
            title={
                <EditableTraitId
                    traitId={tutorialId}
                    onRename={(next) => onRename(index, next)}
                />
            }
            titleTooltip={`Double-click to rename this tutorial. Current id: ${tutorialId}`}
            icon={<span>T</span>}
            summary={`${guidances.length} guidance(s)`}
            onDelete={onRemove}
            deleteLabel="Remove tutorial"
        >
            <TutorialSelfDefinitionField
                filename={filename}
                basePath={basePath}
                kind={tutorial?.selfDefinition?.kind ?? "auto"}
                autoSummary={autoSummary}
            />
            <ConditionReferenceList
                filename={filename}
                path={`${basePath}.enterConditionIds`}
                label="Enter Conditions"
            />
            {guidances.map((_: unknown, guidanceIndex: number) => (
                <TutorialGuidanceRow
                    key={`${basePath}.guidances.${guidanceIndex}`}
                    filename={filename}
                    path={`${basePath}.guidances.${guidanceIndex}`}
                    guidanceIds={guidanceIds}
                    onRemove={() => removeGuidance(guidanceIndex)}
                />
            ))}
            <TutorialAddGuidanceButton onClick={addGuidance} />
            <ConditionReferenceList
                filename={filename}
                path={`${basePath}.exitConditionIds`}
                label="Exit Conditions"
            />
            <BehaviorActionArrayField
                filename={filename}
                path={`${basePath}.onComplete`}
                label="On Complete"
                tooltip="Runs only on valid completion, not on invalid auto-completion."
            />
        </ComponentRow>
    );
};
