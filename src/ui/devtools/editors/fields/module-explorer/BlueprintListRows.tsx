import React from "react";
import { IconKey } from "../../../../lib/foundation/icon-registry/IconKey";
import { GameIcon } from "../../../../lib/atoms/game-icon";
import { Button } from "../../../../lib/atoms/button";
import { ListRow, ListPrimary, ListSecondary } from "./ModuleExplorer.styles";
import type { Blueprint } from "../../../../../data/schemas/blueprint";

interface BlueprintListRowsProps {
    blueprints: Array<readonly [string, Blueprint]>;
    onOpenSettings: () => void;
    onOpenBlueprint: (id: string) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
    onCreate: () => void;
}

export const BlueprintListRows: React.FC<BlueprintListRowsProps> = ({
    blueprints,
    onOpenSettings,
    onOpenBlueprint,
    onDuplicate,
    onDelete,
    onCreate,
}) => (
    <>
        <ListRow onClick={onOpenSettings}>
            <div style={{ width: 24, textAlign: "center" }}>⚙️</div>
            <div>
                <ListPrimary>Settings</ListPrimary>
                <ListSecondary>Module metadata</ListSecondary>
            </div>
            <div />
        </ListRow>

        {blueprints.length === 0 ? (
            <div style={{ padding: "4px 10px" }}>
                <ListSecondary>
                    No blueprints match the current filters.
                </ListSecondary>
            </div>
        ) : null}

        {blueprints.map(([id, bp]) => {
            const iconId =
                bp.components?.display?.display_key || IconKey.Unknown;
            const label = bp.label || bp.components?.display?.label || id;

            return (
                <ListRow key={id} onClick={() => onOpenBlueprint(id)}>
                    <GameIcon id={iconId} size="sm" />
                    <div>
                        <ListPrimary title={label}>{label}</ListPrimary>
                        <ListSecondary title={id}>{id}</ListSecondary>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                        <Button
                            size="md"
                            variant="ghost"
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onDuplicate(id);
                            }}
                        >
                            Duplicate
                        </Button>
                        <Button
                            size="md"
                            variant="ghost"
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onDelete(id);
                            }}
                        >
                            Delete
                        </Button>
                    </div>
                </ListRow>
            );
        })}

        <div style={{ marginTop: 8 }}>
            <Button size="md" variant="ghost" onClick={onCreate}>
                + Create Blueprint
            </Button>
        </div>
    </>
);
