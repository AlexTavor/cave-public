import React, { useMemo } from "react";
import { Button } from "../../../../lib/atoms/button";
import { List } from "./ModuleExplorer.styles";
import { useExplorerStore } from "./state/explorerStore";
import { useBlueprintActions } from "./hooks/useBlueprintActions";
import { useModuleStore } from "../../../state/moduleStore";
import { Blueprint } from "../../../../../data/schemas/blueprint";
import { useBlueprintListFilter } from "./hooks/useBlueprintListFilter";
import { BlueprintListRows } from "./BlueprintListRows";

interface BlueprintListProps {
    filename: string;
    sessionId: string;
}

export const BlueprintList: React.FC<BlueprintListProps> = ({
    filename,
    sessionId,
}) => {
    const session = useExplorerStore((s) => s.sessions[sessionId]);
    const filter = session?.filter || "";

    const moduleData = useModuleStore((s) => s.modules[filename]);
    const blueprintsRaw: Record<string, Blueprint> = useMemo(
        () => moduleData?.blueprints || {},
        [moduleData],
    );

    const entries = useMemo(
        () =>
            Object.entries(blueprintsRaw).map(([id, blueprint]) => ({
                id,
                blueprint,
            })),
        [blueprintsRaw],
    );
    const { filteredBlueprints, showSystem, toggleSystem } =
        useBlueprintListFilter(entries);

    const blueprints = useMemo(() => {
        return filteredBlueprints
            .filter(({ id, blueprint }) => {
                if (!filter) return true;
                const normalizedFilter = filter.trim().toLowerCase();
                const label = (
                    blueprint?.label ||
                    blueprint?.components?.display?.label ||
                    ""
                )
                    .toString()
                    .toLowerCase();
                return (
                    id.toLowerCase().includes(normalizedFilter) ||
                    label.includes(normalizedFilter)
                );
            })
            .map(({ id, blueprint }) => [id, blueprint] as const);
    }, [filteredBlueprints, filter]);

    const {
        handleOpenSettings: onOpenSettings,
        handleOpenBlueprint: onOpenBlueprint,
        handleDuplicate: onDuplicate,
        onDelete,
        handleCreateOptimistic: onCreate,
    } = useBlueprintActions({ filename, sessionId });

    return (
        <List>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                }}
            >
                <div />
                <Button size="md" variant="ghost" onClick={toggleSystem}>
                    {showSystem ? "Hide System" : "Show System"}
                </Button>
            </div>
            <BlueprintListRows
                blueprints={blueprints}
                onOpenSettings={onOpenSettings}
                onOpenBlueprint={onOpenBlueprint}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onCreate={onCreate}
            />
        </List>
    );
};
