import React, { useMemo } from "react";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import { AutocompleteStringField } from "../../fields/string-field/AutocompleteStringField";
import { StringField } from "../../fields/string-field/StringField";
import { Button } from "../../../../lib/atoms/button";
import { EnumField } from "../../fields/enum-field/EnumField";
import { ConditionReferenceList } from "../../conditions/ConditionReferenceList";
import { useSessionStore } from "../../../state/useSessionStore";
import {
    deleteByPath,
    getByPath,
    setByPath,
} from "../../../../../utils/objectUtils";
import { useStructuredConditionTagSuggestions } from "../../conditions/structuredConditionAutocomplete";
import { z } from "zod";
import { tutorialTargetKindSchema } from "../tutorials/tutorialFieldSchemas";

const schema = z.string(),
    EMPTY_GUIDANCE_DEFS: { id: string }[] = [];

export const KnowledgeRow: React.FC<{
    filename: string;
    index: number;
    item: { id?: string; label?: string };
    onDelete: () => void;
}> = ({ filename, index, item, onDelete }) => {
    const tags = useStructuredConditionTagSuggestions(filename);
    const rawGuidanceDefs = useSessionStore(
        (state) =>
            getByPath(
                state.sessions[filename]?.draft,
                "config.settings.guidances",
            ) as { id: string }[] | undefined,
    );
    const targetOverride = useSessionStore((state) =>
        getByPath(
            state.sessions[filename]?.draft,
            `config.settings.knowledge.${index}.targetOverride`,
        ),
    );
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const guidanceDefs = rawGuidanceDefs ?? EMPTY_GUIDANCE_DEFS;
    const guidanceIds = useMemo(
        () => guidanceDefs.map((entry) => entry.id),
        [guidanceDefs],
    );
    const setOverrideEnabled = (enabled: boolean) =>
        updateDraft(filename, (draft) => {
            const path = `config.settings.knowledge.${index}.targetOverride`;
            if (!enabled) return deleteByPath(draft, path);
            setByPath(draft, path, {
                kind: "entity_id",
                entityId: "sys_world",
            });
        });

    return (
        <ComponentRow
            title={item.id ?? `codex_${index + 1}`}
            icon={<span>K</span>}
            summary={item.label || "Empty"}
            onDelete={onDelete}
        >
            <StringField
                label="ID"
                schema={schema}
                filename={filename}
                path={`config.settings.knowledge.${index}.id`}
            />
            <StringField
                label="Label"
                schema={schema}
                filename={filename}
                path={`config.settings.knowledge.${index}.label`}
            />
            <AutocompleteStringField
                label="Guidance ID"
                schema={schema}
                filename={filename}
                path={`config.settings.knowledge.${index}.guidanceId`}
                suggestions={guidanceIds}
            />
            <StringField
                label="Description"
                schema={schema}
                filename={filename}
                path={`config.settings.knowledge.${index}.description`}
            />
            <StringField
                label="Text Override"
                schema={schema}
                filename={filename}
                path={`config.settings.knowledge.${index}.textOverride`}
            />
            <Button
                size="sm"
                variant="ghost"
                onClick={() => setOverrideEnabled(!targetOverride)}
            >
                {targetOverride
                    ? "Disable Target Override"
                    : "Enable Target Override"}
            </Button>
            {targetOverride ? (
                <>
                    <EnumField
                        label="Target Override Kind"
                        schema={tutorialTargetKindSchema}
                        filename={filename}
                        path={`config.settings.knowledge.${index}.targetOverride.kind`}
                    />
                    {targetOverride.kind === "entity_tag" ? (
                        <AutocompleteStringField
                            label="Target Override Tag"
                            schema={schema}
                            filename={filename}
                            path={`config.settings.knowledge.${index}.targetOverride.tag`}
                            suggestions={tags}
                        />
                    ) : (
                        <StringField
                            label="Target Override ID"
                            schema={schema}
                            filename={filename}
                            path={`config.settings.knowledge.${index}.targetOverride.entityId`}
                        />
                    )}
                </>
            ) : null}
            <ConditionReferenceList
                filename={filename}
                path={`config.settings.knowledge.${index}.unlockConditionIds`}
                label="Unlock Conditions"
            />
        </ComponentRow>
    );
};
