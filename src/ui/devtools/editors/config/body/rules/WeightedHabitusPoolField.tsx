import React, { useId, useState } from "react";
import type { WeightedHabitusPoolEntry } from "../../../../../../data/schemas/game/habiti";
import { SmartTooltip } from "../../../../../lib/atoms/tooltip";
import { getByPath, setByPath } from "../../../../../../utils/objectUtils";
import { FieldContainer, Input, Label } from "../../../fields/Shared.styles";
import { useSessionStore } from "../../../../state/useSessionStore";

type Props = {
    label: string;
    filename: string;
    path: string;
    suggestions: string[];
    tooltip?: string;
    onCommitEntries?: (entries: WeightedHabitusPoolEntry[]) => WeightedHabitusPoolEntry[];
};

export const WeightedHabitusPoolField: React.FC<Props> = ({
    label,
    filename,
    path,
    suggestions,
    tooltip,
    onCommitEntries,
}) => {
    const entries = useSessionStore((state) => {
        const current = getByPath(state.sessions[filename]?.draft, path);
        return Array.isArray(current) ? (current as WeightedHabitusPoolEntry[]) : [];
    });
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const [candidateId, setCandidateId] = useState("");
    const listId = useId();
    const needle = candidateId.trim().toLowerCase();
    const filteredSuggestions = needle
        ? suggestions.filter((item) => item.toLowerCase().includes(needle))
        : suggestions;
    const commitEntries = (nextEntries: WeightedHabitusPoolEntry[]) =>
        updateDraft(filename, (draft) =>
            setByPath(draft, path, onCommitEntries?.(nextEntries) ?? nextEntries),
        );
    const trimmedCandidateId = candidateId.trim();
    const canAdd =
        suggestions.includes(trimmedCandidateId) &&
        !entries.some((entry) => entry.habitusId === trimmedCandidateId);
    return (
        <FieldContainer>
            {tooltip ? <SmartTooltip content={tooltip}><Label>{label}</Label></SmartTooltip> : <Label>{label}</Label>}
            {entries.map((entry, index) => (
                <div key={entry.habitusId}>
                    <span>{entry.habitusId}</span>
                    <Input
                        aria-label={`${entry.habitusId} weight`}
                        type="number"
                        value={String(entry.weight)}
                        onChange={(event) => {
                            const weight = Number(event.target.value);
                            if (!Number.isFinite(weight) || weight <= 0) return;
                            commitEntries(
                                entries.map((current, currentIndex) =>
                                    currentIndex === index ? { ...current, weight } : current,
                                ),
                            );
                        }}
                    />
                    <button
                        type="button"
                        aria-label={`Remove ${entry.habitusId}`}
                        onClick={() =>
                            commitEntries(entries.filter((_, currentIndex) => currentIndex !== index))
                        }
                    >
                        Remove
                    </button>
                </div>
            ))}
            <Input
                aria-label={label}
                value={candidateId}
                list={listId}
                onChange={(event) => setCandidateId(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key !== "Enter" || !canAdd) return;
                    event.preventDefault();
                    commitEntries([...entries, { habitusId: trimmedCandidateId, weight: 1 }]);
                    setCandidateId("");
                }}
            />
            <button
                type="button"
                disabled={!canAdd}
                onClick={() => {
                    if (!canAdd) return;
                    commitEntries([...entries, { habitusId: trimmedCandidateId, weight: 1 }]);
                    setCandidateId("");
                }}
            >
                Add
            </button>
            <datalist id={listId}>
                {filteredSuggestions.map((item) => (
                    <option key={item} value={item} />
                ))}
            </datalist>
        </FieldContainer>
    );
};
