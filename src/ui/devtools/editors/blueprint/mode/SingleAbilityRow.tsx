import React from "react";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import type { AbilityKey } from "./useDesignerAbilities";
import { abilityLabels } from "./abilityListUtils";
import { CycleAbilityForm } from "./forms/CycleAbilityForm";
import { InjectionAbilityForm } from "./forms/InjectionAbilityForm";
import { AssignmentAbilityForm } from "./forms/AssignmentAbilityForm";
import { BodyAbilityForm } from "./forms/BodyAbilityForm";
import { PassportAbilityForm } from "./forms/PassportAbilityForm";
import { WorldPresenceAbilityForm } from "./forms/WorldPresenceAbilityForm";

export type SingleAbilityKey =
    | "cycle"
    | "injection"
    | "assignment"
    | "body"
    | "passport"
    | "worldPresence";

export const SINGLE_ABILITY_KEYS: SingleAbilityKey[] = [
    "cycle",
    "injection",
    "assignment",
    "body",
    "passport",
    "worldPresence",
];

const abilityIcons: Record<SingleAbilityKey, string> = {
    cycle: "♻️",
    injection: "✨",
    assignment: "🏷️",
    body: "💪",
    passport: "🪪",
    worldPresence: "🌍",
};

const abilitySummaries: Record<SingleAbilityKey, string> = {
    cycle: "Cycle ability",
    injection: "Injection ability",
    assignment: "Assignment ability",
    body: "Biology & attributes",
    passport: "Identity & appearance",
    worldPresence: "Spatial positioning",
};

interface SingleAbilityRowProps {
    ability: SingleAbilityKey;
    rootPath: string;
    onRemove: (ability: AbilityKey) => void;
}

const renderAbilityForm = (key: SingleAbilityKey, rootPath: string) => {
    switch (key) {
        case "cycle":
            return <CycleAbilityForm rootPath={rootPath} />;
        case "injection":
            return (
                <InjectionAbilityForm
                    basePath={`${rootPath}._editor.abilities.injection`}
                />
            );
        case "assignment":
            return (
                <AssignmentAbilityForm
                    basePath={`${rootPath}._editor.abilities.assignment`}
                />
            );
        case "body":
            return <BodyAbilityForm rootPath={rootPath} />;
        case "passport":
            return <PassportAbilityForm rootPath={rootPath} />;
        case "worldPresence":
            return <WorldPresenceAbilityForm rootPath={rootPath} />;
    }
};

export const SingleAbilityRow: React.FC<SingleAbilityRowProps> = ({
    ability,
    rootPath,
    onRemove,
}) => {
    return (
        <ComponentRow
            title={abilityLabels[ability]}
            icon={<span>{abilityIcons[ability]}</span>}
            summary={abilitySummaries[ability]}
            defaultOpen
            onDelete={() => onRemove(ability)}
            deleteLabel="Remove"
        >
            {renderAbilityForm(ability, rootPath)}
        </ComponentRow>
    );
};

