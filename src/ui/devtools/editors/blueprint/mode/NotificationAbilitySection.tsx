import React from "react";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import type { EditorAbilities } from "../../../../../data/schemas/abilities";
import { NotificationAbilityForm } from "./forms/NotificationAbilityForm";
import { buildNotificationKey } from "./abilityListUtils";

interface NotificationAbilitySectionProps {
    entries: NonNullable<EditorAbilities["notifications"]>;
    rootPath: string;
    onRemoveItem: (index: number) => void;
}

export const NotificationAbilitySection: React.FC<
    NotificationAbilitySectionProps
> = ({ entries, rootPath, onRemoveItem }) => (
    <>
        {entries.map((entry, index) => {
            const summary = entry.title?.trim() || entry.text.trim() || "Empty";
            return (
                <ComponentRow
                    key={buildNotificationKey(entry, index)}
                    title="Notification Ability"
                    icon={<span>🔔</span>}
                    summary={summary}
                    defaultOpen
                    onDelete={() => onRemoveItem(index)}
                    deleteLabel="Remove"
                >
                    <NotificationAbilityForm
                        basePath={`${rootPath}._editor.abilities.notifications.${index}`}
                    />
                </ComponentRow>
            );
        })}
    </>
);

