import { useMemo } from "react";
import { Button } from "../../../../lib/atoms/button";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { ConditionReferenceRow } from "../../conditions/ConditionReferenceRow";
import { useSessionStore } from "../../../state/useSessionStore";
import { useModuleStore } from "../../../state/moduleStore";

const EMPTY_ITEMS: string[] = [];
type DraftConditionReferenceListProps = { filename: string; path: string };

const collectConditionIds = (modules: unknown[]) =>
    [
        ...new Set(
            modules.flatMap((module) => {
                const defs = getByPath(module, "config.settings.conditions");
                return Array.isArray(defs)
                    ? defs.flatMap((entry) =>
                          typeof entry?.id === "string" ? [entry.id] : [],
                      )
                    : [];
            }),
        ),
    ].sort((left, right) => left.localeCompare(right));

export const DraftConditionReferenceList = ({
    filename,
    path,
}: DraftConditionReferenceListProps) => {
    const rawItems = useSessionStore(
        (state) =>
            getByPath(state.sessions[filename]?.draft, path) as
                | string[]
                | undefined,
    );
    const sessions = useSessionStore((state) => state.sessions);
    const modules = useModuleStore((state) => state.modules);
    const items = rawItems ?? EMPTY_ITEMS;
    const suggestions = useMemo(
        () =>
            collectConditionIds([
                ...Object.values(sessions).map((session) => session.draft),
                ...Object.values(modules),
            ]),
        [modules, sessions],
    );
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const update = (next: string[]) =>
        updateDraft(filename, (draft) => setByPath(draft, path, next));
    return (
        <div>
            <SmartTooltip content="Draft options are available only when all referenced conditions pass.">
                <p style={{ opacity: 0.6, fontSize: 13, cursor: "help" }}>
                    Availability Conditions
                </p>
            </SmartTooltip>
            {items.map((_, index) => (
                <ConditionReferenceRow
                    key={`${path}.${index}`}
                    filename={filename}
                    path={`${path}.${index}`}
                    suggestions={suggestions}
                    onRemove={() =>
                        update(items.filter((__, i) => i !== index))
                    }
                />
            ))}
            <SmartTooltip content="Add another condition reference.">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => update([...items, ""])}
                >
                    + Add Condition Ref
                </Button>
            </SmartTooltip>
        </div>
    );
};
