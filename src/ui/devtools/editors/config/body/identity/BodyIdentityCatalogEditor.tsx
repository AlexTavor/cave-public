import React from "react";
import { ComponentRow } from "../../../../../lib/atoms/component-row";
import { formatHabitusTypeLabel } from "../habitusTypes";
import { useBodyConfigSession } from "../useBodyConfigSession";

export const BodyIdentityCatalogEditor: React.FC<{ filename: string }> = ({
    filename,
}) => {
    const { taxonomyGroups } = useBodyConfigSession(filename);
    return (
        <ComponentRow
            title="Identity Taxonomy"
            titleTooltip="Open the registry-derived identity taxonomy used by body generation."
            defaultOpen
        >
            {taxonomyGroups.map((group) => (
                <div key={group.type}>
                    <strong>{formatHabitusTypeLabel(group.type)}</strong>
                    <div>{`${group.ids.length} entries`}</div>
                    <div>{group.ids.join(", ") || "None"}</div>
                </div>
            ))}
        </ComponentRow>
    );
};
